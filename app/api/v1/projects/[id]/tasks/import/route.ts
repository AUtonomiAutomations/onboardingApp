// POST /api/v1/projects/:id/tasks/import
// Parses an automation spec HTML and saves tasks to project_tasks table.
// Replaces all existing tasks for the project.
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../../_lib/auth"

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

function parseTasksFromHtml(html: string) {
  const tasks: { board_name: string; task_name: string; trigger_type: string | null; display_order: number }[] = []
  let globalOrder = 0

  // ── Format A: board-section / board-title / auto-name / badge ──────────────
  if (html.includes('class="board-section"')) {
    const boardSections = html.split('<div class="board-section">')
    for (let i = 1; i < boardSections.length; i++) {
      const section = boardSections[i]
      const boardTitleMatch = section.match(/<div class="board-title[^"]*">([^<]+)<\/div>/)
      if (!boardTitleMatch) continue
      const boardName = boardTitleMatch[1].trim()

      const namePattern = /<div class="auto-name">([^<]+)<\/div>/g
      const badgePattern = /class="badge b-(\w+)"/g
      const names: string[] = []
      const badges: string[] = []
      let nm, bm
      while ((nm = namePattern.exec(section)) !== null) names.push(nm[1].trim())
      while ((bm = badgePattern.exec(section)) !== null) badges.push(bm[1])

      names.forEach((taskName, idx) => {
        tasks.push({ board_name: boardName, task_name: taskName, trigger_type: badges[idx] ?? null, display_order: globalOrder++ })
      })
    }
    return tasks
  }

  // ── Format B: .board / board-head h2 / ul.autos li ────────────────────────
  const boardPattern = /<div class="board">([\s\S]*?)(?=<div class="board"|<div class="section-label"|<div class="footer"|$)/g
  let boardMatch
  while ((boardMatch = boardPattern.exec(html)) !== null) {
    const boardHtml = boardMatch[1]

    const h2Match = boardHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
    if (!h2Match) continue
    const boardName = stripTags(h2Match[1])

    // Find the autos list
    const autosMatch = boardHtml.match(/<ul class="autos">([\s\S]*?)<\/ul>/)
    if (!autosMatch) continue

    const liPattern = /<li>([\s\S]*?)<\/li>/g
    let liMatch
    while ((liMatch = liPattern.exec(autosMatch[1])) !== null) {
      const liHtml = liMatch[1]

      // Build task name: "trigger → action"
      const atMatch = liHtml.match(/<span class="at">([\s\S]*?)<\/span>/)
      const trigger = atMatch ? stripTags(atMatch[1]) : ""

      // Action is the text after <span class="arr">
      const afterArr = liHtml.split(/<span class="arr">[^<]*<\/span>/)[1] ?? ""
      const action = stripTags(afterArr)

      const taskName = action ? `${trigger} → ${action}` : trigger
      if (!taskName) continue

      // Infer trigger_type from keywords
      let triggerType: string | null = null
      if (/כפתור|ידני/i.test(taskName)) triggerType = "button"
      else if (/webhook/i.test(taskName)) triggerType = "webhook"
      else if (/לוח זמנים|מדי|תזכורת|יום לפני|תאריך/i.test(taskName)) triggerType = "schedule"

      tasks.push({ board_name: boardName, task_name: taskName, trigger_type: triggerType, display_order: globalOrder++ })
    }
  }

  return tasks
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id: projectId } = await params

  let body: { html?: string }
  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData()
      body = { html: formData.get("html") as string | undefined }
    } else {
      body = await req.json()
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!body.html?.trim()) {
    return NextResponse.json({ error: "html field is required" }, { status: 400 })
  }

  const tasks = parseTasksFromHtml(body.html)
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tasks found in HTML — check the format" }, { status: 422 })
  }

  const supabase = await createServiceClient()

  // Verify project exists
  const { data: project, error: projErr } = await supabase
    .from("projects").select("id").eq("id", projectId).single()
  if (projErr || !project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 })

  // Replace all existing tasks for this project
  await (supabase as any).from("project_tasks").delete().eq("project_id", projectId)

  const rows = tasks.map((t) => ({ ...t, project_id: projectId }))
  const { error: insertErr } = await (supabase as any).from("project_tasks").insert(rows)
  if (insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    project_id: projectId,
    tasks_imported: tasks.length,
    tasks,
  }, { status: 201 })
}

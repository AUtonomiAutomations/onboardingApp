// PUT /api/v1/projects/:id/systems — Replace the full list of systems on a project
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"
import { z } from "zod"

const schema = z.object({
  system_ids: z.array(z.string().uuid()).min(1),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createServiceClient()

  // Verify project exists
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", id).single()
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  // Replace all project_systems
  await supabase.from("project_systems").delete().eq("project_id", id)

  const rows = parsed.data.system_ids.map((system_id, i) => ({
    project_id: id, system_id, display_order: i + 1,
  }))
  const { error } = await (supabase as any).from("project_systems").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, project_id: id, system_ids: parsed.data.system_ids })
}

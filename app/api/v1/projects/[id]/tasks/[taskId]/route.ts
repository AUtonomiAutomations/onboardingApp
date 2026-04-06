// PATCH /api/v1/projects/:id/tasks/:taskId — mark task done or undone
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../../_lib/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id: projectId, taskId } = await params

  let body: { is_done?: boolean; done_by?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof body.is_done !== "boolean") {
    return NextResponse.json({ error: "is_done (boolean) is required" }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const update: Record<string, unknown> = {
    is_done: body.is_done,
    done_at: body.is_done ? new Date().toISOString() : null,
    done_by: body.is_done ? (body.done_by ?? null) : null,
  }

  const { data, error } = await (supabase as any)
    .from("project_tasks")
    .update(update)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, task_name, is_done, done_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  return NextResponse.json({ success: true, data })
}

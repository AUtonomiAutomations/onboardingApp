// GET /api/v1/projects/:id/tasks — list all tasks with progress summary
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id: projectId } = await params
  const supabase = await createServiceClient()

  const { data, error } = await (supabase as any)
    .from("project_tasks")
    .select("id, board_name, task_name, trigger_type, display_order, is_done, done_by, done_at")
    .eq("project_id", projectId)
    .order("display_order")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = data.length
  const done = data.filter((t: any) => t.is_done).length

  return NextResponse.json({
    project_id: projectId,
    progress: {
      total,
      done,
      percentage: total > 0 ? Math.round((done / total) * 100) : 0,
    },
    tasks: data,
  })
}

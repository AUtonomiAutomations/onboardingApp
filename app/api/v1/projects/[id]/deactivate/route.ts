// POST /api/v1/projects/:id/deactivate — Revoke client + freelancer access, mark project on_hold
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id } = await params
  const supabase = await createServiceClient()
  const sb = supabase as any

  // Fetch project + client user_id
  const { data: project } = await sb
    .from("projects")
    .select("id, status, clients(id, user_id)")
    .eq("id", id)
    .single()

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const clientData = Array.isArray(project.clients) ? project.clients[0] : project.clients

  // Fetch assigned freelancers
  const { data: assignments } = await supabase
    .from("freelancer_assignments")
    .select("freelancer_id")
    .eq("project_id", id)

  await Promise.all([
    sb.from("projects").update({ status: "on_hold" }).eq("id", id),
    sb.from("clients").update({ status: "completed" }).eq("id", clientData?.id),
    ...(clientData?.user_id
      ? [supabase.auth.admin.updateUserById(clientData.user_id, { ban_duration: "876600h" })]
      : []),
    ...(assignments ?? []).map((a: any) =>
      supabase.auth.admin.updateUserById(a.freelancer_id, { ban_duration: "876600h" })
    ),
  ])

  return NextResponse.json({
    success:            true,
    project_id:         id,
    client_banned:      !!clientData?.user_id,
    freelancers_banned: (assignments ?? []).length,
  })
}

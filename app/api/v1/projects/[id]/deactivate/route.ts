// POST /api/v1/projects/:id/deactivate — Revoke client + freelancer access, mark project on_hold
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const supabase = await createServiceClient()

  // Fetch project + client user_id
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, clients(id, user_id)")
    .eq("id", params.id)
    .single()

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const projectData = project as any
  const clientData  = Array.isArray(projectData.clients) ? projectData.clients[0] : projectData.clients

  // Fetch assigned freelancers
  const { data: assignments } = await supabase
    .from("freelancer_assignments")
    .select("freelancer_id")
    .eq("project_id", params.id)

  const actions: Promise<any>[] = [
    // Mark project on_hold
    supabase.from("projects").update({ status: "on_hold" }).eq("id", params.id),
    // Mark client on_hold
    supabase.from("clients").update({ status: "completed" }).eq("id", clientData?.id),
  ]

  // Ban client auth user
  if (clientData?.user_id) {
    actions.push(
      supabase.auth.admin.updateUserById(clientData.user_id, { ban_duration: "876600h" })
    )
  }

  // Ban each assigned freelancer
  for (const a of (assignments ?? [])) {
    actions.push(
      supabase.auth.admin.updateUserById((a as any).freelancer_id, { ban_duration: "876600h" })
    )
  }

  await Promise.all(actions)

  return NextResponse.json({
    success:              true,
    project_id:           params.id,
    client_banned:        !!clientData?.user_id,
    freelancers_banned:   (assignments ?? []).length,
  })
}

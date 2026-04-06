// GET /api/v1/projects/:id/progress — Onboarding completion % + missing systems
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id } = await params
  const supabase = await createServiceClient()
  const sb = supabase as any

  const [pSystemsRes, credentialsRes, projectRes] = await Promise.all([
    sb.from("project_systems").select("system_id, systems(name)").eq("project_id", id),
    sb.from("credentials").select("system_id, status").eq("project_id", id),
    sb.from("projects").select("id, name, status, clients(company_name)").eq("id", id).single(),
  ])

  if (!projectRes.data)
    return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const pSystems    = (pSystemsRes.data ?? []) as any[]
  const credentials = (credentialsRes.data ?? []) as any[]

  const total     = pSystems.length
  const submitted = credentials.filter((c: any) => c.status === "submitted").length
  const draft     = credentials.filter((c: any) => c.status === "draft").length
  const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0

  const missing = pSystems
    .filter((ps: any) => !credentials.find((c: any) => c.system_id === ps.system_id && c.status === "submitted"))
    .map((ps: any) => ({ system_id: ps.system_id, system_name: ps.systems?.name ?? "" }))

  const project = projectRes.data as any
  const clientName = Array.isArray(project.clients)
    ? project.clients[0]?.company_name
    : project.clients?.company_name

  return NextResponse.json({
    project_id:   id,
    project_name: project.name,
    company_name: clientName ?? null,
    status:       project.status,
    progress: {
      total,
      submitted,
      draft,
      pending: total - submitted - draft,
      percentage: pct,
    },
    missing_systems: missing,
    is_complete: submitted === total && total > 0,
  })
}

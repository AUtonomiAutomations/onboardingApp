import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ClientDetailTabs } from "@/components/dashboard/client-detail-tabs"
import type { CredentialField } from "@/types/database.types"

const STATUS_HE: Record<string, string> = {
  pending: "ממתין", in_progress: "בתהליך", completed: "הושלם",
}
const STATUS_VARIANT: Record<string, any> = {
  pending: "outline", in_progress: "warning", completed: "success",
}

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const clientId = params.id

  // ── Fetch client ────────────────────────────────────────────────────────────
  const { data: client } = await supabase
    .from("clients")
    .select("id, company_name, status, monday_item_id, created_at, profiles!clients_user_id_fkey(email, full_name)")
    .eq("id", clientId)
    .single()

  if (!client) notFound()

  // ── Fetch project ───────────────────────────────────────────────────────────
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(1)

  const project = projects?.[0] ?? null

  // ── Fetch systems + credentials ─────────────────────────────────────────────
  let systems: any[] = []
  if (project) {
    const { data: pSystems } = await supabase
      .from("project_systems")
      .select("system_id, display_order, systems(id, name, logo_url, credential_fields)")
      .eq("project_id", project.id)
      .order("display_order")

    const { data: credentials } = await supabase
      .from("credentials")
      .select("system_id, field_values, status, submitted_at")
      .eq("project_id", project.id)

    systems = (pSystems ?? []).map((ps: any) => {
      const sys = ps.systems
      const cred = credentials?.find((c) => c.system_id === ps.system_id)
      return {
        system_id:         ps.system_id,
        system_name:       sys?.name ?? "",
        logo_url:          sys?.logo_url ?? null,
        credential_fields: (sys?.credential_fields ?? []) as CredentialField[],
        credential:        cred ?? null,
      }
    })
  }

  // ── Fetch files ─────────────────────────────────────────────────────────────
  const { data: files } = await supabase
    .from("files")
    .select("id, file_name, storage_path, file_type, is_visible_to_freelancer, uploaded_at")
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false })

  // ── Fetch all systems (for setup tab) ───────────────────────────────────────
  const { data: allSystems } = await supabase
    .from("systems")
    .select("id, name, logo_url")
    .order("name")

  // ── Fetch automation tasks ──────────────────────────────────────────────────
  const { data: tasks } = project
    ? await (supabase as any)
        .from("project_tasks")
        .select("id, board_name, task_name, trigger_type, display_order, is_done, done_at, admin_status")
        .eq("project_id", project.id)
        .order("display_order")
    : { data: [] }

  // ── Fetch freelancers + current assignment ──────────────────────────────────
  const { data: freelancers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "freelancer")
    .order("full_name")

  const assignedId = project
    ? (await supabase
        .from("freelancer_assignments")
        .select("freelancer_id")
        .eq("project_id", project.id)
        .maybeSingle()
      ).data?.freelancer_id ?? null
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{client.company_name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {project ? `פרויקט: ${project.name}` : "אין פרויקט פעיל"}
            {client.monday_item_id && ` · Monday ID: ${client.monday_item_id}`}
          </p>
          {(client as any).profiles?.email && (
            <p className="text-sm text-muted-foreground mt-0.5">
              אימייל: {(client as any).profiles.email}
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[client.status]}>{STATUS_HE[client.status] ?? client.status}</Badge>
      </div>

      {/* Tabbed content */}
      <ClientDetailTabs
        clientId={clientId}
        projectId={project?.id ?? null}
        systems={systems}
        allSystems={(allSystems ?? []).map((s: any) => ({
          id: s.id, name: s.name, logo_url: s.logo_url ?? null,
        }))}
        files={files ?? []}
        freelancers={freelancers ?? []}
        assignedFreelancerId={assignedId}
        initialTasks={tasks ?? []}
      />
    </div>
  )
}

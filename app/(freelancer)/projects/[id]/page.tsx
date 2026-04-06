import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, FileText } from "lucide-react"
import { FreelancerFileDownload } from "@/components/dashboard/freelancer-file-download"
import { ProjectTasks } from "@/components/dashboard/project-tasks"
import type { CredentialField } from "@/types/database.types"

const fileTypeLabels: Record<string, string> = {
  invoice:  "חשבונית",
  contract: "חוזה",
  report:   "דוח",
  brief:    "תקציר",
  other:    "אחר",
}

export default async function FreelancerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()

  // Verify freelancer is assigned to this project
  const { data: assignment } = await supabase
    .from("freelancer_assignments")
    .select("project_id")
    .eq("freelancer_id", user!.id)
    .eq("project_id", id)
    .single()

  if (!assignment) notFound()

  // Fetch project + client info
  const { data: projectRaw } = await supabase
    .from("projects")
    .select("id, status, clients(id, company_name)")
    .eq("id", id)
    .single()

  if (!projectRaw) notFound()

  const project = projectRaw as any
  const clientData = Array.isArray(project.clients) ? project.clients[0] : project.clients

  // Fetch systems + credentials
  const { data: pSystemsRaw } = await supabase
    .from("project_systems")
    .select("system_id, display_order, systems(id, name, credential_fields)")
    .eq("project_id", id)
    .order("display_order")

  const { data: credentialsRaw } = await supabase
    .from("credentials")
    .select("id, system_id, field_values, status")
    .eq("project_id", id)
    .eq("status", "submitted")

  // Files visible to freelancer
  const { data: filesRaw } = await supabase
    .from("files")
    .select("id, file_name, storage_path, file_type, uploaded_at")
    .eq("project_id", id)
    .eq("is_visible_to_freelancer", true)
    .order("uploaded_at", { ascending: false })

  // Fetch automation tasks
  const { data: tasksRaw } = await (supabase as any)
    .from("project_tasks")
    .select("id, board_name, task_name, trigger_type, display_order, is_done, done_at")
    .eq("project_id", id)
    .order("display_order")

  const pSystems = (pSystemsRaw ?? []) as any[]
  const credentials = (credentialsRaw ?? []) as any[]
  const files = (filesRaw ?? []) as any[]
  const tasks = (tasksRaw ?? []) as any[]

  const systems = pSystems.map((ps) => {
    const sys = ps.systems
    const cred = credentials.find((c) => c.system_id === ps.system_id)
    return {
      system_id:         ps.system_id as string,
      system_name:       sys?.name ?? "",
      credential_fields: (sys?.credential_fields ?? []) as CredentialField[],
      credential:        cred
        ? { field_values: cred.field_values as Record<string, string> }
        : null,
    }
  })

  const submittedCount = systems.filter((s) => s.credential !== null).length
  const pct = systems.length > 0 ? Math.round((submittedCount / systems.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{clientData?.company_name ?? "פרויקט"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            פרטי גישה וקבצים עבור הפרויקט
          </p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"}>
          {project.status === "active" ? "פעיל" : project.status}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>התקדמות הגשת פרטי גישה</span>
            <span>{submittedCount} / {systems.length} מערכות הוגשו</span>
          </div>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      {/* Systems credentials */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold">פרטי גישה למערכות</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {systems.length === 0 && (
            <p className="text-sm text-muted-foreground">לא הוגדרו מערכות לפרויקט זה.</p>
          )}
          {systems.map((sys) => (
            <div key={sys.system_id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                {sys.credential
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                <span className="text-sm font-medium text-slate-900">{sys.system_name}</span>
                {!sys.credential && (
                  <Badge variant="secondary" className="text-[10px] ms-auto">טרם הוגש</Badge>
                )}
              </div>

              {sys.credential ? (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {sys.credential_fields.map((field: CredentialField) => (
                    <div key={field.name} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="text-sm font-mono bg-slate-50 rounded px-2 py-1 break-all">
                        {sys.credential!.field_values[field.name] || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">הלקוח טרם הגיש את פרטי הגישה למערכת זו.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Automation Tasks */}
      <ProjectTasks projectId={id} initialTasks={tasks} />

      {/* Files */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">קבצים</CardTitle>
            <Badge variant="secondary" className="text-xs">{files.length} קבצים</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="text-sm">אין קבצים זמינים עבורך</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-slate-100 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(file.uploaded_at).toLocaleDateString("he-IL", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ms-4">
                    <Badge variant="secondary" className="text-[11px]">
                      {fileTypeLabels[file.file_type] ?? file.file_type}
                    </Badge>
                    <FreelancerFileDownload storagePath={file.storage_path} fileName={file.file_name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

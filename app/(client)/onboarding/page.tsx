"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { SystemCredentialForm } from "@/components/forms/system-credential-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CredentialField } from "@/types/database.types"

interface SystemStep {
  system_id: string
  system_name: string
  logo_url: string | null
  display_order: number
  credential_fields: CredentialField[]
  credential: { id: string; field_values: Record<string, string>; status: "draft" | "submitted" } | null
}

export default function ClientOnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [steps, setSteps] = useState<SystemStep[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get client
      const { data: client } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("user_id", user.id)
        .single()

      if (!client) { setLoading(false); return }
      setClientId(client.id)
      setCompanyName(client.company_name)

      // Get project
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true })
        .limit(1)

      const project = projects?.[0]
      if (!project) { setLoading(false); return }
      setProjectId(project.id)

      // Get project systems + system details
      const { data: pSystems } = await supabase
        .from("project_systems")
        .select("system_id, display_order, systems(id, name, logo_url, credential_fields)")
        .eq("project_id", project.id)
        .order("display_order")

      // Get existing credentials
      const { data: credentials } = await supabase
        .from("credentials")
        .select("id, system_id, field_values, status")
        .eq("project_id", project.id)
        .eq("client_id", client.id)

      const loadedSteps: SystemStep[] = (pSystems ?? []).map((ps: any) => {
        const sys = ps.systems
        const cred = credentials?.find((c) => c.system_id === ps.system_id)
        return {
          system_id:         ps.system_id,
          system_name:       sys?.name ?? "",
          logo_url:          sys?.logo_url ?? null,
          display_order:     ps.display_order,
          credential_fields: (sys?.credential_fields ?? []) as CredentialField[],
          credential:        cred
            ? { id: cred.id, field_values: cred.field_values as Record<string, string>, status: cred.status as any }
            : null,
        }
      })

      // Get automation tasks (read-only for client)
      const { data: tasksData } = await (supabase as any)
        .from("project_tasks")
        .select("id, board_name, task_name, trigger_type, display_order, is_done")
        .eq("project_id", project.id)
        .order("display_order")
      setTasks(tasksData ?? [])

      setSteps(loadedSteps)
      // Start at first non-submitted step
      const firstPending = loadedSteps.findIndex((s) => s.credential?.status !== "submitted")
      setActiveStep(firstPending >= 0 ? firstPending : 0)
      setLoading(false)
    }
    load()
  }, [])

  const handleStatusChange = (systemId: string, status: "draft" | "submitted") => {
    setSteps((prev) =>
      prev.map((s) =>
        s.system_id === systemId
          ? { ...s, credential: { ...(s.credential as any), status } }
          : s
      )
    )
    // Auto-advance to next pending step after submission
    if (status === "submitted") {
      const next = steps.findIndex((s, i) => i > activeStep && s.credential?.status !== "submitted")
      if (next >= 0) setTimeout(() => setActiveStep(next), 800)
    }
  }

  const submittedCount = steps.filter((s) => s.credential?.status === "submitted").length
  const progressPct = steps.length > 0 ? Math.round((submittedCount / steps.length) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-full" />
        <div className="grid grid-cols-4 gap-2 mt-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!clientId || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">לא נמצאו מערכות לקליטה. אנא פנה למנהל החשבון.</p>
      </div>
    )
  }

  const allDone = submittedCount === steps.length && steps.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {allDone ? "🎉 קליטה הושלמה!" : `ברוך הבא, ${companyName}`}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {allDone
            ? "כל הפרטים הוגשו. צוות AutoAgency יצור איתך קשר בקרוב."
            : "יש למלא את פרטי הגישה עבור כל מערכת הנדרשת לפרויקט שלך."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>התקדמות</span>
          <span>{submittedCount} / {steps.length} מערכות הוגשו</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Step selector */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)` }}>
        {steps.map((step, idx) => {
          const done = step.credential?.status === "submitted"
          const draft = step.credential?.status === "draft"
          const active = idx === activeStep
          return (
            <button
              key={step.system_id}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                active && "border-primary bg-primary/5 text-primary shadow-sm scale-[1.02]",
                !active && done && "border-emerald-300 bg-emerald-50 text-emerald-700",
                !active && draft && "border-amber-300 bg-amber-50 text-amber-700",
                !active && !done && !draft && "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
              )}
            >
              {step.logo_url ? (
                <img
                  src={step.logo_url}
                  alt={step.system_name}
                  className="h-10 w-10 rounded object-contain"
                />
              ) : done ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <Circle className={cn("h-8 w-8", active ? "text-primary" : "text-slate-300")} />
              )}
              <span className="text-center leading-tight">{step.system_name}</span>
              {done && <Badge variant="success" className="text-[11px] px-2 py-0.5">הוגש ✓</Badge>}
              {draft && !done && <Badge variant="warning" className="text-[11px] px-2 py-0.5">טיוטה</Badge>}
            </button>
          )
        })}
      </div>

      {/* Automation Tasks — read only */}
      {tasks.length > 0 && (() => {
        const doneTasks = tasks.filter((t) => t.is_done).length
        const pct = Math.round((doneTasks / tasks.length) * 100)
        const boards = tasks.reduce<Record<string, any[]>>((acc, t) => {
          if (!acc[t.board_name]) acc[t.board_name] = []
          acc[t.board_name].push(t)
          return acc
        }, {})
        const triggerColors: Record<string, string> = {
          webhook:  "bg-blue-50 text-blue-700 border-blue-200",
          schedule: "bg-orange-50 text-orange-700 border-orange-200",
          button:   "bg-emerald-50 text-emerald-700 border-emerald-200",
          external: "bg-purple-50 text-purple-700 border-purple-200",
        }
        const triggerLabels: Record<string, string> = {
          webhook: "Webhook", schedule: "Schedule", button: "Button", external: "External",
        }
        return (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">התקדמות הטמעת האוטומציות</CardTitle>
                <Badge variant={doneTasks === tasks.length ? "default" : "secondary"}
                  className={doneTasks === tasks.length ? "bg-emerald-600" : ""}>
                  {doneTasks} / {tasks.length} הושלמו
                </Badge>
              </div>
              <div className="mt-3 space-y-1">
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground text-left">{pct}%</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {Object.entries(boards).map(([boardName, boardTasks]) => (
                <div key={boardName}>
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">{boardName}</p>
                  </div>
                  {boardTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                      {task.is_done
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
                      <span className={cn("text-sm flex-1", task.is_done ? "line-through text-muted-foreground" : "text-slate-900")}>
                        {task.task_name}
                      </span>
                      {task.trigger_type && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${triggerColors[task.trigger_type] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                          {triggerLabels[task.trigger_type] ?? task.trigger_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })()}

      {/* Active step form */}
      {steps[activeStep] && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              {steps[activeStep].logo_url && (
                <img
                  src={steps[activeStep].logo_url!}
                  alt={steps[activeStep].system_name}
                  className="h-9 w-9 rounded object-contain"
                />
              )}
              <div>
                <CardTitle className="text-base">{steps[activeStep].system_name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  שלב {activeStep + 1} מתוך {steps.length}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {steps[activeStep].credential_fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין שדות להזנה עבור מערכת זו.</p>
            ) : (
              <SystemCredentialForm
                key={steps[activeStep].system_id}
                systemId={steps[activeStep].system_id}
                systemName={steps[activeStep].system_name}
                fields={steps[activeStep].credential_fields}
                projectId={projectId!}
                clientId={clientId!}
                existingCredential={steps[activeStep].credential}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

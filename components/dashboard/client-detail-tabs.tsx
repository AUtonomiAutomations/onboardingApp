"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Eye, EyeOff, Upload, FileText, Trash2, Loader2, UserPlus, CheckCircle2, Settings2, Download, Circle, ClipboardList,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { CredentialField } from "@/types/database.types"

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemWithCredential {
  system_id: string
  system_name: string
  logo_url: string | null
  credential_fields: CredentialField[]
  credential: { field_values: Record<string, string>; status: string; submitted_at: string | null } | null
}

interface FileRecord {
  id: string
  file_name: string
  storage_path: string
  file_type: string
  is_visible_to_freelancer: boolean
  uploaded_at: string
}

interface FreelancerOption {
  id: string
  full_name: string | null
  email: string
}

interface AllSystem {
  id: string
  name: string
  logo_url: string | null
}

interface TaskRecord {
  id: string
  board_name: string
  task_name: string
  trigger_type: string | null
  display_order: number
  is_done: boolean
  done_at: string | null
  admin_status: "pending" | "approved" | "rejected"
}

interface ClientDetailTabsProps {
  clientId: string
  projectId: string | null
  systems: SystemWithCredential[]
  allSystems: AllSystem[]
  files: FileRecord[]
  freelancers: FreelancerOption[]
  assignedFreelancerId: string | null
  initialTasks: TaskRecord[]
}

// ─── Preview helper ───────────────────────────────────────────────────────────
type PreviewType = "pdf" | "image" | "office" | "text" | "none"

function getPreviewType(fileName: string): PreviewType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image"
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office"
  if (["txt", "csv"].includes(ext)) return "text"
  return "none"
}

// ─── Hebrew maps ──────────────────────────────────────────────────────────────
const CRED_STATUS_HE: Record<string, string> = { draft: "טיוטה", submitted: "הוגש" }
const FILE_TYPE_HE: Record<string, string> = {
  contract: "חוזה", quote: "הצעת מחיר", spec: "מפרט", invoice: "חשבונית", other: "אחר",
}

// ─── Component ────────────────────────────────────────────────────────────────
const TRIGGER_COLORS: Record<string, string> = {
  webhook:  "bg-blue-50 text-blue-700 border-blue-200",
  schedule: "bg-orange-50 text-orange-700 border-orange-200",
  button:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  external: "bg-purple-50 text-purple-700 border-purple-200",
}
const TRIGGER_LABELS: Record<string, string> = {
  webhook: "Webhook", schedule: "Schedule", button: "Button", external: "External",
}

export function ClientDetailTabs({
  clientId, projectId, systems: initialSystems, allSystems,
  files: initialFiles, freelancers, assignedFreelancerId: initialAssignedId,
  initialTasks,
}: ClientDetailTabsProps) {
  const supabase = createClient()
  const [systems, setSystems] = useState<SystemWithCredential[]>(initialSystems)
  const [files, setFiles] = useState<FileRecord[]>(initialFiles)
  const [assignedId, setAssignedId] = useState<string | null>(initialAssignedId)
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>(initialAssignedId ?? "")
  const [savingSystems, setSavingSystems] = useState(false)
  const [selectedSystemIds, setSelectedSystemIds] = useState<Set<string>>(
    new Set(initialSystems.map((s) => s.system_id))
  )
  const [assigning, setAssigning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [fileType, setFileType] = useState<string>("other")
  const [visibleToFreelancer, setVisibleToFreelancer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [togglingTask, setTogglingTask] = useState<string | null>(null)

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectId) return
    setUploading(true)
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : ""
      const safeName = `${Date.now()}${ext ? "." + ext : ""}`
      const path = `${clientId}/${projectId}/${safeName}`
      const { error: uploadErr } = await supabase.storage.from("client-files").upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: insertErr } = await supabase
        .from("files")
        .insert({
          client_id: clientId, project_id: projectId,
          file_name: file.name, storage_path: path,
          file_type: fileType as any,
          is_visible_to_freelancer: visibleToFreelancer,
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      setFiles((prev) => [data as FileRecord, ...prev])
      toast.success("הקובץ הועלה בהצלחה")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err: any) {
      toast.error("שגיאה בהעלאת קובץ", { description: err.message })
    } finally {
      setUploading(false)
    }
  }

  // ── Toggle freelancer visibility ──────────────────────────────────────────
  const toggleVisibility = async (file: FileRecord) => {
    const { error } = await supabase
      .from("files")
      .update({ is_visible_to_freelancer: !file.is_visible_to_freelancer })
      .eq("id", file.id)
    if (error) { toast.error("שגיאה בעדכון הגדרות הקובץ"); return }
    setFiles((prev) => prev.map((f) =>
      f.id === file.id ? { ...f, is_visible_to_freelancer: !f.is_visible_to_freelancer } : f
    ))
  }

  // ── Delete file ──────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    await supabase.storage.from("client-files").remove([deleteTarget.storage_path])
    await supabase.from("files").delete().eq("id", deleteTarget.id)
    setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id))
    setDeleteTarget(null)
    toast.success("הקובץ נמחק")
  }

  // ── Signed URL helper ─────────────────────────────────────────────────────
  const getSignedUrl = async (file: FileRecord) => {
    const { data, error } = await supabase.storage
      .from("client-files")
      .createSignedUrl(file.storage_path, 300)
    if (error || !data?.signedUrl) { toast.error("שגיאה ביצירת קישור"); return null }
    return data.signedUrl
  }

  const handleDownload = async (file: FileRecord) => {
    const url = await getSignedUrl(file)
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = file.file_name
    a.click()
  }

  const handleView = async (file: FileRecord) => {
    setPreviewFile(file)
    setPreviewUrl(null)
    setPreviewLoading(true)
    const url = await getSignedUrl(file)
    setPreviewUrl(url)
    setPreviewLoading(false)
  }

  // ── Save project systems ──────────────────────────────────────────────────
  const saveProjectSystems = async () => {
    if (!projectId) return
    setSavingSystems(true)
    try {
      // Delete all current project_systems
      await supabase.from("project_systems").delete().eq("project_id", projectId)
      // Insert selected ones
      const rows = Array.from(selectedSystemIds).map((system_id, idx) => ({
        project_id: projectId, system_id, display_order: idx + 1,
      }))
      if (rows.length > 0) {
        const { error } = await supabase.from("project_systems").insert(rows)
        if (error) throw error
      }
      // Refresh systems with their credential_fields
      const { data: pSystems } = await supabase
        .from("project_systems")
        .select("system_id, display_order, systems(id, name, logo_url, credential_fields)")
        .eq("project_id", projectId)
        .order("display_order")
      const { data: credentials } = await supabase
        .from("credentials")
        .select("system_id, field_values, status, submitted_at")
        .eq("project_id", projectId)
      const refreshed: SystemWithCredential[] = (pSystems ?? []).map((ps: any) => {
        const sys = ps.systems
        const cred = (credentials ?? []).find((c) => c.system_id === ps.system_id)
        return {
          system_id:         ps.system_id,
          system_name:       sys?.name ?? "",
          logo_url:          sys?.logo_url ?? null,
          credential_fields: sys?.credential_fields ?? [],
          credential:        cred ?? null,
        }
      })
      setSystems(refreshed)
      toast.success("מערכות הפרויקט עודכנו")
    } catch (err: any) {
      toast.error("שגיאה בשמירת מערכות", { description: err.message })
    } finally {
      setSavingSystems(false)
    }
  }

  // ── Assign freelancer ─────────────────────────────────────────────────────
  const assignFreelancer = async () => {
    if (!selectedFreelancer || !projectId) return
    setAssigning(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from("freelancer_assignments")
        .upsert({ project_id: projectId, freelancer_id: selectedFreelancer, assigned_by: user?.id },
          { onConflict: "project_id,freelancer_id" })
      if (error) throw error
      setAssignedId(selectedFreelancer)
      toast.success("הפרילנסר הוקצה בהצלחה")
    } catch (err: any) {
      toast.error("שגיאה בהקצאת פרילנסר", { description: err.message })
    } finally {
      setAssigning(false)
    }
  }

  // ── Toggle task done/undone ───────────────────────────────────────────────
  const toggleTask = async (task: TaskRecord) => {
    if (!projectId) return
    setTogglingTask(task.id)
    const newDone = !task.is_done
    const update: any = {
      is_done: newDone,
      done_at: newDone ? new Date().toISOString() : null,
      admin_status: newDone ? "pending" : "pending", // reset status on toggle
    }
    const { error } = await (supabase as any)
      .from("project_tasks").update(update)
      .eq("id", task.id).eq("project_id", projectId)
    if (error) { toast.error("שגיאה בעדכון המשימה"); setTogglingTask(null); return }
    setTasks((prev) => prev.map((t) =>
      t.id === task.id ? { ...t, ...update } : t
    ))
    setTogglingTask(null)
  }

  // ── Approve / Reject task ─────────────────────────────────────────────────
  const setAdminStatus = async (task: TaskRecord, status: "approved" | "rejected") => {
    if (!projectId) return
    setTogglingTask(task.id)
    const { error } = await (supabase as any)
      .from("project_tasks").update({ admin_status: status })
      .eq("id", task.id).eq("project_id", projectId)
    if (error) { toast.error("שגיאה בעדכון הסטטוס"); setTogglingTask(null); return }
    setTasks((prev) => prev.map((t) =>
      t.id === task.id ? { ...t, admin_status: status } : t
    ))
    toast.success(status === "approved" ? "אושר ✓" : "נדחה ✗")
    setTogglingTask(null)
  }

  return (
    <>
      <Tabs defaultValue="credentials">
        <TabsList className="mb-6">
          <TabsTrigger value="credentials">פרטי גישה ({systems.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            משימות ({tasks.filter(t => t.is_done).length}/{tasks.length})
          </TabsTrigger>
          <TabsTrigger value="files">קבצים ({files.length})</TabsTrigger>
          <TabsTrigger value="assignment">הקצאת פרילנסר</TabsTrigger>
          <TabsTrigger value="setup">הגדרת מערכות</TabsTrigger>
        </TabsList>

        {/* ── Credentials Tab ─────────────────────────────────────────────── */}
        <TabsContent value="credentials" className="space-y-4">
          {systems.length === 0 && (
            <p className="text-muted-foreground text-sm">לא הוגדרו מערכות לפרויקט זה.</p>
          )}
          {systems.map((s) => (
            <Card key={s.system_id} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.logo_url && (
                      <img src={s.logo_url} alt={s.system_name} className="h-8 w-8 rounded object-contain" />
                    )}
                    <CardTitle className="text-base">{s.system_name}</CardTitle>
                  </div>
                  <Badge variant={s.credential?.status === "submitted" ? "success" : "outline"}>
                    {CRED_STATUS_HE[s.credential?.status ?? "draft"] ?? "לא הוגש"}
                  </Badge>
                </div>
              </CardHeader>
              {s.credential?.status === "submitted" && s.credential.field_values && (
                <>
                  <Separator />
                  <CardContent className="pt-4">
                    <dl className="grid grid-cols-2 gap-4">
                      {s.credential_fields.map((f) => (
                        <div key={f.name}>
                          <dt className="text-xs font-medium text-muted-foreground mb-1">{f.label}</dt>
                          <dd className="text-sm font-mono bg-slate-50 rounded px-2 py-1 break-all">
                            {s.credential?.field_values?.[f.name] ?? "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {s.credential.submitted_at && (
                      <p className="text-xs text-muted-foreground mt-4">
                        הוגש: {new Date(s.credential.submitted_at).toLocaleString("he-IL")}
                      </p>
                    )}
                  </CardContent>
                </>
              )}
              {!s.credential && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">הלקוח טרם הגיש פרטים עבור מערכת זו.</p>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* ── Tasks Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="tasks" dir="rtl">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <p className="text-sm">לא יובאו משימות לפרויקט זה עדיין</p>
              <p className="text-xs font-mono text-muted-foreground">POST /api/v1/projects/:id/tasks/import</p>
            </div>
          ) : (() => {
            const done = tasks.filter(t => t.is_done).length
            const approved = tasks.filter(t => t.admin_status === "approved").length
            const pct = Math.round((done / tasks.length) * 100)
            const boards = tasks.reduce<Record<string, TaskRecord[]>>((acc, t) => {
              if (!acc[t.board_name]) acc[t.board_name] = []
              acc[t.board_name].push(t)
              return acc
            }, {})
            return (
              <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{done} / {tasks.length} בוצעו</Badge>
                      <Badge className="bg-emerald-600 text-white">{approved} אושרו</Badge>
                    </div>
                    <CardTitle className="text-base font-semibold">משימות אוטומציות</CardTitle>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round((approved / tasks.length) * 100)}% אושרו</span>
                      <span>{pct}% הושלמו</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {Object.entries(boards).map(([boardName, boardTasks]) => (
                    <div key={boardName}>
                      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-right">
                        <p className="text-xs font-semibold text-slate-600">{boardName}</p>
                      </div>
                      {boardTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`px-5 py-4 transition-colors hover:bg-slate-50/60 ${togglingTask === task.id ? "opacity-50 pointer-events-none" : ""} ${
                            task.admin_status === "approved" ? "bg-emerald-50/40" :
                            task.admin_status === "rejected" ? "bg-red-50/30" : ""
                          }`}
                        >
                          {/* Row 1: checkbox + name + trigger */}
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleTask(task)} className="shrink-0 hover:scale-110 transition-transform">
                              {task.is_done
                                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                : <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />}
                            </button>
                            <span className={`text-sm font-medium flex-1 text-right ${task.is_done ? "text-slate-500" : "text-slate-900"}`}>
                              {task.task_name}
                            </span>
                            {task.trigger_type && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TRIGGER_COLORS[task.trigger_type] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                {TRIGGER_LABELS[task.trigger_type] ?? task.trigger_type}
                              </span>
                            )}
                          </div>

                          {/* Row 2: approve/reject — only when done */}
                          {task.is_done && (
                            <div className="flex items-center justify-between mt-2.5 pr-8">
                              {/* Right: date + current status badge */}
                              <div className="flex items-center gap-2">
                                {task.done_at && (
                                  <span className="text-[11px] text-muted-foreground">
                                    בוצע: {new Date(task.done_at).toLocaleDateString("he-IL", { day: "numeric", month: "long" })}
                                  </span>
                                )}
                                {task.admin_status === "approved" && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ אושר</span>
                                )}
                                {task.admin_status === "rejected" && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">✗ נדחה</span>
                                )}
                              </div>
                              {/* Left: action buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setAdminStatus(task, "approved")}
                                  disabled={task.admin_status === "approved"}
                                  className={`text-[11px] font-semibold px-3 py-1 rounded-md border transition-colors ${
                                    task.admin_status === "approved"
                                      ? "bg-emerald-500 text-white border-emerald-500 cursor-default"
                                      : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  }`}
                                >
                                  ✓ אשר
                                </button>
                                <button
                                  onClick={() => setAdminStatus(task, "rejected")}
                                  disabled={task.admin_status === "rejected"}
                                  className={`text-[11px] font-semibold px-3 py-1 rounded-md border transition-colors ${
                                    task.admin_status === "rejected"
                                      ? "bg-red-500 text-white border-red-500 cursor-default"
                                      : "bg-white text-red-700 border-red-300 hover:bg-red-50"
                                  }`}
                                >
                                  ✗ דחה
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })()}
        </TabsContent>

        {/* ── Files Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="files" className="space-y-4">
          {/* Upload area */}
          {projectId && (
            <Card className="border-dashed border-2 border-slate-300 bg-slate-50">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">בחר קובץ להעלאה ללקוח זה</p>
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">סוג קובץ:</Label>
                      <Select value={fileType} onValueChange={setFileType}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FILE_TYPE_HE).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox" id="visible"
                        checked={visibleToFreelancer}
                        onChange={(e) => setVisibleToFreelancer(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="visible" className="text-xs">גלוי לפרילנסר</Label>
                    </div>
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "מעלה…" : "בחר קובץ"}
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File list */}
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">אין קבצים עדיין.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <Card key={file.id} className="border-slate-200">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.uploaded_at).toLocaleDateString("he-IL")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{FILE_TYPE_HE[file.file_type]}</Badge>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={file.is_visible_to_freelancer ? "גלוי לפרילנסר" : "מוסתר מפרילנסר"}
                          onClick={() => toggleVisibility(file)}
                        >
                          {file.is_visible_to_freelancer
                            ? <Eye className="h-4 w-4 text-emerald-500" />
                            : <EyeOff className="h-4 w-4 text-slate-400" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="צפה בקובץ"
                          onClick={() => handleView(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="הורד קובץ"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Assignment Tab ───────────────────────────────────────────────── */}
        <TabsContent value="assignment">
          <Card className="border-slate-200 max-w-md">
            <CardHeader>
              <CardTitle className="text-base">הקצה פרילנסר לפרויקט</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignedId && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    מוקצה: {freelancers.find((f) => f.id === assignedId)?.full_name ?? "פרילנסר"}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>בחר פרילנסר</Label>
                <Select value={selectedFreelancer} onValueChange={setSelectedFreelancer}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרילנסר…" />
                  </SelectTrigger>
                  <SelectContent>
                    {freelancers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.full_name || f.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={assignFreelancer}
                disabled={!selectedFreelancer || assigning || !projectId}
                className="w-full"
              >
                {assigning
                  ? <><Loader2 className="h-4 w-4 animate-spin" />מקצה…</>
                  : <><UserPlus className="h-4 w-4" />הקצה פרילנסר</>}
              </Button>
              {!projectId && (
                <p className="text-xs text-muted-foreground">לא נמצא פרויקט עבור לקוח זה.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Systems Setup Tab ────────────────────────────────────────────── */}
        <TabsContent value="setup">
          <Card className="border-slate-200 max-w-lg">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base">בחר מערכות לפרויקט</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                סמן אילו מערכות הלקוח יצטרך למלא פרטי גישה עבורן
              </p>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {!projectId ? (
                <p className="text-sm text-muted-foreground">לא נמצא פרויקט עבור לקוח זה.</p>
              ) : allSystems.length === 0 ? (
                <p className="text-sm text-muted-foreground">לא הוגדרו מערכות במערכת עדיין.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {allSystems.map((sys) => {
                      const checked = selectedSystemIds.has(sys.id)
                      return (
                        <label
                          key={sys.id}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSystemIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(sys.id)) next.delete(sys.id)
                                else next.add(sys.id)
                                return next
                              })
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          {sys.logo_url ? (
                            <img src={sys.logo_url} alt={sys.name} className="h-6 w-6 rounded object-contain shrink-0" />
                          ) : (
                            <div className="h-6 w-6 rounded bg-slate-200 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-slate-900">{sys.name}</span>
                        </label>
                      )
                    })}
                  </div>
                  <Button
                    onClick={saveProjectSystems}
                    disabled={savingSystems}
                    className="w-full mt-2"
                  >
                    {savingSystems
                      ? <><Loader2 className="h-4 w-4 animate-spin me-2" />שומר…</>
                      : "שמור מערכות"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) { setPreviewFile(null); setPreviewUrl(null) } }}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-sm font-medium truncate">{previewFile?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!previewLoading && previewUrl && previewFile && (() => {
              const type = getPreviewType(previewFile.file_name)
              if (type === "pdf" || type === "text") return (
                <iframe src={previewUrl} className="w-full h-full border-0" title={previewFile.file_name} />
              )
              if (type === "image") return (
                <div className="flex items-center justify-center h-full p-4 bg-slate-50">
                  <img src={previewUrl} alt={previewFile.file_name} className="max-w-full max-h-full object-contain rounded" />
                </div>
              )
              if (type === "office") return (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
                  className="w-full h-full border-0"
                  title={previewFile.file_name}
                />
              )
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <FileText className="h-12 w-12 text-slate-300" />
                  <p className="text-sm">לא ניתן להציג קובץ זה בדפדפן</p>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    הורד את הקובץ
                  </Button>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת קובץ</DialogTitle>
            <DialogDescription>
              האם למחוק את &ldquo;{deleteTarget?.file_name}&rdquo;? פעולה זו אינה הפיכה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
            <Button variant="destructive" onClick={confirmDelete}>מחק</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

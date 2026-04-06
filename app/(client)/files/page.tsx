"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Download, FolderOpen, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FileRow {
  id: string
  file_name: string
  storage_path: string
  file_type: string
  uploaded_at: string
}

const fileTypeLabels: Record<string, string> = {
  invoice:  "חשבונית",
  contract: "חוזה",
  report:   "דוח",
  brief:    "תקציר",
  other:    "אחר",
}

const fileTypeVariant: Record<string, "default" | "secondary" | "warning" | "success"> = {
  invoice:  "warning",
  contract: "default",
  report:   "secondary",
  brief:    "success",
  other:    "secondary",
}

type PreviewType = "pdf" | "image" | "office" | "text" | "none"

function getPreviewType(fileName: string): PreviewType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image"
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office"
  if (["txt", "csv"].includes(ext)) return "text"
  return "none"
}

export default function ClientFilesPage() {
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileRow[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!client) { setLoading(false); return }

      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", (client as any).id)
        .order("created_at", { ascending: true })
        .limit(1)

      const project = (projects as any[])?.[0]
      if (!project) { setLoading(false); return }

      const { data } = await supabase
        .from("files")
        .select("id, file_name, storage_path, file_type, uploaded_at")
        .eq("client_id", (client as any).id)
        .eq("project_id", project.id)
        .order("uploaded_at", { ascending: false })

      setFiles((data as any[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getSignedUrl = async (file: FileRow) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("client-files")
      .createSignedUrl(file.storage_path, 300)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  }

  const handleDownload = async (file: FileRow) => {
    setDownloading(file.id)
    try {
      const url = await getSignedUrl(file)
      if (!url) return
      const a = document.createElement("a")
      a.href = url
      a.download = file.file_name
      a.click()
    } finally {
      setDownloading(null)
    }
  }

  const handleView = async (file: FileRow) => {
    setPreviewFile(file)
    setPreviewUrl(null)
    setPreviewLoading(true)
    const url = await getSignedUrl(file)
    setPreviewUrl(url)
    setPreviewLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">הקבצים שלי</h2>
        <p className="text-sm text-muted-foreground mt-1">
          קבצים שהועלו על ידי צוות AutoAgency עבור הפרויקט שלך
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">כל הקבצים</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {files.length} קבצים
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FolderOpen className="h-10 w-10 text-slate-300" />
              <p className="text-sm">לא נמצאו קבצים עדיין</p>
              <p className="text-xs text-slate-400">קבצים שיועלו על ידי הצוות יופיעו כאן</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-slate-100 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(file.uploaded_at).toLocaleDateString("he-IL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ms-4">
                    <Badge variant={fileTypeVariant[file.file_type] ?? "secondary"} className="text-[11px]">
                      {fileTypeLabels[file.file_type] ?? file.file_type}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(file)}
                      className="gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      צפה
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      className="gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading === file.id ? "מוריד..." : "הורד"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── File Preview Dialog ── */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) { setPreviewFile(null); setPreviewUrl(null) } }}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-sm font-medium truncate">{previewFile?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="text-sm text-muted-foreground">טוען...</div>
              </div>
            )}
            {!previewLoading && previewUrl && previewFile && (() => {
              const type = getPreviewType(previewFile.file_name)
              if (type === "pdf" || type === "text") return (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={previewFile.file_name}
                />
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
    </div>
  )
}

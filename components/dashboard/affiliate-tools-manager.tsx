"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Plus, Link2, ExternalLink } from "lucide-react"

export interface AffiliateTool {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  color: string
  affiliate_url: string
  display_order: number
  is_active: boolean
}

function ToolDialog({
  tool, open, onClose, onSaved,
}: {
  tool: AffiliateTool | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!tool
  const [name, setName] = useState(tool?.name ?? "")
  const [description, setDescription] = useState(tool?.description ?? "")
  const [logoUrl, setLogoUrl] = useState(tool?.logo_url ?? "")
  const [color, setColor] = useState(tool?.color ?? "#64748b")
  const [affiliateUrl, setAffiliateUrl] = useState(tool?.affiliate_url ?? "")
  const [displayOrder, setDisplayOrder] = useState(String(tool?.display_order ?? 0))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !affiliateUrl.trim()) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      name:          name.trim(),
      description:   description.trim() || null,
      logo_url:      logoUrl.trim() || null,
      color:         color,
      affiliate_url: affiliateUrl.trim(),
      display_order: parseInt(displayOrder) || 0,
    }

    if (isEdit && tool) {
      const { error } = await (supabase as any)
        .from("affiliate_tools")
        .update(payload)
        .eq("id", tool.id)
      if (error) { toast.error("שגיאה בעדכון הכלי"); setSaving(false); return }
      toast.success("הכלי עודכן בהצלחה")
    } else {
      const { error } = await (supabase as any)
        .from("affiliate_tools")
        .insert(payload)
      if (error) { toast.error("שגיאה ביצירת הכלי"); setSaving(false); return }
      toast.success("הכלי נוצר בהצלחה")
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת כלי" : "הוספת כלי חדש"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>שם הכלי <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: Make" />
          </div>

          <div className="space-y-1.5">
            <Label>תיאור</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="לדוגמה: אוטומציות" />
          </div>

          <div className="space-y-1.5">
            <Label>לינק שותף (Affiliate URL) <span className="text-destructive">*</span></Label>
            <Input value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} placeholder="https://..." dir="ltr" />
          </div>

          <div className="space-y-1.5">
            <Label>כתובת לוגו (URL) — אופציונלי</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="preview"
                className="h-10 w-10 rounded object-contain border border-slate-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>צבע רקע (ללא לוגו)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-slate-200 p-0.5"
                />
                <span className="text-sm text-muted-foreground font-mono">{color}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>סדר תצוגה</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                min={0}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !affiliateUrl.trim()}>
            {saving ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף כלי"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AffiliateToolsManager({ initial }: { initial: AffiliateTool[] }) {
  const [tools, setTools] = useState<AffiliateTool[]>(initial)
  const [dialog, setDialog] = useState<{ open: boolean; tool: AffiliateTool | null }>({
    open: false, tool: null,
  })
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const refresh = async () => {
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from("affiliate_tools")
      .select("*")
      .order("display_order")
    setTools(data ?? [])
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק כלי זה?")) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await (supabase as any).from("affiliate_tools").delete().eq("id", id)
    if (error) { toast.error("שגיאה במחיקה") } else { toast.success("הכלי נמחק"); await refresh() }
    setDeleting(null)
  }

  const toggleActive = async (tool: AffiliateTool) => {
    const supabase = createClient()
    await (supabase as any)
      .from("affiliate_tools")
      .update({ is_active: !tool.is_active })
      .eq("id", tool.id)
    await refresh()
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">כלים מומלצים ({tools.length})</CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setDialog({ open: true, tool: null })}>
              <Plus className="h-4 w-4" />
              הוסף כלי
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Link2 className="h-10 w-10 text-slate-300" />
              <p className="text-sm">לא נוספו כלים עדיין</p>
              <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, tool: null })}>
                <Plus className="h-4 w-4 me-1.5" />
                הוסף כלי ראשון
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>כלי</TableHead>
                  <TableHead>לינק</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {tool.logo_url ? (
                          <img src={tool.logo_url} alt={tool.name} className="h-8 w-8 rounded object-contain shrink-0" />
                        ) : (
                          <div
                            className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: tool.color }}
                          >
                            {tool.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{tool.name}</p>
                          {tool.description && <p className="text-xs text-muted-foreground">{tool.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={tool.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline max-w-[200px] truncate"
                      >
                        {tool.affiliate_url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(tool)}>
                        <Badge variant={tool.is_active ? "success" : "secondary"}>
                          {tool.is_active ? "פעיל" : "מוסתר"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => setDialog({ open: true, tool })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tool.id)}
                          disabled={deleting === tool.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialog.open && (
        <ToolDialog
          tool={dialog.tool}
          open={dialog.open}
          onClose={() => setDialog({ open: false, tool: null })}
          onSaved={refresh}
        />
      )}
    </>
  )
}

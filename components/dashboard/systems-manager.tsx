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
import { FieldBuilder } from "@/components/forms/field-builder"
import { Pencil, Trash2, Plus, Layers } from "lucide-react"
import type { CredentialField } from "@/types/database.types"

export interface SystemRow {
  id: string
  name: string
  logo_url: string | null
  credential_fields: CredentialField[]
}

interface SystemDialogProps {
  system: SystemRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function SystemDialog({ system, open, onClose, onSaved }: SystemDialogProps) {
  const isEdit = !!system
  const [name, setName] = useState(system?.name ?? "")
  const [logoUrl, setLogoUrl] = useState(system?.logo_url ?? "")
  const [fields, setFields] = useState<CredentialField[]>(system?.credential_fields ?? [])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      name:             name.trim(),
      logo_url:         logoUrl.trim() || null,
      credential_fields: fields,
    }

    if (isEdit && system) {
      const { error } = await supabase
        .from("systems")
        .update(payload)
        .eq("id", system.id)

      if (error) { toast.error("שגיאה בעדכון המערכת"); setSaving(false); return }
      toast.success("המערכת עודכנה בהצלחה")
    } else {
      const { error } = await supabase
        .from("systems")
        .insert(payload)

      if (error) { toast.error("שגיאה ביצירת המערכת"); setSaving(false); return }
      toast.success("המערכת נוצרה בהצלחה")
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת מערכת" : "הוספת מערכת חדשה"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>שם המערכת <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: Google Ads"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label>כתובת לוגו (URL)</Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo preview"
                className="h-10 w-10 rounded object-contain border border-slate-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </div>

          {/* Field Builder */}
          <div className="space-y-2">
            <Label>שדות פרטי גישה</Label>
            <p className="text-xs text-muted-foreground">
              הגדר אילו שדות הלקוח יצטרך למלא עבור מערכת זו
            </p>
            <FieldBuilder fields={fields} onChange={setFields} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור מערכת"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  initial: SystemRow[]
}

export function SystemsManager({ initial }: Props) {
  const [systems, setSystems] = useState<SystemRow[]>(initial)
  const [dialog, setDialog] = useState<{ open: boolean; system: SystemRow | null }>({
    open: false,
    system: null,
  })
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const refresh = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("systems")
      .select("id, name, logo_url, credential_fields")
      .order("name")
    setSystems((data ?? []) as SystemRow[])
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק מערכת זו? הפעולה לא ניתנת לביטול.")) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from("systems").delete().eq("id", id)
    if (error) {
      toast.error("שגיאה במחיקת המערכת")
    } else {
      toast.success("המערכת נמחקה")
      await refresh()
    }
    setDeleting(null)
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">כל המערכות</CardTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setDialog({ open: true, system: null })}
            >
              <Plus className="h-4 w-4" />
              הוסף מערכת
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {systems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Layers className="h-10 w-10 text-slate-300" />
              <p className="text-sm">לא הוגדרו מערכות עדיין</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ open: true, system: null })}
              >
                <Plus className="h-4 w-4 me-1.5" />
                הוסף מערכת ראשונה
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>מערכת</TableHead>
                  <TableHead>שדות הגדרה</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((sys) => (
                  <TableRow key={sys.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sys.logo_url ? (
                          <img
                            src={sys.logo_url}
                            alt={sys.name}
                            className="h-8 w-8 rounded object-contain shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{sys.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sys.credential_fields.length === 0 ? (
                          <span className="text-xs text-muted-foreground">ללא שדות</span>
                        ) : (
                          sys.credential_fields.map((f) => (
                            <Badge key={f.name} variant="secondary" className="text-[10px]">
                              {f.label}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setDialog({ open: true, system: sys })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(sys.id)}
                          disabled={deleting === sys.id}
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
        <SystemDialog
          system={dialog.system}
          open={dialog.open}
          onClose={() => setDialog({ open: false, system: null })}
          onSaved={refresh}
        />
      )}
    </>
  )
}

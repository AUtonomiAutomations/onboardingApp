"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Trash2, GripVertical, Plus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CredentialField } from "@/types/database.types"

const fieldTypeLabels: Record<string, string> = {
  text:     "טקסט",
  password: "סיסמה",
  email:    "אימייל",
  url:      "כתובת URL",
  textarea: "טקסט ארוך",
  select:   "רשימה",
}

const emptyField = (): CredentialField => ({
  name:        "",
  label:       "",
  type:        "text",
  required:    true,
  placeholder: "",
  help_text:   "",
  options:     [],
})

interface FieldEditorDialogProps {
  field: CredentialField
  open: boolean
  onClose: () => void
  onSave: (field: CredentialField) => void
}

function FieldEditorDialog({ field: initialField, open, onClose, onSave }: FieldEditorDialogProps) {
  const [field, setField] = useState<CredentialField>(initialField)
  const [optionInput, setOptionInput] = useState("")

  const set = (key: keyof CredentialField, value: any) =>
    setField((prev) => ({ ...prev, [key]: value }))

  const addOption = () => {
    const trimmed = optionInput.trim()
    if (!trimmed) return
    set("options", [...(field.options ?? []), trimmed])
    setOptionInput("")
  }

  const removeOption = (idx: number) =>
    set("options", (field.options ?? []).filter((_, i) => i !== idx))

  const handleSave = () => {
    if (!field.name.trim() || !field.label.trim()) return
    onSave(field)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialField.name ? "עריכת שדה" : "הוספת שדה"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name (key) */}
          <div className="space-y-1.5">
            <Label>שם פנימי <span className="text-destructive">*</span></Label>
            <Input
              value={field.name}
              onChange={(e) => set("name", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="api_key"
              dir="ltr"
            />
            <p className="text-[11px] text-muted-foreground">מזהה ייחודי, אותיות קטנות ו-_</p>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label>תווית <span className="text-destructive">*</span></Label>
            <Input
              value={field.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="מפתח API"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>סוג שדה</Label>
            <Select value={field.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fieldTypeLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options (for select type) */}
          {field.type === "select" && (
            <div className="space-y-1.5">
              <Label>אפשרויות</Label>
              <div className="flex gap-2">
                <Input
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  placeholder="הוסף אפשרות"
                  onKeyDown={(e) => e.key === "Enter" && addOption()}
                />
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {(field.options ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(field.options ?? []).map((opt, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {opt}
                      <button onClick={() => removeOption(i)} className="hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Placeholder */}
          <div className="space-y-1.5">
            <Label>טקסט placeholder</Label>
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => set("placeholder", e.target.value)}
              placeholder="הזן ערך..."
            />
          </div>

          {/* Help text */}
          <div className="space-y-1.5">
            <Label>טקסט עזרה</Label>
            <Input
              value={field.help_text ?? ""}
              onChange={(e) => set("help_text", e.target.value)}
              placeholder="הוראות קצרות למשתמש"
            />
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              id="required"
              type="checkbox"
              checked={field.required ?? true}
              onChange={(e) => set("required", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="required" className="cursor-pointer">שדה חובה</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} disabled={!field.name.trim() || !field.label.trim()}>
            שמור שדה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FieldBuilderProps {
  fields: CredentialField[]
  onChange: (fields: CredentialField[]) => void
}

export function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  const removeField = (idx: number) => onChange(fields.filter((_, i) => i !== idx))

  const saveField = (idx: number, field: CredentialField) => {
    const next = [...fields]
    next[idx] = field
    onChange(next)
  }

  const addField = (field: CredentialField) => {
    onChange([...fields, field])
  }

  return (
    <div className="space-y-3">
      {/* Field list */}
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-slate-200 rounded-lg">
          לא הוגדרו שדות עדיין. לחץ "הוסף שדה" כדי להתחיל.
        </p>
      )}

      {fields.map((field, idx) => (
        <div
          key={field.name + idx}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3",
          )}
        >
          <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 truncate">{field.label}</span>
              {field.required && (
                <span className="text-[10px] text-destructive">*</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-[11px] text-muted-foreground bg-white border border-slate-200 px-1 rounded">
                {field.name}
              </code>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {fieldTypeLabels[field.type] ?? field.type}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setEditingIdx(idx)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => removeField(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => setAddingNew(true)}
      >
        <Plus className="h-4 w-4" />
        הוסף שדה
      </Button>

      {/* Edit dialog */}
      {editingIdx !== null && (
        <FieldEditorDialog
          field={fields[editingIdx]}
          open
          onClose={() => setEditingIdx(null)}
          onSave={(f) => { saveField(editingIdx, f); setEditingIdx(null) }}
        />
      )}

      {/* New field dialog */}
      {addingNew && (
        <FieldEditorDialog
          field={emptyField()}
          open
          onClose={() => setAddingNew(false)}
          onSave={(f) => { addField(f); setAddingNew(false) }}
        />
      )}
    </div>
  )
}

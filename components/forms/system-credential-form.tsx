"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Save, Send, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { CredentialField } from "@/types/database.types"

interface SystemCredentialFormProps {
  systemId: string
  systemName: string
  fields: CredentialField[]
  projectId: string
  clientId: string
  existingCredential: {
    id: string
    field_values: Record<string, string>
    status: "draft" | "submitted"
  } | null
  onStatusChange: (systemId: string, status: "draft" | "submitted") => void
}

function buildSchema(fields: CredentialField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((f) => {
    let validator: z.ZodTypeAny = z.string()
    if (f.required) {
      validator = (validator as z.ZodString).min(1, `שדה "${f.label}" הוא חובה`)
    } else {
      validator = (validator as z.ZodString).optional()
    }
    shape[f.name] = validator
  })
  return z.object(shape)
}

export function SystemCredentialForm({
  systemId, systemName, fields, projectId, clientId,
  existingCredential, onStatusChange,
}: SystemCredentialFormProps) {
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isSubmitted = existingCredential?.status === "submitted"

  const schema = buildSchema(fields)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: existingCredential?.field_values ?? {},
  })

  const upsert = async (values: Record<string, string>, status: "draft" | "submitted") => {
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      system_id: systemId,
      client_id: clientId,
      field_values: values,
      status,
    }

    if (existingCredential?.id) {
      const { error } = await supabase
        .from("credentials")
        .update({ field_values: values, status })
        .eq("id", existingCredential.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from("credentials").insert(payload)
      if (error) throw error
    }

    onStatusChange(systemId, status)
  }

  const saveDraft = async () => {
    const values = form.getValues() as Record<string, string>
    setSaving(true)
    try {
      await upsert(values, "draft")
      toast.success(`טיוטה נשמרה — ${systemName}`)
    } catch (err: any) {
      toast.error("שגיאה בשמירת טיוטה", { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (values: Record<string, string>) => {
    setSubmitting(true)
    try {
      await upsert(values, "submitted")
      toast.success(`${systemName} — הוגש בהצלחה!`)
    } catch (err: any) {
      toast.error("שגיאה בהגשה", { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center py-10 gap-3 text-emerald-600">
        <CheckCircle2 className="h-10 w-10" />
        <p className="font-medium text-base">הפרטים הוגשו בהצלחה</p>
        <p className="text-sm text-muted-foreground">
          הוגש ב‑{new Date(existingCredential?.field_values?.submitted_at ?? "").toLocaleString("he-IL")}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-destructive ms-1">*</span>}
          </Label>

          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              {...form.register(field.name)}
            />
          ) : field.type === "select" ? (
            <Select
              defaultValue={existingCredential?.field_values?.[field.name]}
              onValueChange={(v) => form.setValue(field.name, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder ?? "בחר…"} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              {...form.register(field.name)}
            />
          )}

          {field.help_text && (
            <p className="text-xs text-muted-foreground">{field.help_text}</p>
          )}

          {form.formState.errors[field.name] && (
            <p className="text-xs text-destructive">
              {form.formState.errors[field.name]?.message as string}
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={saveDraft} disabled={saving || submitting}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמור טיוטה
        </Button>
        <Button type="submit" disabled={submitting || saving}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          שלח ואשר
        </Button>
      </div>
    </form>
  )
}

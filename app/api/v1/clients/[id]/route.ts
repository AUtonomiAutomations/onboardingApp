// PATCH /api/v1/clients/:id — Update client details / status
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../_lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  company_name:   z.string().min(1).optional(),
  status:         z.enum(["pending", "in_progress", "completed"]).optional(),
  monday_item_id: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  if (Object.keys(parsed.data).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id, company_name, status, monday_item_id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

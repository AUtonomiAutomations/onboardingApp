// POST /api/v1/projects/:id/assign — Assign freelancer to project + set payment_amount
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"
import { z } from "zod"

const schema = z.object({
  freelancer_id:  z.string().uuid(),
  payment_amount: z.number().min(0).optional(),
  assigned_by:    z.string().uuid().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { freelancer_id, payment_amount, assigned_by } = parsed.data
  const supabase = await createServiceClient()

  // Verify freelancer
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("id", freelancer_id).eq("role", "freelancer").single()
  if (!profile) return NextResponse.json({ error: "Freelancer not found" }, { status: 404 })

  const payload: any = { project_id: id, freelancer_id }
  if (payment_amount !== undefined) payload.payment_amount = payment_amount
  if (assigned_by)                  payload.assigned_by    = assigned_by

  const { data, error } = await supabase
    .from("freelancer_assignments")
    .upsert(payload, { onConflict: "project_id,freelancer_id" })
    .select("id, project_id, freelancer_id, payment_amount, assigned_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}

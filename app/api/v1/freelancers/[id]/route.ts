// PATCH /api/v1/freelancers/:id — Update freelancer profile / active status
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../_lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  email:     z.string().email().optional(),
  active:    z.boolean().optional(),   // false = ban user in Auth
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { full_name, email, active } = parsed.data
  const supabase = await createServiceClient()

  // Update auth user if needed
  if (active === false) {
    await supabase.auth.admin.updateUserById(id, { ban_duration: "876600h" }) // ~100 years
  } else if (active === true) {
    await supabase.auth.admin.updateUserById(id, { ban_duration: "none" })
  }

  const profileUpdate: any = {}
  if (full_name) profileUpdate.full_name = full_name
  if (email)     profileUpdate.email     = email

  if (Object.keys(profileUpdate).length > 0) {
    await (supabase as any).from("profiles").update(profileUpdate).eq("id", id)
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

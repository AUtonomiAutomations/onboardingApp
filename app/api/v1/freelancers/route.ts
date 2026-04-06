// POST /api/v1/freelancers  — Create freelancer account
// GET  /api/v1/freelancers  — Search freelancers (query: email | name)
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../_lib/auth"
import { z } from "zod"

const createSchema = z.object({
  email:     z.string().email(),
  full_name: z.string().min(1),
  password:  z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { email, full_name, password } = parsed.data
  const supabase = await createServiceClient()

  // Use provided password or generate a temporary one
  const finalPassword = password ?? (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!")

  const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { role: "freelancer", full_name, needs_password_change: !password },
  })
  if (userErr)
    return NextResponse.json({ error: userErr.message }, { status: 500 })

  const userId = userRes.user!.id
  await supabase.from("profiles").upsert(
    { id: userId, email, role: "freelancer", full_name },
    { onConflict: "id" }
  )

  return NextResponse.json({ success: true, user_id: userId, email, full_name, password: finalPassword }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  const name  = searchParams.get("name")

  const supabase = await createServiceClient()
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "freelancer")

  if (email) query = query.ilike("email", `%${email}%`)
  if (name)  query = query.ilike("full_name", `%${name}%`)

  const { data, error } = await query.order("full_name").limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

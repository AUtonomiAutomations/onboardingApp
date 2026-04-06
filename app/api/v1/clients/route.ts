// POST /api/v1/clients   — Create client + auth user + project
// GET  /api/v1/clients   — Search clients (query: monday_id | email | company_name)
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../_lib/auth"
import { z } from "zod"

const createSchema = z.object({
  company_name:   z.string().min(1),
  email:          z.string().email(),
  monday_item_id: z.string().optional(),
  system_ids:     z.array(z.string().uuid()).optional(),
  project_value:  z.number().positive().optional(),
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

  const { company_name, email, monday_item_id, system_ids, project_value } = parsed.data
  const supabase = await createServiceClient()

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!"

  // Create auth user
  const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role: "client", needs_password_change: true },
  })
  if (userErr && !userErr.message.includes("already"))
    return NextResponse.json({ error: userErr.message }, { status: 500 })

  const userId = userRes?.user?.id
  if (!userId)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })

  await supabase.from("profiles").upsert(
    { id: userId, email, role: "client", full_name: company_name },
    { onConflict: "id" }
  )

  // Create client record
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({ user_id: userId, company_name, status: "in_progress", monday_item_id: monday_item_id ?? null })
    .select("id")
    .single()
  if (clientErr)
    return NextResponse.json({ error: clientErr.message }, { status: 500 })

  // Create project
  const projectPayload: any = { client_id: client.id, name: `${company_name} - קליטה`, status: "active" }
  if (project_value !== undefined) projectPayload.project_value = project_value

  const { data: project, error: projErr } = await supabase
    .from("projects").insert(projectPayload).select("id").single()
  if (projErr)
    return NextResponse.json({ error: projErr.message }, { status: 500 })

  if (system_ids?.length) {
    await supabase.from("project_systems").insert(
      system_ids.map((system_id, i) => ({ project_id: project.id, system_id, display_order: i + 1 }))
    )
  }

  return NextResponse.json({ success: true, user_id: userId, client_id: client.id, project_id: project.id, email, password: tempPassword }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const monday_id    = searchParams.get("monday_id")
  const email        = searchParams.get("email")
  const company_name = searchParams.get("company_name")

  const supabase = await createServiceClient()
  let query = supabase
    .from("clients")
    .select("id, company_name, status, monday_item_id, created_at, profiles!clients_user_id_fkey(email, full_name)")

  if (monday_id)    query = query.eq("monday_item_id", monday_id)
  if (company_name) query = query.ilike("company_name", `%${company_name}%`)
  if (email) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single()
    if (!profile) return NextResponse.json({ data: [] })
    query = query.eq("user_id", profile.id)
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flat = (data ?? []).map((row: any) => ({
    id:             row.id,
    company_name:   row.company_name,
    email:          row.profiles?.email ?? null,
    monday_item_id: row.monday_item_id,
    status:         row.status,
    created_at:     row.created_at,
  }))

  return NextResponse.json({ data: flat })
}

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const bodySchema = z.object({
  company_name:    z.string().min(1),
  email:           z.string().email(),
  monday_item_id:  z.string().optional(),
  // Optional: list of system IDs to pre-assign to the new project
  system_ids:      z.array(z.string().uuid()).optional(),
})

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-api-secret")
  if (!secret || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { company_name, email, monday_item_id, system_ids } = parsed.data
  const supabase = await createServiceClient()

  // ── Create auth user ──────────────────────────────────────────────────────
  const { data: userResponse, error: userErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      role:                   "client",
      needs_password_change:  true,
    },
  })

  if (userErr) {
    // If user already exists, look them up
    if (!userErr.message.includes("already")) {
      return NextResponse.json({ error: userErr.message }, { status: 500 })
    }
  }

  const userId = userResponse?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Failed to create or retrieve user" }, { status: 500 })
  }

  // Ensure profile has client role (trigger may have created it; upsert to be safe)
  await supabase.from("profiles").upsert({
    id:        userId,
    email,
    role:      "client",
    full_name: company_name,
  }, { onConflict: "id" })

  // ── Create client record ──────────────────────────────────────────────────
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      user_id:        userId,
      company_name,
      status:         "pending",
      monday_item_id: monday_item_id ?? null,
    })
    .select("id")
    .single()

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 })
  }

  // ── Create project ────────────────────────────────────────────────────────
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      client_id: client.id,
      name:      `${company_name} - קליטה`,
      status:    "active",
    })
    .select("id")
    .single()

  if (projectErr) {
    return NextResponse.json({ error: projectErr.message }, { status: 500 })
  }

  // ── Assign systems to project (optional) ─────────────────────────────────
  if (system_ids && system_ids.length > 0) {
    const rows = system_ids.map((system_id, idx) => ({
      project_id:    project.id,
      system_id,
      display_order: idx + 1,
    }))
    await supabase.from("project_systems").insert(rows)
  }

  // ── Update client status to in_progress ──────────────────────────────────
  await supabase
    .from("clients")
    .update({ status: "in_progress" })
    .eq("id", client.id)

  return NextResponse.json({
    success:    true,
    user_id:    userId,
    client_id:  client.id,
    project_id: project.id,
  })
}

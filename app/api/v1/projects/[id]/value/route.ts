// PATCH /api/v1/projects/:id/value — Set or update project_value (admin ROI)
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"
import { z } from "zod"

const schema = z.object({
  project_value: z.number().min(0),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("projects")
    .update({ project_value: parsed.data.project_value })
    .eq("id", params.id)
    .select("id, name, project_value")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

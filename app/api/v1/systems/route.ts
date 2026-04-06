import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../_lib/auth"

export async function GET(req: NextRequest) {
  const authError = requireApiSecret(req)
  if (authError) return authError

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("systems")
    .select("id, name, logo_url, credential_fields")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

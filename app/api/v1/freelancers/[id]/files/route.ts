// POST /api/v1/freelancers/:id/files — Upload private admin doc to freelancer profile
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { file_name, file_data, file_type = "other" } = body

  if (!file_name || !file_data)
    return NextResponse.json({ error: "file_name and file_data are required" }, { status: 422 })

  // make.com sends buffer as base64 string via {{base64(parameters.file_data)}}
  const buffer = Buffer.from(file_data, "base64")

  const supabase = await createServiceClient()

  // Verify freelancer exists
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("id", params.id).eq("role", "freelancer").single()
  if (!profile) return NextResponse.json({ error: "Freelancer not found" }, { status: 404 })

  const ext = file_name.includes(".") ? file_name.split(".").pop() : ""
  const storagePath = `freelancers/${params.id}/${Date.now()}-${file_name}`

  const { error: uploadErr } = await supabase.storage
    .from("client-files")
    .upload(storagePath, buffer, { contentType: `application/${ext || "octet-stream"}` })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: record, error: dbErr } = await supabase
    .from("freelancer_files")
    .insert({
      freelancer_id: params.id,
      file_name,
      storage_path:  storagePath,
      file_type,
    })
    .select("id, file_name, file_type, uploaded_at")
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ success: true, data: record }, { status: 201 })
}

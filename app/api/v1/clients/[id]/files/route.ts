// POST /api/v1/clients/:id/files — Upload a file to a client's project
import { NextRequest, NextResponse } from "next/server"
import { requireApiSecret, createServiceClient } from "../../../_lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authErr = requireApiSecret(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const file_name = url.searchParams.get("file_name") ?? ""
  const file_type = url.searchParams.get("file_type") ?? "other"
  const visible_to_freelancer = url.searchParams.get("visible") === "true"

  if (!file_name)
    return NextResponse.json({ error: "file_name is required" }, { status: 422 })

  const fileArrayBuffer = await req.arrayBuffer()
  if (!fileArrayBuffer.byteLength)
    return NextResponse.json({ error: "file data is required" }, { status: 422 })

  const supabase = await createServiceClient()

  const { data: projects } = await supabase
    .from("projects").select("id").eq("client_id", id).limit(1)
  const project = projects?.[0]
  if (!project) return NextResponse.json({ error: "Client has no project" }, { status: 404 })

  const ext = file_name.includes(".") ? file_name.split(".").pop() : ""
  const safeFileName = `${Date.now()}${ext ? "." + ext : ""}`
  const storagePath = `${id}/${project.id}/${safeFileName}`

  const mimeType = ext === "pdf" ? "application/pdf"
    : ext === "png" ? "image/png"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : `application/${ext || "octet-stream"}`

  const uploadRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/client-files/${storagePath}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: fileArrayBuffer,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({ message: uploadRes.statusText }))
    return NextResponse.json({ error: err.error ?? err.message }, { status: 500 })
  }

  const { data: record, error: dbErr } = await supabase
    .from("files")
    .insert({
      client_id: id, project_id: project.id,
      file_name, storage_path: storagePath,
      file_type, is_visible_to_freelancer: visible_to_freelancer,
    })
    .select("id, file_name, file_type, uploaded_at")
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ success: true, data: record }, { status: 201 })
}

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export function requireApiSecret(req: NextRequest): NextResponse | null {
  const secret = req.headers.get("x-api-secret")
  if (!secret || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export { createServiceClient }

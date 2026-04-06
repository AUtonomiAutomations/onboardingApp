import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  project_id: z.string().uuid(),
  freelancer_id: z.string().uuid(),
  assigned_by: z.string().uuid().optional(),
});

/**
 * POST /api/assign-freelancer
 *
 * Assigns a freelancer to a client project.
 * Protected by a shared secret header: x-api-secret.
 *
 * Called by Make.com after a freelancer is assigned in Monday.com.
 */
export async function POST(request: NextRequest) {
  // Authenticate via shared secret
  const secret = request.headers.get("x-api-secret");
  if (secret !== process.env.ASSIGN_FREELANCER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { project_id, freelancer_id, assigned_by } = parsed.data;

  const supabase = await createServiceClient();

  // Verify freelancer exists and has the correct role
  const { data: freelancer, error: freelancerError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", freelancer_id)
    .single();

  if (freelancerError || !freelancer) {
    return NextResponse.json({ error: "Freelancer not found" }, { status: 404 });
  }

  if (freelancer.role !== "freelancer") {
    return NextResponse.json(
      { error: "User is not a freelancer" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("freelancer_assignments")
    .upsert(
      { project_id, freelancer_id, assigned_by: assigned_by ?? null },
      { onConflict: "project_id,freelancer_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[assign-freelancer]", error);
    return NextResponse.json(
      { error: "Failed to assign freelancer" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, assignment: data }, { status: 200 });
}

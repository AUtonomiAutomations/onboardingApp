/**
 * Root entry point — redirects each user to their role-based dashboard.
 * Middleware already enforces authentication, so `user` will always be present here.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  switch (profile.role) {
    case "admin":
      redirect("/dashboard");
    case "client":
      redirect("/onboarding");
    case "freelancer":
      redirect("/projects");
    default:
      redirect("/login");
  }
}

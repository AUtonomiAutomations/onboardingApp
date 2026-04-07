import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/dashboard/top-nav"

const clientLinks = [
  { label: "Onboarding", href: "/onboarding" },
  { label: "My Files",   href: "/files" },
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "client") redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        user={{
          name: profile.full_name ?? "",
          email: profile.email,
          role: profile.role,
        }}
        links={clientLinks}
      />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar
        user={{
          name: profile.full_name ?? "",
          email: profile.email,
          role: profile.role,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-semibold text-slate-900">פורטל ניהול</h1>
        </header>
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

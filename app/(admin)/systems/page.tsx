import { createClient } from "@/lib/supabase/server"
import { SystemsManager } from "@/components/dashboard/systems-manager"
import type { CredentialField } from "@/types/database.types"

export default async function AdminSystemsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("systems")
    .select("id, name, logo_url, credential_fields")
    .order("name")

  const systems = (data ?? []).map((s: any) => ({
    id:                s.id,
    name:              s.name,
    logo_url:          s.logo_url ?? null,
    credential_fields: (s.credential_fields ?? []) as CredentialField[],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">ניהול מערכות</h2>
        <p className="text-sm text-muted-foreground mt-1">
          הגדר מערכות חיצוניות ואת השדות שלקוחות יצטרכו למלא
        </p>
      </div>

      <SystemsManager initial={systems} />
    </div>
  )
}

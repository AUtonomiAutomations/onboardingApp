import { createClient } from "@/lib/supabase/server"
import { AffiliateToolsManager } from "@/components/dashboard/affiliate-tools-manager"

export default async function AdminAffiliateToolsPage() {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from("affiliate_tools")
    .select("*")
    .order("display_order")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">כלים מומלצים</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ניהול כלים ולינקי שותפים שמוצגים ללקוחות
        </p>
      </div>

      <AffiliateToolsManager initial={data ?? []} />
    </div>
  )
}

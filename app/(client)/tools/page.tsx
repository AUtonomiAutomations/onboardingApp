import { ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function ClientToolsPage() {
  const supabase = await createClient()

  const { data: tools } = await (supabase as any)
    .from("affiliate_tools")
    .select("id, name, description, logo_url, color, affiliate_url")
    .eq("is_active", true)
    .order("display_order")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">כלים מומלצים</h2>
        <p className="text-sm text-muted-foreground mt-1">
          הכלים שאנו ממליצים ומשתמשים בהם — הירשמו דרך הלינקים להטבות מיוחדות
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tools ?? []).map((tool: any) => (
          <Card key={tool.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {tool.logo_url ? (
                  <img
                    src={tool.logo_url}
                    alt={tool.name}
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ backgroundColor: tool.color ?? "#64748b" }}
                  >
                    {tool.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{tool.name}</p>
                  {tool.description && (
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  )}
                </div>
              </div>
              <Button asChild size="sm" className="w-full">
                <a href={tool.affiliate_url} target="_blank" rel="noopener noreferrer">
                  הירשם עכשיו
                  <ExternalLink className="ms-2 h-3.5 w-3.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const TOOLS = [
  {
    name: "n8n",
    description: "אוטומציות / סוכני AI",
    logo: null,
    color: "bg-red-500",
    href: "https://n8n.partnerlinks.io/8v2tg6c00fyi",
  },
  {
    name: "Make",
    description: "אוטומציות",
    logo: "/logos/make.svg",
    color: "bg-purple-500",
    href: "https://www.make.com/en/register?pc=avifinarsky",
  },
  {
    name: "Monday",
    description: "ניהול משימות, לקוחות ולידים",
    logo: "/logos/monday.svg",
    color: "bg-pink-500",
    href: "https://try.monday.com/5f1fm76s4fsl",
  },
  {
    name: "Fireflies",
    description: "תמלול שיחות",
    logo: null,
    color: "bg-violet-500",
    href: "https://fireflies.ai?fpr=autonomi",
  },
  {
    name: "Fillfaster",
    description: "הצעות מחיר וחוזים",
    logo: null,
    color: "bg-blue-500",
    href: "https://my.fillfaster.com/api/affurl/0LDqQQk8ujMymQdp/3lNRUzH761x7DpUp?target=0BaY5CV8qGnMR3fp",
  },
  {
    name: "ManyChat",
    description: "בוטים לאינסטגרם / טלגרם / וואטסאפ / פייסבוק",
    logo: null,
    color: "bg-orange-500",
    href: "https://manychat.partnerlinks.io/qwjvn5q0urpd",
  },
  {
    name: "Lovable",
    description: "בניית אפליקציות עם AI",
    logo: null,
    color: "bg-pink-400",
    href: "https://lovable.dev/?via=autonomi-ai",
  },
  {
    name: "Cal.com",
    description: "קביעת פגישות עם תזכורות אוטומטיות",
    logo: null,
    color: "bg-slate-700",
    href: "https://refer.cal.com/autonomi-ai",
  },
  {
    name: "Gamma AI",
    description: "יצירת מצגות עם AI",
    logo: null,
    color: "bg-emerald-500",
    href: "https://try.gamma.app/71thgp0wv6er",
  },
]

export default function ClientToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">כלים מומלצים</h2>
        <p className="text-sm text-muted-foreground mt-1">
          הכלים שאנו ממליצים ומשתמשים בהם — הירשמו דרך הלינקים להטבות מיוחדות
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Card key={tool.name} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {tool.logo ? (
                  <img
                    src={tool.logo}
                    alt={tool.name}
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div className={`h-10 w-10 rounded-lg ${tool.color} flex items-center justify-center text-white font-bold text-lg`}>
                    {tool.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </div>
              <Button asChild size="sm" className="w-full">
                <a href={tool.href} target="_blank" rel="noopener noreferrer">
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

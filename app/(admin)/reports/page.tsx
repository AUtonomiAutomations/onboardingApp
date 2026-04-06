import Link from "next/link"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ReportsChecklist } from "@/components/dashboard/reports-checklist"
import {
  Users,
  DollarSign,
  Wallet,
  BarChart3,
  CheckCircle2,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Period = "weekly" | "monthly" | "quarterly" | "yearly"

const periodConfig: Record<Period, { label: string; days: number; hebrewLabel: string; nextLabel: string }> = {
  weekly:    { label: "שבועי",  days: 7,   hebrewLabel: "שבוע",    nextLabel: "שבוע" },
  monthly:   { label: "חודשי",  days: 30,  hebrewLabel: "חודש",    nextLabel: "חודש" },
  quarterly: { label: "רבעוני", days: 90,  hebrewLabel: "רבעון",   nextLabel: "רבעון" },
  yearly:    { label: "שנתי",   days: 365, hebrewLabel: "שנה",     nextLabel: "שנה" },
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n)

async function getPeriodData(period: Period) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { days } = periodConfig[period]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const startISO = startDate.toISOString()

  const [
    newClientsRes,
    revenueRes,
    completedClientsRes,
    payoutsRes,
    submittedCredentialsRes,
  ] = await Promise.all([
    // New clients created in period
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO),

    // Projects created in period → sum project_value
    service
      .from("projects")
      .select("project_value")
      .gte("created_at", startISO),

    // Completed clients created in period
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", startISO),

    // Freelancer assignments in period → sum payment_amount
    service
      .from("freelancer_assignments")
      .select("payment_amount")
      .gte("assigned_at", startISO),

    // Submitted credentials in period
    supabase
      .from("credentials")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted")
      .gte("submitted_at", startISO),
  ])

  const revenue = (revenueRes.data ?? []).reduce(
    (s: number, p: any) => s + (p.project_value ?? 0),
    0
  )
  const payouts = (payoutsRes.data ?? []).reduce(
    (s: number, a: any) => s + (a.payment_amount ?? 0),
    0
  )
  const netMargin = revenue - payouts
  const marginPct = revenue > 0 ? Math.round((netMargin / revenue) * 100) : 0

  return {
    newClients:           newClientsRes.count ?? 0,
    revenue,
    completedClients:     completedClientsRes.count ?? 0,
    payouts,
    netMargin,
    marginPct,
    submittedCredentials: submittedCredentialsRes.count ?? 0,
  }
}

const kpiCards = [
  {
    key: "newClients" as const,
    label: "לקוחות חדשים",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    format: (v: number) => String(v),
  },
  {
    key: "revenue" as const,
    label: "הכנסות בתקופה",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    format: fmt,
  },
  {
    key: "completedClients" as const,
    label: "אונבורדינגים שהושלמו",
    icon: CheckCircle2,
    color: "text-violet-600",
    bg: "bg-violet-50",
    format: (v: number) => String(v),
  },
  {
    key: "payouts" as const,
    label: "תשלומי פרילנסרים",
    icon: Wallet,
    color: "text-rose-600",
    bg: "bg-rose-50",
    format: fmt,
  },
  {
    key: "netMargin" as const,
    label: "רווח נקי",
    icon: BarChart3,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    format: fmt,
    dynamic: true,
  },
  {
    key: "submittedCredentials" as const,
    label: "פרטי גישה שהוגשו",
    icon: ClipboardCheck,
    color: "text-amber-600",
    bg: "bg-amber-50",
    format: (v: number) => String(v),
  },
]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period =
    rawPeriod === "monthly" || rawPeriod === "quarterly" || rawPeriod === "yearly"
      ? rawPeriod
      : "weekly"

  const data = await getPeriodData(period)
  const { hebrewLabel } = periodConfig[period]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">דוחות תקופתיים</h2>
        <p className="text-sm text-muted-foreground mt-1">סקירה תפעולית ואסטרטגית לפי תקופה</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(Object.keys(periodConfig) as Period[]).map((p) => (
          <Link
            key={p}
            href={`/reports?period=${p}`}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              p === period
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            {periodConfig[p].label}
          </Link>
        ))}
      </div>

      {/* What happened section */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          מה קרה ב{hebrewLabel} האחרון
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {kpiCards.map(({ key, label, icon: Icon, color, bg, format, dynamic }) => {
            const value = data[key]
            const isNegative = dynamic && (value as number) < 0
            return (
              <Card key={key} className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <div className={cn("rounded-lg p-2", isNegative ? "bg-rose-50" : bg)}>
                    <Icon className={cn("h-4 w-4", isNegative ? "text-rose-600" : color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    dynamic
                      ? (value as number) >= 0 ? "text-emerald-700" : "text-rose-700"
                      : "text-slate-900"
                  )}>
                    {format(value as number)}
                  </div>
                  {key === "netMargin" && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      מרווח {data.marginPct}%
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Targets checklist section */}
      <ReportsChecklist period={period} />
    </div>
  )
}

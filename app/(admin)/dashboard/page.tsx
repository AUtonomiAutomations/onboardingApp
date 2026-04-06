import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { RealtimeClientsTable, type ClientRow } from "@/components/dashboard/realtime-clients-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, Clock, TrendingUp, CheckCircle2, DollarSign, Wallet, BarChart3, ArrowUpRight } from "lucide-react"

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [total, pending, inProgress, completed] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ])
  return {
    total:      total.count ?? 0,
    pending:    pending.count ?? 0,
    inProgress: inProgress.count ?? 0,
    completed:  completed.count ?? 0,
  }
}

async function getFinancials(service: Awaited<ReturnType<typeof createServiceClient>>) {
  const [projectsRes, paymentsRes] = await Promise.all([
    service.from("projects").select("id, project_value, client_id, clients(company_name)"),
    service.from("freelancer_assignments").select("payment_amount, project_id, projects(project_value)"),
  ])

  const projects = (projectsRes.data ?? []) as any[]
  const assignments = (paymentsRes.data ?? []) as any[]

  const totalRevenue = projects.reduce((s, p) => s + (p.project_value ?? 0), 0)
  const totalPayouts = assignments.reduce((s, a) => s + (a.payment_amount ?? 0), 0)
  const netMargin = totalRevenue - totalPayouts

  const perClient = projects.map((p) => {
    const clientPayouts = assignments
      .filter((a) => a.project_id === p.id)
      .reduce((s: number, a: any) => s + (a.payment_amount ?? 0), 0)
    const clientName = Array.isArray(p.clients) ? p.clients[0]?.company_name : p.clients?.company_name
    return {
      project_id:   p.id,
      company_name: clientName ?? "—",
      revenue:      p.project_value ?? 0,
      payout:       clientPayouts,
      margin:       (p.project_value ?? 0) - clientPayouts,
    }
  }).filter((r) => r.revenue > 0)

  return { totalRevenue, totalPayouts, netMargin, perClient }
}

async function getInitialClients(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ClientRow[]> {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, status, created_at, monday_item_id, projects(id)")
    .order("created_at", { ascending: false })

  if (!clients) return []

  const rows: ClientRow[] = await Promise.all(
    (clients as any[]).map(async (c) => {
      const project = c.projects?.[0]
      if (!project) return { ...c, project_id: null, total_systems: 0, submitted_systems: 0 }
      const [{ count: total }, { count: submitted }] = await Promise.all([
        supabase.from("project_systems").select("*", { count: "exact", head: true }).eq("project_id", project.id),
        supabase.from("credentials").select("*", { count: "exact", head: true }).eq("project_id", project.id).eq("status", "submitted"),
      ])
      return {
        id: c.id, company_name: c.company_name, status: c.status,
        created_at: c.created_at, monday_item_id: c.monday_item_id,
        project_id: project.id, total_systems: total ?? 0, submitted_systems: submitted ?? 0,
      }
    })
  )
  return rows
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n)

const clientStatCards = [
  { key: "total",      label: "סה\"כ לקוחות",  icon: Users,        color: "text-blue-600",    bg: "bg-blue-50" },
  { key: "pending",    label: "ממתינים",        icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50" },
  { key: "inProgress", label: "בתהליך",         icon: TrendingUp,   color: "text-violet-600",  bg: "bg-violet-50" },
  { key: "completed",  label: "הושלמו",         icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
] as const

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const [stats, service, initialClients] = await Promise.all([
    getStats(supabase),
    createServiceClient(),
    getInitialClients(supabase),
  ])

  const financials = await getFinancials(service)

  const marginPct = financials.totalRevenue > 0
    ? Math.round((financials.netMargin / financials.totalRevenue) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">לוח מחוונים</h2>
        <p className="text-sm text-muted-foreground mt-1">סקירה כללית של לקוחות ופיננסים</p>
      </div>

      {/* Client KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {clientStatCards.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats[key]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial KPI Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">פיננסים</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">סה&quot;כ הכנסות</CardTitle>
              <div className="rounded-lg p-2 bg-emerald-50">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{fmt(financials.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{financials.perClient.length} פרויקטים עם ערך מוגדר</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">סה&quot;כ תשלומי פרילנסר</CardTitle>
              <div className="rounded-lg p-2 bg-rose-50">
                <Wallet className="h-4 w-4 text-rose-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{fmt(financials.totalPayouts)}</div>
              <p className="text-xs text-muted-foreground mt-1">עלות כוח אדם כוללת</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">רווח נקי</CardTitle>
              <div className={`rounded-lg p-2 ${financials.netMargin >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                <BarChart3 className={`h-4 w-4 ${financials.netMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${financials.netMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {fmt(financials.netMargin)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">מרווח {marginPct}%</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Per-client revenue breakdown */}
      {financials.perClient.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold">פירוט הכנסות לפי לקוח</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-muted-foreground">
                  <th className="text-start px-6 py-3 font-medium">לקוח</th>
                  <th className="text-start px-6 py-3 font-medium">הכנסה</th>
                  <th className="text-start px-6 py-3 font-medium">תשלום פרילנסר</th>
                  <th className="text-start px-6 py-3 font-medium">רווח</th>
                  <th className="text-start px-6 py-3 font-medium">מרווח</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financials.perClient.map((row) => {
                  const pct = row.revenue > 0 ? Math.round((row.margin / row.revenue) * 100) : 0
                  return (
                    <tr key={row.project_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{row.company_name}</td>
                      <td className="px-6 py-3 text-emerald-700 font-medium">{fmt(row.revenue)}</td>
                      <td className="px-6 py-3 text-rose-600">{fmt(row.payout)}</td>
                      <td className={`px-6 py-3 font-semibold ${row.margin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {fmt(row.margin)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          pct >= 50 ? "bg-emerald-50 text-emerald-700" :
                          pct >= 20 ? "bg-amber-50 text-amber-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          <ArrowUpRight className="h-3 w-3" />
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Realtime Clients Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">כל הלקוחות</CardTitle>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              עדכון בזמן אמת
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <RealtimeClientsTable initial={initialClients} />
        </CardContent>
      </Card>
    </div>
  )
}

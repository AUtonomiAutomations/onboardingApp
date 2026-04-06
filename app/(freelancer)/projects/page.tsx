import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Briefcase, ArrowLeft, Wallet } from "lucide-react"
import Link from "next/link"

const statusLabel: Record<string, string> = {
  active:    "פעיל",
  completed: "הושלם",
  on_hold:   "מושהה",
}
const statusVariant: Record<string, "default" | "success" | "secondary"> = {
  active:    "default",
  completed: "success",
  on_hold:   "secondary",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n)

export default async function FreelancerProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: assignmentsRaw } = await supabase
    .from("freelancer_assignments")
    .select("project_id, assigned_at, payment_amount, projects(id, status, clients(company_name))")
    .eq("freelancer_id", user!.id)
    .order("assigned_at", { ascending: false })

  const assignments = (assignmentsRaw ?? []) as any[]

  const rows = await Promise.all(
    assignments.map(async (a) => {
      const project = a.projects
      if (!project) return null

      const [{ count: total }, { count: submitted }] = await Promise.all([
        supabase.from("project_systems").select("*", { count: "exact", head: true }).eq("project_id", project.id),
        supabase.from("credentials").select("*", { count: "exact", head: true }).eq("project_id", project.id).eq("status", "submitted"),
      ])

      const clientName = Array.isArray(project.clients)
        ? project.clients[0]?.company_name
        : project.clients?.company_name

      return {
        project_id:     project.id,
        company_name:   clientName ?? "—",
        status:         project.status as string,
        assigned_at:    a.assigned_at,
        payment_amount: a.payment_amount ?? 0,
        total:          total ?? 0,
        submitted:      submitted ?? 0,
      }
    })
  )

  const validRows = rows.filter(Boolean) as NonNullable<typeof rows[number]>[]
  const totalPayout = validRows.reduce((s, r) => s + r.payment_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">הפרויקטים שלי</h2>
        <p className="text-sm text-muted-foreground mt-1">כל הפרויקטים שהוקצו לך</p>
      </div>

      {/* Payout summary card */}
      <Card className="border-slate-200 bg-gradient-to-l from-violet-50 to-slate-50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-violet-100 p-3">
              <Wallet className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">סה&quot;כ תשלום צפוי</p>
              <p className="text-3xl font-bold text-violet-700 mt-0.5">{fmt(totalPayout)}</p>
            </div>
            <div className="me-auto" />
            <div className="text-end">
              <p className="text-xs text-muted-foreground">על פני</p>
              <p className="text-lg font-semibold text-slate-900">{validRows.length} פרויקטים</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">פירוט פרויקטים</CardTitle>
            <Badge variant="secondary" className="text-xs">{validRows.length} פרויקטים</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {validRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Briefcase className="h-10 w-10 text-slate-300" />
              <p className="text-sm">לא הוקצו לך פרויקטים עדיין</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>שם לקוח</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>התקדמות הגשה</TableHead>
                  <TableHead>תשלום</TableHead>
                  <TableHead>תאריך הקצאה</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {validRows.map((row) => {
                  const pct = row.total > 0 ? Math.round((row.submitted / row.total) * 100) : 0
                  return (
                    <TableRow key={row.project_id}>
                      <TableCell className="font-medium text-slate-900">{row.company_name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[row.status] ?? "secondary"}>
                          {statusLabel[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {row.submitted}/{row.total}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-violet-700">
                          {row.payment_amount > 0 ? fmt(row.payment_amount) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.assigned_at).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button asChild variant="ghost" size="sm" className="gap-1.5">
                          <Link href={`/projects/${row.project_id}`}>
                            פרטים
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

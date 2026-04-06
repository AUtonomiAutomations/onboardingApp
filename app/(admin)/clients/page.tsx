import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ExternalLink } from "lucide-react"

const STATUS_HE: Record<string, string> = {
  pending: "ממתין", in_progress: "בתהליך", completed: "הושלם",
}
const STATUS_VARIANT: Record<string, any> = {
  pending: "outline", in_progress: "warning", completed: "success",
}

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await (supabase as any)
    .from("clients")
    .select("id, company_name, status, created_at, monday_item_id")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">לקוחות</h2>
        <p className="text-sm text-muted-foreground mt-1">כל הלקוחות במערכת</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold">רשימת לקוחות ({clients?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם חברה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>מזהה Monday</TableHead>
                <TableHead>תאריך יצירה</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clients ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_HE[c.status] ?? c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {c.monday_item_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/clients/${c.id}`}>
                        פרטים <ExternalLink className="ms-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!clients || clients.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    אין לקוחות עדיין
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

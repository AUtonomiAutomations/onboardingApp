"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ExternalLink } from "lucide-react"

export interface ClientRow {
  id: string
  company_name: string
  status: string
  created_at: string
  monday_item_id: string | null
  project_id: string | null
  total_systems: number
  submitted_systems: number
}

const STATUS_HE: Record<string, string> = {
  pending:     "ממתין",
  in_progress: "בתהליך",
  completed:   "הושלם",
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "default"> = {
  pending:     "outline",
  in_progress: "warning",
  completed:   "success",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

async function fetchClients(supabase: ReturnType<typeof createClient>): Promise<ClientRow[]> {
  // Fetch clients with their project and credential progress
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, status, created_at, monday_item_id, projects(id)")
    .order("created_at", { ascending: false })

  if (!clients) return []

  // For each client, count total and submitted systems
  const rows: ClientRow[] = await Promise.all(
    clients.map(async (c: any) => {
      const project = c.projects?.[0]
      if (!project) {
        return { ...c, project_id: null, total_systems: 0, submitted_systems: 0 }
      }

      const { count: total } = await supabase
        .from("project_systems")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)

      const { count: submitted } = await supabase
        .from("credentials")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "submitted")

      return {
        id: c.id,
        company_name: c.company_name,
        status: c.status,
        created_at: c.created_at,
        monday_item_id: c.monday_item_id,
        project_id: project.id,
        total_systems: total ?? 0,
        submitted_systems: submitted ?? 0,
      }
    })
  )

  return rows
}

export function RealtimeClientsTable({ initial }: { initial: ClientRow[] }) {
  const [clients, setClients] = useState<ClientRow[]>(initial)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const rows = await fetchClients(supabase)
    setClients(rows)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("admin-credentials-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "credentials" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">אין לקוחות עדיין</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>שם חברה</TableHead>
          <TableHead>סטטוס</TableHead>
          <TableHead>התקדמות</TableHead>
          <TableHead>תאריך יצירה</TableHead>
          <TableHead className="text-end">פעולות</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const pct = client.total_systems > 0
            ? Math.round((client.submitted_systems / client.total_systems) * 100)
            : 0

          return (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.company_name}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[client.status] ?? "default"}>
                  {STATUS_HE[client.status] ?? client.status}
                </Badge>
              </TableCell>
              <TableCell className="min-w-[180px]">
                <div className="flex items-center gap-3">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {client.submitted_systems}/{client.total_systems}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(client.created_at)}
              </TableCell>
              <TableCell className="text-end">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/clients/${client.id}`}>
                    פרטים <ExternalLink className="ms-1 h-3 w-3" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

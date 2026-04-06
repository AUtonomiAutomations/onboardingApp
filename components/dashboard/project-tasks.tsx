"use client"

import { useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, ClipboardList } from "lucide-react"

interface Task {
  id: string
  board_name: string
  task_name: string
  trigger_type: string | null
  display_order: number
  is_done: boolean
  done_at: string | null
}

interface Props {
  projectId: string
  initialTasks: Task[]
}

const triggerColors: Record<string, string> = {
  webhook:  "bg-blue-50 text-blue-700 border-blue-200",
  schedule: "bg-orange-50 text-orange-700 border-orange-200",
  button:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  external: "bg-purple-50 text-purple-700 border-purple-200",
}

const triggerLabels: Record<string, string> = {
  webhook:  "Webhook",
  schedule: "Schedule",
  button:   "Button",
  external: "External",
}

export function ProjectTasks({ projectId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [pending, startTransition] = useTransition()

  const done = tasks.filter((t) => t.is_done).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Group tasks by board
  const boards = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.board_name]) acc[task.board_name] = []
    acc[task.board_name].push(task)
    return acc
  }, {})

  const toggleTask = (task: Task) => {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const newDone = !task.is_done
      const { error } = await (supabase as any)
        .from("project_tasks")
        .update({
          is_done: newDone,
          done_at: newDone ? new Date().toISOString() : null,
          done_by: newDone ? user?.id ?? null : null,
        })
        .eq("id", task.id)
        .eq("project_id", projectId)

      if (error) {
        toast.error("שגיאה בעדכון המשימה")
        return
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, is_done: newDone, done_at: newDone ? new Date().toISOString() : null }
            : t
        )
      )

      toast.success(newDone ? "משימה סומנה כהושלמה ✓" : "משימה סומנה כלא הושלמה")
    })
  }

  if (total === 0) return null

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base font-semibold">משימות אוטומציות</CardTitle>
          </div>
          <Badge
            variant={done === total ? "default" : "secondary"}
            className={done === total ? "bg-emerald-600" : ""}
          >
            {done} / {total} הושלמו
          </Badge>
        </div>
        <div className="mt-3 space-y-1">
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground text-left">{pct}%</p>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {Object.entries(boards).map(([boardName, boardTasks]) => (
          <div key={boardName}>
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-700 font-semibold text-slate-600">{boardName}</p>
            </div>
            {boardTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${pending ? "opacity-70 pointer-events-none" : ""}`}
                onClick={() => toggleTask(task)}
              >
                {task.is_done
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  : <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                }
                <span className={`text-sm flex-1 ${task.is_done ? "line-through text-muted-foreground" : "text-slate-900"}`}>
                  {task.task_name}
                </span>
                {task.trigger_type && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${triggerColors[task.trigger_type] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {triggerLabels[task.trigger_type] ?? task.trigger_type}
                  </span>
                )}
                {task.is_done && task.done_at && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(task.done_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

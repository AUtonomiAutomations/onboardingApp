"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type Period = "weekly" | "monthly" | "quarterly" | "yearly"

interface ChecklistItem {
  id: string
  text: string
}

interface ChecklistSection {
  title: string
  items: ChecklistItem[]
}

const checklistData: Record<Period, { heading: string; sections: ChecklistSection[] }> = {
  weekly: {
    heading: "יעדים ותכנון לשבוע הקרוב — המנוע התפעולי",
    sections: [
      {
        title: "גבייה ומכירות",
        items: [
          { id: "w1", text: "כמה לידים נכנסו בשבוע החולף?" },
          { id: "w2", text: "מי הלקוחות בשלב חתימה-סליקה שצריכים דחיפה אחרונה?" },
          { id: "w3", text: "האם כל הכסף שהיה אמור להיכנס השבוע אכן נכנס?" },
        ],
      },
      {
        title: "סטטוס פרויקטים ו-Delivery",
        items: [
          { id: "w4", text: "סקירת לוח הפרויקטים הפעילים — מה התקדם ומה תקוע?" },
          { id: "w5", text: "האם יש חריגה בלו\"ז או ב-Scope של לקוח מסוים?" },
          { id: "w6", text: "סטטוס Onboarding ללקוחות חדשים שנכנסו השבוע" },
        ],
      },
      {
        title: "ניהול פרילנסרים",
        items: [
          { id: "w7", text: "האם כל הפרילנסרים קיבלו משימות ברורות לשבוע הקרוב?" },
          { id: "w8", text: "האם יש פרילנסר שחורג מהתקציב או מהשעות שהוגדרו?" },
        ],
      },
      {
        title: "שיווק וסושיאל",
        items: [
          { id: "w9", text: "מה עולה השבוע לאינסטגרם וללינקדאין? (לו\"ז תכנים)" },
          { id: "w10", text: "האם ה-Case Study השבועי מוכן להפצה?" },
          { id: "w11", text: "מה הדבר הכי קריטי שמעכב אותנו כרגע?" },
        ],
      },
    ],
  },
  monthly: {
    heading: "יעדים ותכנון לחודש הקרוב — מבט העל",
    sections: [
      {
        title: "דאשבורד פיננסי",
        items: [
          { id: "m1", text: "סך הכנסות בחודש החולף — בדיקה מול יעד ה-200k" },
          { id: "m2", text: "הוצאות פרילנסרים וריטיינרים — האם אנחנו ברווחיות הרצויה?" },
        ],
      },
      {
        title: "שיווק ומכירות",
        items: [
          { id: "m3", text: "כמות פגישות אפיון/זום שבוצעו בחודש האחרון" },
          { id: "m4", text: "יחס המרה: מליד נכנס לפרויקט משולם" },
          { id: "m5", text: "ביצועי סושיאל — איזה תוכן הביא הכי הרבה מעורבות/לידים?" },
        ],
      },
      {
        title: "חווית לקוח וביקורות",
        items: [
          { id: "m6", text: "כמה ביקורות גוגל / סרטוני עדות הצלחנו להוציא בחודש האחרון?" },
          { id: "m7", text: "סקירת טופס ה-Lovable — האם היו תקלות חוזרות שדורשות פתרון רוחבי?" },
        ],
      },
      {
        title: "תשתית וטכנולוגיה",
        items: [
          { id: "m8", text: "מעבר על ה-Intelligence Hub — כלים חדשים שיצאו החודש ואיך הטמענו אותם" },
          { id: "m9", text: "סטטוס מעבר המיילים (Migration) וסידור ה-Workspace" },
        ],
      },
    ],
  },
  quarterly: {
    heading: "יעדים ותכנון לרבעון הבא — ניווט אסטרטגי",
    sections: [
      {
        title: "בדיקת עמידה ביעדי הרבעון",
        items: [
          { id: "q1", text: "האם הגענו ליעד ההכנסות שהצבנו לרבעון?" },
          { id: "q2", text: "האם מספר הפרויקטים החודשי עמד על 8–12?" },
          { id: "q3", text: "האם הושלמה הסמכת ה-Partner של Monday?" },
        ],
      },
      {
        title: "אסטרטגיית צמיחה ומוצרים חדשים",
        items: [
          { id: "q4", text: "סטטוס קורס ה-AI — האם הושק? מה התוצאות?" },
          { id: "q5", text: "שותפויות — האם ערוץ ה-Affiliate מייצר הכנסה משמעותית?" },
        ],
      },
      {
        title: "הון אנושי ומבנה ארגוני",
        items: [
          { id: "q6", text: "האם חלוקת התפקידים עדיין עובדת כמו שצריך?" },
          { id: "q7", text: "האם צריך לגייס פרילנסר קבוע נוסף?" },
        ],
      },
      {
        title: "מבט לרבעון הבא",
        items: [
          { id: "q8", text: "קביעת 3 המטרות הגדולות (Big Rocks) לשלושת החודשים הקרובים" },
          { id: "q9", text: "קביעת יעד הכנסות לרבעון הבא" },
          { id: "q10", text: "אילו לקוחות / שוק נרצה לטרגט ברבעון הקרוב?" },
        ],
      },
    ],
  },
  yearly: {
    heading: "יעדים ותכנון לשנה הבאה — ביקורת שנתית",
    sections: [
      {
        title: "ביצועים פיננסיים",
        items: [
          { id: "y1", text: "סך הכנסות השנה מול יעד שנתי — האם עמדנו ביעד?" },
          { id: "y2", text: "ניתוח רווחיות — האם המבנה הפיננסי בריא?" },
          { id: "y3", text: "מה היה הפרויקט / הלקוח הרווחי ביותר השנה?" },
        ],
      },
      {
        title: "צמיחה ומיצוב",
        items: [
          { id: "y4", text: "כמה לקוחות חדשים נכנסו השנה?" },
          { id: "y5", text: "האם המותג והנוכחות הדיגיטלית גדלו משמעותית?" },
          { id: "y6", text: "מה היו 3 ההצלחות הגדולות של השנה?" },
        ],
      },
      {
        title: "למידה ושיפור",
        items: [
          { id: "y7", text: "מה היו 3 הכשלונות / האתגרים הגדולים ומה למדנו מהם?" },
          { id: "y8", text: "אילו תהליכים דורשים שיפור מהותי?" },
        ],
      },
      {
        title: "תוכנית לשנה הבאה",
        items: [
          { id: "y9", text: "קביעת יעד הכנסות שנתי" },
          { id: "y10", text: "3 יעדים אסטרטגיים עיקריים לשנה הבאה" },
          { id: "y11", text: "האם יש שינויים מבניים נדרשים (גיוס, שותפויות, מוצרים)?" },
        ],
      },
    ],
  },
}

interface ReportsChecklistProps {
  period: Period
}

export function ReportsChecklist({ period }: ReportsChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const data = checklistData[period]

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalItems = data.sections.reduce((s, sec) => s + sec.items.length, 0)
  const checkedCount = checked.size

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{data.heading}</h3>
        <span className="text-sm text-muted-foreground">
          {checkedCount} / {totalItems} פריטים הושלמו
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-300"
          style={{ width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : "0%" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.sections.map((section) => (
          <Card key={section.title} className="border-slate-200">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {section.items.map((item) => {
                const isDone = checked.has(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-right text-sm transition-colors hover:bg-slate-50",
                      isDone && "opacity-60"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <span className={cn("text-slate-700", isDone && "line-through text-slate-400")}>
                      {item.text}
                    </span>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

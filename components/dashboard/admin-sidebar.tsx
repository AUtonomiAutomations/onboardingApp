"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Puzzle,
  Zap,
  FileBarChart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { UserNav } from "@/components/dashboard/user-nav"

const navItems = [
  {
    label: "לוח מחוונים",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "לקוחות",
    href: "/clients",
    icon: Users,
  },
  {
    label: "מערכות",
    href: "/systems",
    icon: Puzzle,
  },
  {
    label: "דוחות",
    href: "/reports",
    icon: FileBarChart,
  },
]

interface AdminSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-e border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-slate-200">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm">AutoAgency</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400">
          ניווט
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-200">
        <UserNav {...user} />
      </div>
    </aside>
  )
}

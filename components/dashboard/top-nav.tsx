"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserNav } from "@/components/dashboard/user-nav"

interface TopNavProps {
  user: { name: string; email: string; role: string }
  links: { label: string; href: string }[]
}

export function TopNav({ user, links }: TopNavProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200 bg-white px-6 gap-6">
      {/* Brand */}
      <div className="flex items-center gap-2 me-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm">AutoAgency</span>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="w-48">
        <UserNav {...user} />
      </div>
    </header>
  )
}

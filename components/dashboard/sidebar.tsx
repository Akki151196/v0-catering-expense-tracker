"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

interface User {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const isActive = (path: string) => pathname === path

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shadow-sm">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Image src="/logo.png" alt="Royal Catering Services" width={48} height={48} className="object-contain" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sidebar-foreground text-sm">Royal Catering</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link href="/dashboard">
          <Button
            variant={isActive("/dashboard") ? "default" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/dashboard")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            size="sm"
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </Button>
        </Link>
        <Link href="/dashboard/events">
          <Button
            variant={isActive("/dashboard/events") ? "default" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/dashboard/events")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            size="sm"
          >
            <span className="text-lg">📅</span>
            <span>Events</span>
          </Button>
        </Link>
        <Link href="/dashboard/expenses">
          <Button
            variant={isActive("/dashboard/expenses") ? "default" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/dashboard/expenses")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            size="sm"
          >
            <span className="text-lg">💰</span>
            <span>Expenses</span>
          </Button>
        </Link>
        <Link href="/dashboard/analytics">
          <Button
            variant={isActive("/dashboard/analytics") ? "default" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/dashboard/analytics")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            size="sm"
          >
            <span className="text-lg">📈</span>
            <span>Analytics</span>
          </Button>
        </Link>
        <Link href="/dashboard/reports">
          <Button
            variant={isActive("/dashboard/reports") ? "default" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/dashboard/reports")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            size="sm"
          >
            <span className="text-lg">📊</span>
            <span>Reports</span>
          </Button>
        </Link>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-3 bg-sidebar-accent/20 rounded-lg border border-sidebar-accent/30">
          <p className="text-xs font-semibold text-sidebar-foreground">Logged in as</p>
          <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start bg-transparent text-sidebar-foreground border-sidebar-accent/30 hover:bg-sidebar-accent/30"
          size="sm"
        >
          <span>🚪</span>
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}

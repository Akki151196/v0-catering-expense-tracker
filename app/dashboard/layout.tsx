"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar"
import { Header } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

export const dynamic = 'force-dynamic'

interface User {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleCloseMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const handleMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        console.log("Dashboard: Checking authentication...")

        // First check for session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log("Dashboard: Session check:", !!session)

        if (!session) {
          console.log("Dashboard: No session found, redirecting to login")
          router.replace("/auth/login")
          return
        }

        // Then get user details
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser()

        console.log("Dashboard: User check:", {
          hasUser: !!currentUser,
          error: error?.message
        })

        if (error || !currentUser) {
          console.log("Dashboard: No user found, redirecting to login")
          router.replace("/auth/login")
          return
        }

        console.log("Dashboard: Auth successful, user ID:", currentUser.id)
        setUser(currentUser)
      } catch (err) {
        console.error("Dashboard: Auth check error:", err)
        router.replace("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
            <span className="text-primary-foreground font-bold text-xl">RCS</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      <MobileSidebar user={user} isOpen={mobileMenuOpen} onClose={handleCloseMenu} />

      <div className="flex-1 flex flex-col w-full">
        <Header user={user} onMenuClick={handleMenuToggle} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

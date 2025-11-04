"use client"

import Image from "next/image"

interface User {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

interface HeaderProps {
  user: User
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <header className="h-20 bg-white border-b border-border flex items-center px-4 md:px-8 justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors">
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="w-12 h-12 bg-sidebar rounded-lg flex items-center justify-center">
          <Image src="/logo.png" alt="Royal Catering" width={40} height={40} className="object-contain" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">Royal Catering Services</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{currentDate}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
      </div>
    </header>
  )
}

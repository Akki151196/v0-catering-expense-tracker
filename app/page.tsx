import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-secondary">
      {/* Navigation */}
      <nav className="flex justify-between items-center py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4815-6V5xaeO5B5pdFUrbum0voAm2VYcA5P.png"
            alt="Royal Catering Services"
            className="w-10 h-10"
          />
          <span className="text-xl font-bold text-foreground">Royal Catering</span>
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="bg-primary hover:bg-primary/90">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 max-w-6xl mx-auto">
        <div className="space-y-6 max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground text-balance leading-tight">
            Premium Expense Tracking for Catering Events
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Manage events, track expenses, and generate reports with ease. Royal Catering Services' trusted expense
            management solution.
          </p>
          <div className="flex justify-center gap-4 pt-4 flex-wrap">
            <Link href="/auth/sign-up">
              <Button size="lg" className="px-8 bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="px-8 border-primary text-primary hover:bg-primary/10 bg-transparent"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 w-full">
          <div className="bg-card border border-border rounded-lg p-6 text-left shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Event Management</h3>
            <p className="text-muted-foreground">Organize all your catering events in one elegant place</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-left shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Expense Tracking</h3>
            <p className="text-muted-foreground">Track every expense by category with detailed receipts</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-left shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Profit & Loss Reports</h3>
            <p className="text-muted-foreground">Generate professional P&L reports instantly</p>
          </div>
        </div>
      </div>
    </main>
  )
}

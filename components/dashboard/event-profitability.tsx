"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { createClient } from "@/lib/supabase/client"

interface EventProfitability {
  event_id: string
  event_name: string
  client_name: string
  event_date: string
  booked_amount: number
  total_expenses: number
  profit: number
  profit_margin: number
  pax: number
  status: string
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function EventProfitability() {
  const [events, setEvents] = useState<EventProfitability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"profit" | "margin" | "date">("profit")

  useEffect(() => {
    const loadEventProfitability = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        if (!supabase) {
          setError("Supabase client not initialized")
          return
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error("[v0] Auth error:", userError)
          setError("Please log in to view profitability data")
          return
        }

        console.log("[v0] Fetching events for user:", user.id)

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, name, client_name, date, booked_amount, pax, status")
          .eq("created_by", user.id)
          .order("date", { ascending: false })

        if (eventsError) {
          console.error("[v0] Events error:", eventsError)
          setError(`Failed to fetch events: ${eventsError.message}`)
          return
        }

        console.log("[v0] Events fetched:", eventsData?.length)

        if (!eventsData || eventsData.length === 0) {
          console.log("[v0] No events found")
          setEvents([])
          setLoading(false)
          return
        }

        // Only fetch expenses for events that belong to this user
        const eventIds = eventsData.map((e: any) => e.id)
        console.log("[v0] Fetching expenses for event IDs:", eventIds)

        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("event_id, amount")
          .in("event_id", eventIds)

        if (expensesError) {
          console.error("[v0] Expenses error:", expensesError)
          setError(`Failed to fetch expenses: ${expensesError.message}`)
          return
        }

        console.log("[v0] Expenses fetched:", expensesData?.length)

        // Calculate profitability for each event
        const expensesByEvent = (expensesData || []).reduce(
          (acc: any, expense: any) => {
            if (!acc[expense.event_id]) {
              acc[expense.event_id] = 0
            }
            acc[expense.event_id] += expense.amount || 0
            return acc
          },
          {} as Record<string, number>,
        )

        const profitability: EventProfitability[] = eventsData.map((event: any) => {
          const totalExpenses = expensesByEvent[event.id] || 0
          const profit = (event.booked_amount || 0) - totalExpenses
          const profitMargin = event.booked_amount > 0 ? (profit / event.booked_amount) * 100 : 0

          return {
            event_id: event.id,
            event_name: event.name || "Unnamed Event",
            client_name: event.client_name || "N/A",
            event_date: event.date || new Date().toISOString(),
            booked_amount: event.booked_amount || 0,
            total_expenses: totalExpenses,
            profit,
            profit_margin: profitMargin,
            pax: event.pax || 0,
            status: event.status || "planned",
          }
        })

        console.log("[v0] Profitability data ready:", profitability.length, "events")
        setEvents(profitability)
      } catch (err) {
        console.error("[v0] Error loading profitability data:", err)
        setError(`An error occurred: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    loadEventProfitability()
  }, [])

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">{error}</p>
          <p className="text-xs text-red-600 mt-2">Check the browser console for detailed error logs.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <p className="text-muted-foreground">Loading profitability data...</p>
        </CardContent>
      </Card>
    )
  }

  // Sort events based on selected criteria
  const sortedEvents = [...events].sort((a, b) => {
    if (sortBy === "profit") return b.profit - a.profit
    if (sortBy === "margin") return b.profit_margin - a.profit_margin
    return new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  })

  // Summary statistics
  const totalBooked = events.reduce((sum, e) => sum + e.booked_amount, 0)
  const totalExpenses = events.reduce((sum, e) => sum + e.total_expenses, 0)
  const totalProfit = events.reduce((sum, e) => sum + e.profit, 0)
  const avgProfitMargin = events.length > 0 ? events.reduce((sum, e) => sum + e.profit_margin, 0) / events.length : 0
  const profitableEvents = events.filter((e) => e.profit > 0).length
  const lossEvents = events.filter((e) => e.profit < 0).length

  // Data for charts
  const profitTrendData = sortedEvents.slice(0, 10).map((event) => ({
    name: event.event_name.substring(0, 15),
    booked: event.booked_amount,
    expenses: event.total_expenses,
    profit: event.profit,
    margin: Number.parseFloat(event.profit_margin.toFixed(1)),
  }))

  const profitDistribution = [
    { name: "Profitable", value: profitableEvents },
    { name: "Loss-Making", value: lossEvents },
  ]

  const COLORS = ["#10b981", "#ef4444"]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatINR(totalBooked)}</div>
            <p className="text-xs text-muted-foreground mt-1">Booked amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">All events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatINR(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgProfitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {avgProfitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profit margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profitable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{profitableEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Loss-Making</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lossEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profitability Trend</CardTitle>
            <CardDescription>Revenue vs Expenses vs Profit</CardDescription>
          </CardHeader>
          <CardContent>
            {profitTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatINR(value as number)} />
                  <Legend />
                  <Bar dataKey="booked" name="Revenue" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Profitable vs Loss-Making Events</CardDescription>
          </CardHeader>
          <CardContent>
            {profitDistribution.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={profitDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {profitDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Event Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event-wise Profitability</CardTitle>
              <CardDescription>Detailed breakdown of each event's financials</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("profit")}
                className={`px-3 py-1 rounded-lg text-sm ${sortBy === "profit" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                By Profit
              </button>
              <button
                onClick={() => setSortBy("margin")}
                className={`px-3 py-1 rounded-lg text-sm ${sortBy === "margin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                By Margin
              </button>
              <button
                onClick={() => setSortBy("date")}
                className={`px-3 py-1 rounded-lg text-sm ${sortBy === "date" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                By Date
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-semibold">Event Name</th>
                  <th className="text-left py-3 px-3 font-semibold">Client</th>
                  <th className="text-right py-3 px-3 font-semibold">Revenue</th>
                  <th className="text-right py-3 px-3 font-semibold">Expenses</th>
                  <th className="text-right py-3 px-3 font-semibold">Profit</th>
                  <th className="text-right py-3 px-3 font-semibold">Margin %</th>
                  <th className="text-center py-3 px-3 font-semibold">Pax</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.length > 0 ? (
                  sortedEvents.map((event) => (
                    <tr key={event.event_id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-3 font-medium">{event.event_name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{event.client_name}</td>
                      <td className="py-3 px-3 text-right font-semibold">{formatINR(event.booked_amount)}</td>
                      <td className="py-3 px-3 text-right text-orange-600 font-semibold">
                        {formatINR(event.total_expenses)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-semibold ${event.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatINR(event.profit)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-semibold ${event.profit_margin >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {event.profit_margin.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">{event.pax}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-muted-foreground">
                      No events available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, Percent } from "lucide-react"

interface EventAnalytics {
  id: string
  name: string
  date: string
  client_name: string
  booked_amount: number
  totalExpenses: number
  profit: number
  profitMargin: number
  pax: number
}

interface MonthlyAnalytics {
  month: string
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  profitMargin: number
  eventCount: number
}

interface QuarterlyAnalytics {
  quarter: string
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  profitMargin: number
  eventCount: number
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function AnalyticsPage() {
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalytics[]>([])
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlyAnalytics[]>([])
  const [quarterlyAnalytics, setQuarterlyAnalytics] = useState<QuarterlyAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name, date, client_name, booked_amount, pax")
        .eq("created_by", user.id)
        .order("date", { ascending: false })

      // Fetch all expenses for this user
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("event_id, amount, expense_date")
        .eq("created_by", user.id)

      // Calculate event-wise analytics
      const eventMap = new Map()
      expensesData?.forEach((expense) => {
        const key = expense.event_id
        if (!eventMap.has(key)) {
          eventMap.set(key, 0)
        }
        eventMap.set(key, eventMap.get(key) + (expense.amount || 0))
      })

      const analytics: EventAnalytics[] = (eventsData || []).map((event) => {
        const totalExpenses = eventMap.get(event.id) || 0
        const revenue = event.booked_amount || 0
        const profit = revenue - totalExpenses
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

        return {
          id: event.id,
          name: event.name,
          date: event.date,
          client_name: event.client_name,
          booked_amount: revenue,
          totalExpenses,
          profit,
          profitMargin,
          pax: event.pax || 0,
        }
      })

      setEventAnalytics(analytics)

      // Calculate monthly analytics
      const monthlyMap = new Map()
      analytics.forEach((event) => {
        const date = new Date(event.date)
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            totalRevenue: 0,
            totalExpenses: 0,
            totalProfit: 0,
            eventCount: 0,
          })
        }

        const current = monthlyMap.get(monthKey)
        current.totalRevenue += event.booked_amount
        current.totalExpenses += event.totalExpenses
        current.totalProfit += event.profit
        current.eventCount += 1
      })

      const monthlyData = Array.from(monthlyMap.values()).map((m: any) => ({
        ...m,
        profitMargin: m.totalRevenue > 0 ? (m.totalProfit / m.totalRevenue) * 100 : 0,
      }))

      setMonthlyAnalytics(monthlyData)

      // Calculate quarterly analytics
      const quarterlyMap = new Map()
      analytics.forEach((event) => {
        const date = new Date(event.date)
        const year = date.getFullYear()
        const quarter = Math.ceil((date.getMonth() + 1) / 3)
        const quarterKey = `Q${quarter} ${year}`

        if (!quarterlyMap.has(quarterKey)) {
          quarterlyMap.set(quarterKey, {
            quarter: quarterKey,
            totalRevenue: 0,
            totalExpenses: 0,
            totalProfit: 0,
            eventCount: 0,
          })
        }

        const current = quarterlyMap.get(quarterKey)
        current.totalRevenue += event.booked_amount
        current.totalExpenses += event.totalExpenses
        current.totalProfit += event.profit
        current.eventCount += 1
      })

      const quarterlyData = Array.from(quarterlyMap.values()).map((q: any) => ({
        ...q,
        profitMargin: q.totalRevenue > 0 ? (q.totalProfit / q.totalRevenue) * 100 : 0,
      }))

      setQuarterlyAnalytics(quarterlyData)
    } catch (error) {
      console.error("[v0] Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = eventAnalytics.reduce((sum, e) => sum + e.booked_amount, 0)
  const totalExpenses = eventAnalytics.reduce((sum, e) => sum + e.totalExpenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Profitability</h1>
        <p className="text-muted-foreground">Track profit, expenses, and profit margins across all events</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatINR(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{eventAnalytics.length} events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalExpenses / totalRevenue) * 100 || 0).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatINR(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net profit from all events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overallMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {overallMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall margin across all events</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Event-wise</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        </TabsList>

        {/* Event-wise Analysis */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event-wise Profitability</CardTitle>
              <CardDescription>Booked amount, expenses, and profit for each event</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Event Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Client</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-right py-3 px-4 font-semibold">Booked Amount</th>
                      <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                      <th className="text-right py-3 px-4 font-semibold">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          Loading analytics...
                        </td>
                      </tr>
                    ) : eventAnalytics.length > 0 ? (
                      eventAnalytics.map((event) => (
                        <tr key={event.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{event.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{event.client_name}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">{formatINR(event.booked_amount)}</td>
                          <td className="py-3 px-4 text-right">{formatINR(event.totalExpenses)}</td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${event.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatINR(event.profit)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right ${event.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {event.profitMargin.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          No events with booked amounts. Add events with booked amounts to see analytics.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Analysis */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Profitability</CardTitle>
              <CardDescription>Revenue, expenses, and profit trends by month</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={monthlyAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value) => formatINR(value)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalRevenue" fill="#10b981" name="Revenue" />
                    <Bar yAxisId="left" dataKey="totalExpenses" fill="#ef4444" name="Expenses" />
                    <Line yAxisId="right" type="monotone" dataKey="profitMargin" stroke="#8b5cf6" name="Margin %" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No monthly data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Month</th>
                      <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                      <th className="text-right py-3 px-4 font-semibold">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold">Margin %</th>
                      <th className="text-center py-3 px-4 font-semibold">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyAnalytics.map((month) => (
                      <tr key={month.month} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{month.month}</td>
                        <td className="py-3 px-4 text-right">{formatINR(month.totalRevenue)}</td>
                        <td className="py-3 px-4 text-right">{formatINR(month.totalExpenses)}</td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${month.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatINR(month.totalProfit)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right ${month.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {month.profitMargin.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">{month.eventCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarterly Analysis */}
        <TabsContent value="quarterly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Profitability</CardTitle>
              <CardDescription>Revenue, expenses, and profit trends by quarter</CardDescription>
            </CardHeader>
            <CardContent>
              {quarterlyAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={quarterlyAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value) => formatINR(value)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalRevenue" fill="#10b981" name="Revenue" />
                    <Bar yAxisId="left" dataKey="totalExpenses" fill="#ef4444" name="Expenses" />
                    <Line yAxisId="right" type="monotone" dataKey="profitMargin" stroke="#8b5cf6" name="Margin %" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No quarterly data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quarterly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Quarter</th>
                      <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                      <th className="text-right py-3 px-4 font-semibold">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold">Margin %</th>
                      <th className="text-center py-3 px-4 font-semibold">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyAnalytics.map((quarter) => (
                      <tr key={quarter.quarter} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{quarter.quarter}</td>
                        <td className="py-3 px-4 text-right">{formatINR(quarter.totalRevenue)}</td>
                        <td className="py-3 px-4 text-right">{formatINR(quarter.totalExpenses)}</td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${quarter.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatINR(quarter.totalProfit)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right ${quarter.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {quarter.profitMargin.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">{quarter.eventCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, Percent, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

interface TimeSeriesData {
  period: string
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

const getFinancialYear = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const fiscalYear = month < 3 ? year - 1 : year
  return `FY${fiscalYear}-${fiscalYear + 1}`
}

const getDateRange = (type: string, customFrom?: string, customTo?: string) => {
  const today = new Date()
  let from: Date, to: Date

  switch (type) {
    case "daily":
      from = new Date(today)
      from.setHours(0, 0, 0, 0)
      to = new Date(today)
      to.setHours(23, 59, 59, 999)
      break
    case "week":
      from = new Date(today)
      from.setDate(today.getDate() - today.getDay())
      to = new Date(from)
      to.setDate(from.getDate() + 6)
      break
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1)
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    case "quarter":
      const quarter = Math.ceil((today.getMonth() + 1) / 3)
      from = new Date(today.getFullYear(), (quarter - 1) * 3, 1)
      to = new Date(today.getFullYear(), quarter * 3, 0)
      break
    case "year":
      from = new Date(today.getFullYear(), 0, 1)
      to = new Date(today.getFullYear(), 11, 31)
      break
    case "financialYear":
      const fy = getFinancialYear(today)
      const fyStart = fy.includes("FY2024") ? 2024 : Number.parseInt(fy.substring(2, 6))
      from = new Date(fyStart, 3, 1)
      to = new Date(fyStart + 1, 2, 31)
      break
    case "custom":
      from = customFrom ? new Date(customFrom) : new Date(today.getFullYear(), 0, 1)
      to = customTo ? new Date(customTo) : today
      break
    default:
      from = new Date(today.getFullYear(), 0, 1)
      to = today
  }

  return { from, to }
}

export default function AnalyticsPage() {
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalytics[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustomDialog, setShowCustomDialog] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [filterType, customFrom, customTo])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { from, to } = getDateRange(filterType, customFrom, customTo)

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name, date, client_name, booked_amount, pax")
        .eq("created_by", user.id)
        .gte("date", from.toISOString().split("T")[0])
        .lte("date", to.toISOString().split("T")[0])
        .order("date", { ascending: false })

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("event_id, amount, expense_date")
        .eq("created_by", user.id)

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

      const generateTimeSeries = () => {
        const seriesMap = new Map()

        analytics.forEach((event) => {
          const date = new Date(event.date)
          let periodKey = ""

          if (filterType === "daily") {
            periodKey = date.toLocaleDateString("en-IN")
          } else if (filterType === "week") {
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            periodKey = `${weekStart.toLocaleDateString("en-IN")} - ${weekEnd.toLocaleDateString("en-IN")}`
          } else if (filterType === "month") {
            periodKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          } else if (filterType === "quarter") {
            const quarter = Math.ceil((date.getMonth() + 1) / 3)
            periodKey = `Q${quarter} ${date.getFullYear()}`
          } else if (filterType === "year") {
            periodKey = date.getFullYear().toString()
          } else if (filterType === "financialYear") {
            periodKey = getFinancialYear(date)
          } else {
            periodKey = date.toLocaleDateString("en-IN")
          }

          if (!seriesMap.has(periodKey)) {
            seriesMap.set(periodKey, {
              period: periodKey,
              totalRevenue: 0,
              totalExpenses: 0,
              totalProfit: 0,
              eventCount: 0,
            })
          }

          const current = seriesMap.get(periodKey)
          current.totalRevenue += event.booked_amount
          current.totalExpenses += event.totalExpenses
          current.totalProfit += event.profit
          current.eventCount += 1
        })

        const series = Array.from(seriesMap.values()).map((item: any) => ({
          ...item,
          profitMargin: item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0,
        }))

        return series
      }

      setTimeSeriesData(generateTimeSeries())
    } catch (error) {
      console.error("[v0] Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCustomDateRange = () => {
    setFilterType("custom")
    setShowCustomDialog(false)
  }

  const totalRevenue = eventAnalytics.reduce((sum, e) => sum + e.booked_amount, 0)
  const totalExpenses = eventAnalytics.reduce((sum, e) => sum + e.totalExpenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event-wise Analytics & Profitability</h1>
        <p className="text-muted-foreground">
          Comprehensive profit, expenses, and margin analysis with flexible filtering
        </p>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter by Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={filterType === "daily" ? "default" : "outline"}
              onClick={() => setFilterType("daily")}
              size="sm"
            >
              Daily
            </Button>
            <Button
              variant={filterType === "week" ? "default" : "outline"}
              onClick={() => setFilterType("week")}
              size="sm"
            >
              Weekly
            </Button>
            <Button
              variant={filterType === "month" ? "default" : "outline"}
              onClick={() => setFilterType("month")}
              size="sm"
            >
              Monthly
            </Button>
            <Button
              variant={filterType === "quarter" ? "default" : "outline"}
              onClick={() => setFilterType("quarter")}
              size="sm"
            >
              Quarterly
            </Button>
            <Button
              variant={filterType === "year" ? "default" : "outline"}
              onClick={() => setFilterType("year")}
              size="sm"
            >
              Yearly
            </Button>
            <Button
              variant={filterType === "financialYear" ? "default" : "outline"}
              onClick={() => setFilterType("financialYear")}
              size="sm"
            >
              Financial Year
            </Button>
            <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
              <DialogTrigger asChild>
                <Button variant={filterType === "custom" ? "default" : "outline"} size="sm">
                  Custom Range
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Custom Date Range</DialogTitle>
                  <DialogDescription>Choose start and end dates for your analysis</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                  </div>
                  <Button onClick={handleApplyCustomDateRange} className="w-full">
                    Apply Filter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
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

        <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalExpenses / totalRevenue) * 100 || 0).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
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

        <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
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

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
          <TabsTrigger value="events">Event Details</TabsTrigger>
        </TabsList>

        {/* Timeline Analysis */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profitability Trend</CardTitle>
              <CardDescription>Revenue, expenses, and profit margin over time</CardDescription>
            </CardHeader>
            <CardContent>
              {timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
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
                  No data available for selected period
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Period-wise Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Period</th>
                      <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                      <th className="text-right py-3 px-4 font-semibold">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold">Margin %</th>
                      <th className="text-center py-3 px-4 font-semibold">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSeriesData.map((item) => (
                      <tr key={item.period} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{item.period}</td>
                        <td className="py-3 px-4 text-right">{formatINR(item.totalRevenue)}</td>
                        <td className="py-3 px-4 text-right">{formatINR(item.totalExpenses)}</td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${item.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatINR(item.totalProfit)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right ${item.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {item.profitMargin.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">{item.eventCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event-wise Details */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event-wise Profitability</CardTitle>
              <CardDescription>Detailed breakdown for each event in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Event Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Client</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-center py-3 px-4 font-semibold">Pax</th>
                      <th className="text-right py-3 px-4 font-semibold">Booked Amount</th>
                      <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                      <th className="text-right py-3 px-4 font-semibold">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-muted-foreground">
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
                          <td className="py-3 px-4 text-center">{event.pax}</td>
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
                        <td colSpan={8} className="text-center py-6 text-muted-foreground">
                          No events in the selected period. Try adjusting your date filter.
                        </td>
                      </tr>
                    )}
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

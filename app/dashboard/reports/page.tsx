"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { exportToCSV, generateProfitLossReport, exportReportToJSON } from "@/lib/export-utils"

export const dynamic = 'force-dynamic'

interface Event {
  id: string
  name: string
  date: string
  client_name: string
  status: string
}

interface Expense {
  id: string
  amount: number
  expense_date: string
  event_id: string
  description: string
  categories?: { name: string }
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function ReportsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [estimatedRevenue, setEstimatedRevenue] = useState<string>("0")

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", user?.id)
        .order("date", { ascending: false })

      const { data: expensesData } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          expense_date,
          event_id,
          description,
          categories:category_id(name)
        `)
        .eq("created_by", user?.id)

      setEvents(eventsData || [])
      setExpenses(expensesData || [])
      if (eventsData && eventsData.length > 0) {
        setSelectedEvent(eventsData[0].id)
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEventExpenses = () => {
    if (!selectedEvent) return []
    return expenses.filter((e) => e.event_id === selectedEvent)
  }

  const getEventDetails = () => {
    return events.find((e) => e.id === selectedEvent)
  }

  const eventExpenses = getEventExpenses()
  const eventDetails = getEventDetails()
  const totalEventExpenses = eventExpenses.reduce((sum, e) => sum + e.amount, 0)
  const estimatedRevenuAmount = Number.parseFloat(estimatedRevenue) || 0
  const profit = estimatedRevenuAmount - totalEventExpenses

  const categoryData = eventExpenses.reduce((acc: any, expense) => {
    const categoryName = expense.categories?.name || "Other"
    const existing = acc.find((item: any) => item.name === categoryName)
    if (existing) {
      existing.value += expense.amount
    } else {
      acc.push({ name: categoryName, value: expense.amount })
    }
    return acc
  }, [])

  const handleExportExpenses = () => {
    const exportData = eventExpenses.map((e) => ({
      Description: e.description,
      Category: e.categories?.name || "N/A",
      Amount: e.amount,
      Date: new Date(e.expense_date).toLocaleDateString(),
    }))
    exportToCSV(exportData, `${eventDetails?.name}-expenses`)
  }

  const handleExportReport = () => {
    const report = generateProfitLossReport(eventDetails?.name || "Event", eventExpenses, estimatedRevenuAmount)
    exportReportToJSON(report, eventDetails?.name || "Event")
  }

  const handlePrint = () => {
    window.print()
  }

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analysis</h1>
        <p className="text-muted-foreground">Profit & Loss and expense analysis with export options</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : events.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Event</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedEvent || ""}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-border rounded-lg"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {selectedEvent && eventDetails && (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{eventDetails.name}</p>
                    <p className="text-xs text-muted-foreground">{eventDetails.client_name}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{formatINR(estimatedRevenuAmount)}</p>
                    <p className="text-xs text-muted-foreground">Estimated</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{formatINR(totalEventExpenses)}</p>
                    <p className="text-xs text-muted-foreground">{eventExpenses.length} line items</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profit/Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatINR(profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {estimatedRevenuAmount > 0
                        ? `${((profit / estimatedRevenuAmount) * 100).toFixed(1)}% margin`
                        : "N/A"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Estimated Revenue</CardTitle>
                  <CardDescription>Enter the event revenue to calculate profit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedRevenue}
                      onChange={(e) => setEstimatedRevenue(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-border rounded-lg"
                    />
                    <span className="text-lg font-semibold text-primary">₹</span>
                  </div>
                </CardContent>
              </Card>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportExpenses} variant="outline">
                  Export Expenses (CSV)
                </Button>
                <Button onClick={handleExportReport} variant="outline">
                  Export Report (JSON)
                </Button>
                <Button onClick={handlePrint} variant="outline">
                  Print Report
                </Button>
              </div>

              {eventExpenses.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Expenses by Category</CardTitle>
                      <CardDescription>Breakdown of expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${formatINR(value)}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatINR(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Breakdown</CardTitle>
                      <CardDescription>All expenses for this event</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {categoryData.map((category: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatINR(category.value)}</p>
                              <p className="text-xs text-muted-foreground">
                                {((category.value / totalEventExpenses) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-border pt-3 flex justify-between items-center">
                          <span className="font-semibold">Total</span>
                          <p className="font-bold text-lg">{formatINR(totalEventExpenses)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Detailed Expenses Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold">Description</th>
                          <th className="text-left py-2 px-3 font-semibold">Category</th>
                          <th className="text-right py-2 px-3 font-semibold">Amount</th>
                          <th className="text-left py-2 px-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-3">{expense.description}</td>
                            <td className="py-2 px-3 text-muted-foreground">{expense.categories?.name || "N/A"}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatINR(expense.amount)}</td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground">
              No events or expenses yet. Create events and add expenses to generate reports!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

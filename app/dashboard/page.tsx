"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { EventProfitability } from "@/components/dashboard/event-profitability"

export const dynamic = 'force-dynamic'

interface Event {
  id: string
  name: string
  date: string
  client_name: string
  status: string
  created_at: string
  booked_amount: number
}

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  category_name?: string
  event_name?: string
  created_at: string
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, name, date, client_name, status, created_at, booked_amount")
          .order("created_at", { ascending: false })

        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("id, description, amount, expense_date, created_at, expense_categories(name), events(name)")
          .order("created_at", { ascending: false })
          .limit(10)

        console.log("Expenses query result:", { error: expensesError, count: expensesData?.length })

        if (!eventsError && eventsData) {
          setEvents(eventsData as any)
        }

        if (!expensesError && expensesData) {
          setExpenses(
            expensesData.map((exp: any) => ({
              ...exp,
              category_name: exp.expense_categories?.name,
              event_name: exp.events?.name,
            })) as any,
          )
        }

        if (eventsError) {
          console.error("Events query error:", eventsError)
        }
        if (expensesError) {
          console.error("Expenses query error:", expensesError)
        }
      } catch (err) {
        console.log("[v0] Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const upcomingEvents = events.filter((e) => e.status === "planned").length
  const completedEvents = events.filter((e) => e.status === "completed").length

  // Category breakdown for pie chart
  const categoryData = expenses.reduce((acc: any, expense) => {
    const categoryName = expense.category_name || "Other"
    const existing = acc.find((item: any) => item.name === categoryName)
    if (existing) {
      existing.value += expense.amount
    } else {
      acc.push({ name: categoryName, value: expense.amount })
    }
    return acc
  }, [])

  // Monthly expense trend
  const monthlyData = expenses.reduce((acc: any, expense) => {
    const date = new Date(expense.expense_date)
    const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    const existing = acc.find((item: any) => item.month === monthKey)
    if (existing) {
      existing.amount += expense.amount
    } else {
      acc.push({ month: monthKey, amount: expense.amount })
    }
    return acc
  }, [])

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"]

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
          onClick={() => router.push("/dashboard/events")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingEvents} planned, {completedEvents} completed
            </p>
            <p className="text-xs text-primary mt-2 font-medium">Click to view →</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
          onClick={() => router.push("/dashboard/expenses")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expenses tracked</p>
            <p className="text-xs text-primary mt-2 font-medium">Click to view →</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
          onClick={() => router.push("/dashboard/analytics")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Per Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatINR(events.length > 0 ? totalExpenses / events.length : 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average expense per event</p>
            <p className="text-xs text-primary mt-2 font-medium">Click to view analytics →</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
          onClick={() => router.push("/dashboard/reports")}
        >
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Today's date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Today's date</p>
            <p className="text-xs text-primary mt-2 font-medium">Click to view reports →</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Profitability */}
      <EventProfitability />

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
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
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses Over Time</CardTitle>
            <CardDescription>Monthly expense trend</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Latest 10 expenses recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold">Description</th>
                  <th className="text-left py-2 px-3 font-semibold">Category</th>
                  <th className="text-left py-2 px-3 font-semibold">Event</th>
                  <th className="text-right py-2 px-3 font-semibold">Amount</th>
                  <th className="text-left py-2 px-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 px-3">{expense.description}</td>
                      <td className="py-2 px-3 text-muted-foreground">{expense.category_name || "N/A"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{expense.event_name || "N/A"}</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatINR(expense.amount)}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground">
                      No expenses yet. Start by creating an event and adding expenses!
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

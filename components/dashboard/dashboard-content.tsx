"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface Event {
  id: string
  name: string
  date: string
  client_name: string
  status: string
  created_at: string
}

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  categories?: { name: string }
  events?: { name: string }
  created_at: string
}

interface DashboardContentProps {
  events: Event[]
  expenses: Expense[]
}

export function DashboardContent({ events, expenses }: DashboardContentProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const upcomingEvents = events.filter((e) => e.status === "planned").length
  const completedEvents = events.filter((e) => e.status === "completed").length

  // Category breakdown for pie chart
  const categoryData = expenses.reduce((acc: any, expense) => {
    const categoryName = expense.categories?.name || "Other"
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingEvents} planned, {completedEvents} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expenses tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Per Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${events.length > 0 ? (totalExpenses / events.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average expense per event</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Today's date</p>
          </CardContent>
        </Card>
      </div>

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
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
                      <td className="py-2 px-3 text-muted-foreground">{expense.categories?.name || "N/A"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{expense.events?.name || "N/A"}</td>
                      <td className="py-2 px-3 text-right font-semibold">${expense.amount.toFixed(2)}</td>
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

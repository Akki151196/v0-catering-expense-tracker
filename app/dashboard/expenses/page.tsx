"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  receipt_url?: string
  receipt_file_name?: string
  categories?: { name: string }
  events?: { name: string }
}

interface Event {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<File | null>(null)
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_date: "",
    event_id: "",
    category_id: "",
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: expensesData } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          expense_date,
          receipt_url,
          receipt_file_name,
          categories:category_id(name),
          events:event_id(name)
        `)
        .eq("created_by", user?.id)
        .order("expense_date", { ascending: false })

      const { data: eventsData } = await supabase.from("events").select("id, name").eq("created_by", user?.id)

      const { data: categoriesData } = await supabase.from("expense_categories").select("id, name")

      setExpenses(expensesData || [])
      setEvents(eventsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let receiptUrl = null
      let receiptFileName = null

      if (selectedReceipt && user) {
        const fileName = `${user.id}/${Date.now()}-${selectedReceipt.name}`
        const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, selectedReceipt)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from("receipts").getPublicUrl(fileName)
        receiptUrl = data.publicUrl
        receiptFileName = selectedReceipt.name
      }

      const { error } = await supabase.from("expenses").insert({
        created_by: user?.id,
        description: formData.description,
        amount: Number.parseFloat(formData.amount),
        expense_date: formData.expense_date,
        event_id: formData.event_id,
        category_id: formData.category_id,
        receipt_url: receiptUrl,
        receipt_file_name: receiptFileName,
        receipt_uploaded_at: receiptUrl ? new Date().toISOString() : null,
      })

      if (error) throw error
      setFormData({
        description: "",
        amount: "",
        expense_date: "",
        event_id: "",
        category_id: "",
      })
      setSelectedReceipt(null)
      setIsOpen(false)
      loadData()
    } catch (error) {
      console.error("[v0] Error adding expense:", error)
    }
  }

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    try {
      setUploadingExpenseId(expenseId)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("User not authenticated")

      const fileName = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("receipts").getPublicUrl(fileName)
      const receiptUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          receipt_url: receiptUrl,
          receipt_file_name: file.name,
          receipt_uploaded_at: new Date().toISOString(),
        })
        .eq("id", expenseId)

      if (updateError) throw updateError
      loadData()
    } catch (error) {
      console.error("[v0] Error uploading receipt:", error)
    } finally {
      setUploadingExpenseId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track all event expenses with receipt management</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Record an expense for your event</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Beef and chicken for 100 guests"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50000.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedReceipt(e.target.files?.[0] || null)}
                />
                {selectedReceipt && <p className="text-sm text-muted-foreground">Selected: {selectedReceipt.name}</p>}
              </div>
              <Button type="submit" className="w-full">
                Add Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading expenses...</div>
      ) : expenses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>{expenses.length} total expenses recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-left py-3 px-4 font-semibold">Event</th>
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Receipt</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{expense.description}</td>
                      <td className="py-3 px-4 text-muted-foreground">{expense.events?.name || "N/A"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{expense.categories?.name || "N/A"}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatINR(expense.amount)}</td>
                      <td className="py-3 px-4">
                        {expense.receipt_url ? (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs"
                          >
                            View Receipt
                          </a>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadReceipt(expense.id, file)
                              }}
                              className="hidden"
                              disabled={uploadingExpenseId === expense.id}
                            />
                            <span className="text-accent hover:underline text-xs">
                              {uploadingExpenseId === expense.id ? "Uploading..." : "Upload"}
                            </span>
                          </label>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">No expenses yet. Add your first expense to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

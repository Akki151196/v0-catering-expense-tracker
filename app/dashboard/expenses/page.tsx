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
import { Trash2, Edit2 } from "lucide-react"

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  receipt_url?: string
  receipt_file_name?: string
  event_id: string
  category_id: string
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
  const [editingId, setEditingId] = useState<string | null>(null)
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
          event_id,
          category_id,
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

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submitted - starting expense save")
    try {
      if (
        !formData.description ||
        !formData.amount ||
        !formData.expense_date ||
        !formData.event_id ||
        !formData.category_id
      ) {
        console.log("[v0] Validation failed - missing fields")
        alert("Please fill in all required fields")
        return
      }

      console.log("[v0] Validation passed - fetching user")
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("[v0] No user found")
        alert("User not authenticated")
        return
      }

      console.log("[v0] User found:", user.id)
      let receiptUrl = null
      let receiptFileName = null

      if (selectedReceipt && user) {
        console.log("[v0] Receipt selected - uploading file:", selectedReceipt.name)
        const formDataToSend = new FormData()
        formDataToSend.append("file", selectedReceipt)

        try {
          const response = await fetch("/api/upload-receipt", {
            method: "POST",
            body: formDataToSend,
          })

          console.log("[v0] Upload response status:", response.status)

          if (!response.ok) {
            const errorData = await response.json()
            console.log("[v0] Upload failed:", errorData)
            alert(`Failed to upload receipt: ${errorData.error}`)
            return
          }

          const uploadData = await response.json()
          console.log("[v0] Upload successful:", uploadData)
          receiptUrl = uploadData.url
          receiptFileName = uploadData.filename
        } catch (uploadError) {
          console.error("[v0] Upload error:", uploadError)
          alert("Failed to upload receipt. Please check your connection and try again.")
          return
        }
      }

      console.log("[v0] Preparing to save expense with data:", {
        description: formData.description,
        amount: formData.amount,
        receiptUrl: receiptUrl ? "present" : "none",
      })

      if (editingId) {
        console.log("[v0] Updating existing expense:", editingId)
        const updateData: any = {
          description: formData.description,
          amount: Number.parseFloat(formData.amount),
          expense_date: formData.expense_date,
          event_id: formData.event_id,
          category_id: formData.category_id,
          updated_at: new Date().toISOString(),
        }

        if (receiptUrl) {
          updateData.receipt_url = receiptUrl
          updateData.receipt_file_name = receiptFileName
          updateData.receipt_uploaded_at = new Date().toISOString()
        }

        const { error } = await supabase.from("expenses").update(updateData).eq("id", editingId)

        if (error) {
          console.error("[v0] Update error:", error)
          alert(`Failed to update expense: ${error.message}`)
          return
        }
        console.log("[v0] Expense updated successfully")
      } else {
        console.log("[v0] Creating new expense")
        const { data: insertData, error } = await supabase.from("expenses").insert({
          created_by: user.id,
          description: formData.description,
          amount: Number.parseFloat(formData.amount),
          expense_date: formData.expense_date,
          event_id: formData.event_id,
          category_id: formData.category_id,
          receipt_url: receiptUrl,
          receipt_file_name: receiptFileName,
          receipt_uploaded_at: receiptUrl ? new Date().toISOString() : null,
        })

        if (error) {
          console.error("[v0] Insert error:", error)
          alert(`Failed to save expense: ${error.message}`)
          return
        }
        console.log("[v0] Expense created successfully:", insertData)
      }

      console.log("[v0] Resetting form and reloading data")
      setFormData({
        description: "",
        amount: "",
        expense_date: "",
        event_id: "",
        category_id: "",
      })
      setSelectedReceipt(null)
      setEditingId(null)
      setIsOpen(false)
      await loadData()
      console.log("[v0] Expense saved and data reloaded")
    } catch (error) {
      console.error("[v0] Error saving expense:", error)
      alert("An unexpected error occurred. Please try again.")
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      event_id: expense.event_id,
      category_id: expense.category_id,
    })
    setEditingId(expense.id)
    setIsOpen(true)
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id)
      if (error) throw error
      loadData()
    } catch (error) {
      console.error("[v0] Error deleting expense:", error)
    }
  }

  const handleCloseDialog = () => {
    setFormData({
      description: "",
      amount: "",
      expense_date: "",
      event_id: "",
      category_id: "",
    })
    setSelectedReceipt(null)
    setEditingId(null)
    setIsOpen(false)
  }

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    try {
      setUploadingExpenseId(expenseId)

      const formDataToSend = new FormData()
      formDataToSend.append("file", file)

      const response = await fetch("/api/upload-receipt", {
        method: "POST",
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Failed to upload receipt: ${errorData.error}`)
        return
      }

      const uploadData = await response.json()

      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          receipt_url: uploadData.url,
          receipt_file_name: uploadData.filename,
          receipt_uploaded_at: new Date().toISOString(),
        })
        .eq("id", expenseId)

      if (updateError) throw updateError
      loadData()
    } catch (error) {
      console.error("[v0] Error uploading receipt:", error)
      alert("Failed to upload receipt. Please try again.")
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
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog()
            setIsOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button>+ Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update expense details" : "Record an expense for your event"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveExpense} className="space-y-4">
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
                {editingId && expenses.find((e) => e.id === editingId)?.receipt_url && (
                  <div className="mb-3 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium mb-2">Current Receipt:</p>
                    <a
                      href={expenses.find((e) => e.id === editingId)?.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs break-all"
                    >
                      {expenses.find((e) => e.id === editingId)?.receipt_file_name}
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">Upload a new file to replace it</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedReceipt(e.target.files?.[0] || null)}
                />
                {selectedReceipt && <p className="text-sm text-muted-foreground">Selected: {selectedReceipt.name}</p>}
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Expense" : "Add Expense"}
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
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
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
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1 hover:bg-destructive/10 rounded transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
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

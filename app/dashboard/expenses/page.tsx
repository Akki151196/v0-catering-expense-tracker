"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
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
import { Trash2, Edit2, Upload, FileText, X } from "lucide-react"

export const dynamic = 'force-dynamic'

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        .order("expense_date", { ascending: false })

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name")
        .order("date", { ascending: false })

      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name")

      setExpenses(expensesData || [])
      setEvents(eventsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }
      setSelectedReceipt(file)
    }
  }

  const uploadReceipt = async (expenseId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${expenseId}-${Date.now()}.${fileExt}`

      const { error: uploadError, data } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          receipt_url: publicUrl,
          receipt_file_name: file.name,
          receipt_uploaded_at: new Date().toISOString(),
        })
        .eq("id", expenseId)

      if (updateError) throw updateError

      return publicUrl
    } catch (error) {
      console.error("Error uploading receipt:", error)
      throw error
    }
  }

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      let expenseId = editingId

      if (editingId) {
        const { error } = await supabase
          .from("expenses")
          .update({
            description: formData.description,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            event_id: formData.event_id,
            category_id: formData.category_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            created_by: user.id,
            description: formData.description,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            event_id: formData.event_id,
            category_id: formData.category_id,
          })
          .select()
          .single()

        if (error) throw error
        expenseId = data.id
      }

      if (selectedReceipt && expenseId) {
        await uploadReceipt(expenseId, selectedReceipt)
      }

      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error("Error saving expense:", error)
      alert("Failed to save expense. Please try again.")
    } finally {
      setUploading(false)
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
      console.error("Error deleting expense:", error)
      alert("Failed to delete expense. Please try again.")
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
    setEditingId(null)
    setSelectedReceipt(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setIsOpen(false)
  }

  const handleViewReceipt = (url?: string) => {
    if (url) {
      window.open(url, "_blank")
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage event expenses</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog()
          setIsOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button>+ New Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update expense details" : "Record a new expense with receipt"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="space-y-2">
                <Label>Event *</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
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
                <Label>Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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
                <Label>Description *</Label>
                <Input
                  placeholder="Describe the expense..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Receipt Image</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {selectedReceipt ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedReceipt.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setSelectedReceipt(null)
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                          className="p-1 hover:bg-destructive/10 rounded"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">Click to upload receipt image</span>
                        <span className="text-xs">PNG, JPG up to 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!loading && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-3xl font-bold">{formatINR(totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-semibold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading expenses...</p>
        </div>
      ) : expenses.length > 0 ? (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{expense.description}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="inline-block mr-4">
                        Event: {expense.events?.name || "Unknown"}
                      </span>
                      <span className="inline-block">
                        Category: {expense.categories?.name || "Unknown"}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {expense.receipt_url && (
                      <button
                        onClick={() => handleViewReceipt(expense.receipt_url)}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        title="View receipt"
                      >
                        <FileText className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditExpense(expense)}
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                      title="Edit expense"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {new Date(expense.expense_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatINR(expense.amount)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-4">
              No expenses recorded yet. Add your first expense to get started!
            </p>
            <p className="text-sm text-muted-foreground">
              Create an event first, then add expenses to track your costs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

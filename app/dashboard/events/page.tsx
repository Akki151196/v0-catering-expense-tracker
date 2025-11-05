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
import { Trash2, Edit2 } from "lucide-react"

interface Event {
  id: string
  name: string
  date: string
  client_name: string
  location: string
  status: string
  notes: string
  pax: number
  created_at: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    client_name: "",
    location: "",
    pax: "",
    notes: "",
  })

  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", user?.id)
        .order("date", { ascending: false })
      setEvents(data || [])
    } catch (error) {
      console.error("[v0] Error loading events:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (editingId) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({
            name: formData.name,
            date: formData.date,
            client_name: formData.client_name,
            location: formData.location,
            pax: Number.parseInt(formData.pax) || 0,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
        if (error) throw error
      } else {
        // Create new event
        const { error } = await supabase.from("events").insert({
          created_by: user?.id,
          name: formData.name,
          date: formData.date,
          client_name: formData.client_name,
          location: formData.location,
          pax: Number.parseInt(formData.pax) || 0,
          notes: formData.notes,
        })
        if (error) throw error
      }

      setFormData({ name: "", date: "", client_name: "", location: "", pax: "", notes: "" })
      setEditingId(null)
      setIsOpen(false)
      loadEvents()
    } catch (error) {
      console.error("[v0] Error saving event:", error)
    }
  }

  const handleEditEvent = (event: Event) => {
    setFormData({
      name: event.name,
      date: event.date,
      client_name: event.client_name,
      location: event.location,
      pax: event.pax.toString(),
      notes: event.notes,
    })
    setEditingId(event.id)
    setIsOpen(true)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return
    try {
      const { error } = await supabase.from("events").delete().eq("id", id)
      if (error) throw error
      loadEvents()
    } catch (error) {
      console.error("[v0] Error deleting event:", error)
    }
  }

  const handleCloseDialog = () => {
    setFormData({ name: "", date: "", client_name: "", location: "", pax: "", notes: "" })
    setEditingId(null)
    setIsOpen(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage your catering events</p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog()
            setIsOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button>+ New Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Event" : "Create New Event"}</DialogTitle>
              <DialogDescription>{editingId ? "Update event details" : "Add a new catering event"}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input
                  placeholder="Wedding Reception"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  placeholder="John Smith"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Grand Hotel Ballroom"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Guests (Pax)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.pax}
                  onChange={(e) => setFormData({ ...formData, pax: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Any special notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Event" : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading events...</div>
      ) : events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription>Client: {event.client_name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        event.status === "planned" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="font-semibold">Date:</span> {new Date(event.date).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-semibold">Location:</span> {event.location}
                  </p>
                  <p>
                    <span className="font-semibold">Guests (Pax):</span> {event.pax}
                  </p>
                  {event.notes && (
                    <p className="md:col-span-2">
                      <span className="font-semibold">Notes:</span> {event.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">No events yet. Create your first event to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

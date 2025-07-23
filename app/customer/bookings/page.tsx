"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Smartphone, Search, Clock, CheckCircle, AlertCircle, Download, MessageCircle, Star, Phone } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { supabase } from "@/lib/api"
import { formatGBP } from "@/lib/utils"

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "in-progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "in-progress":
      return <Clock className="h-4 w-4" />
    case "pending":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase.from('bookings').select('*')
        setBookings(data || [])
        setLoading(false)
      } catch {
        setError("Failed to load bookings")
        setLoading(false)
      }
    }
    fetchBookings()
    // Subscribe to bookings table changes
    const channel = supabase.channel('realtime:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        fetchBookings()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredBookings = bookings.filter((booking: any) => {
    const matchesSearch =
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.issue.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeBookings = filteredBookings.filter((b) => b.status !== "completed")
  const completedBookings = filteredBookings.filter((b) => b.status === "completed")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground">Track and manage your device repairs</p>
          </div>
          <Link href="/customer/book-repair">
            <Button>
              <Smartphone className="mr-2 h-4 w-4" />
              Book New Repair
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Bookings Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active Repairs ({activeBookings.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active repairs</h3>
                  <p className="text-muted-foreground mb-4">Book a repair to get started</p>
                  <Link href="/customer/book-repair">
                    <Button>Book New Repair</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeBookings.map((booking) => (
                  <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-semibold text-lg">{booking.device}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1 capitalize">{booking.status.replace("-", " ")}</span>
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Issue</p>
                                <p className="font-medium">{booking.issue}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Agent</p>
                                <p className="font-medium">{booking.agent}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Service Type</p>
                                <p className="font-medium">{booking.serviceType}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Booking Date</p>
                                <p className="font-medium">{new Date(booking.date).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {booking.estimatedCompletion && (
                              <div className="mb-4">
                                <p className="text-sm text-muted-foreground">Estimated Completion</p>
                                <p className="font-medium text-blue-600">
                                  {new Date(booking.estimatedCompletion).toLocaleDateString()}
                                </p>
                              </div>
                            )}

                            {/* Timeline */}
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Progress Timeline</p>
                              <div className="space-y-2">
                                {booking.timeline.map((event: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-primary rounded-full" />
                                    <span className="text-muted-foreground">
                                      {new Date(event.timestamp).toLocaleString()}
                                    </span>
                                    <span>{event.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 min-w-[200px]">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{formatGBP(booking.amount)}</p>
                              <p className="text-sm text-muted-foreground">Booking ID: {booking.id}</p>
                            </div>

                            <div className="space-y-2">
                              <Button variant="outline" className="w-full">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Chat with Agent
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Phone className="h-4 w-4 mr-2" />
                                Call Agent
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSelectedBooking(selectedBooking === booking.id ? null : booking.id)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {selectedBooking === booking.id && (
                          <div className="mt-6 pt-6 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Agent Contact</h4>
                                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                                <p className="font-medium mb-3">{booking.agentPhone}</p>
                                {booking.address && (
                                  <>
                                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                                    <p className="font-medium">{booking.address}</p>
                                  </>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Booking Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Service:</span>
                                    <span>{booking.serviceType}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span>{formatGBP(booking.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="capitalize">{booking.status.replace("-", " ")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed repairs</h3>
                  <p className="text-muted-foreground">Your completed repairs will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedBookings.map((booking) => (
                  <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-semibold text-lg">{booking.device}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1 capitalize">{booking.status}</span>
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Issue</p>
                                <p className="font-medium">{booking.issue}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Agent</p>
                                <p className="font-medium">{booking.agent}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Completed Date</p>
                                <p className="font-medium text-green-600">
                                  {booking.completedDate ? new Date(booking.completedDate).toLocaleDateString() : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Service Type</p>
                                <p className="font-medium">{booking.serviceType}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 min-w-[200px]">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{formatGBP(booking.amount)}</p>
                              <p className="text-sm text-muted-foreground">Booking ID: {booking.id}</p>
                            </div>

                            <div className="space-y-2">
                              <Button variant="outline" className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Download Invoice
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Star className="h-4 w-4 mr-2" />
                                Write Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

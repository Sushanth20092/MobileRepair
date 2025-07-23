"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Smartphone,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  MessageCircle,
  Star,
  LogOut,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { apiGet } from "@/lib/api"
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

export default function CustomerProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<any>("/bookings")
      .then((data) => {
        setBookings(data.bookings || [])
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load bookings")
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back to Homepage Button */}
        <div className="mb-2">
          <Button variant="ghost" onClick={() => router.push("/")}> 
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Homepage
          </Button>
        </div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your profile and device repairs</p>
          </div>
          <div className="flex gap-2">
            <Link href="/customer/book-repair">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Book New Repair
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Repairs</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Repairs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.filter((b) => b.status !== "completed").length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.filter((b) => b.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground">Successfully repaired</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <span className="h-4 w-4 text-muted-foreground">£</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{bookings.reduce((sum, booking) => sum + booking.amount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All repairs</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Your Repairs</CardTitle>
            <CardDescription>Track and manage your device repairs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList>
                <TabsTrigger value="active">Active Repairs ({bookings.filter((b) => b.status !== "completed").length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({bookings.filter((b) => b.status === "completed").length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {bookings.filter((b) => b.status !== "completed").length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No active repairs</h3>
                    <p className="text-muted-foreground mb-4">Book a repair to get started</p>
                    <Link href="/customer/book-repair">
                      <Button>Book New Repair</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.filter((b) => b.status !== "completed").map((booking) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{booking.device}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1 capitalize">{booking.status.replace("-", " ")}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Issue:</strong> {booking.issue}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Agent:</strong> {booking.agent}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Service:</strong> {booking.serviceType}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Booked: {new Date(booking.date).toLocaleDateString()}
                              </span>
                              {booking.estimatedCompletion && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Est. completion: {new Date(booking.estimatedCompletion).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="text-right mb-2 sm:mb-0">
                              <p className="font-semibold">£{booking.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Booking ID: {booking.id}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat
                              </Button>
                              <Button size="sm" variant="outline">
                                Track
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {bookings.filter((b) => b.status === "completed").length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No completed repairs</h3>
                    <p className="text-muted-foreground">Your completed repairs will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.filter((b) => b.status === "completed").map((booking) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{booking.device}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1 capitalize">{booking.status}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Issue:</strong> {booking.issue}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Agent:</strong> {booking.agent}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Completed: {booking.completedDate ? new Date(booking.completedDate).toLocaleDateString() : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="text-right mb-2 sm:mb-0">
                              <p className="font-semibold">£{booking.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Booking ID: {booking.id}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Invoice
                              </Button>
                              <Button size="sm" variant="outline">
                                <Star className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 
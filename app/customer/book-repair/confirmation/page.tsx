"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Download, MessageCircle, ArrowRight, Home } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/api"

export default function BookingConfirmation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [booking, setBooking] = useState<any>(null)

  // For now, use mock data. In real use, get from searchParams or state
  const bookingId = searchParams.get("bookingId") || "BOOK123456"

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return
      const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single()
      setBooking(data)
    }
    fetchBooking()
  }, [bookingId])

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingId)
    toast({ title: "Copied!", description: "Booking ID copied to clipboard." })
  }

  const handleDownloadInvoice = () => {
    toast({ title: "Download", description: "Invoice download coming soon!" })
  }

  const handleTrackOrder = () => {
    toast({ title: "Track Order", description: "Order tracking coming soon!" })
  }

  const handleChatSupport = () => {
    toast({ title: "Chat Support", description: "Chat support coming soon!" })
  }

  const handleReturnDashboard = () => {
    router.push("/customer/dashboard")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-lg shadow-xl border-2 border-primary/30">
        <CardHeader className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="rounded-full bg-primary/10 p-4 mb-2"
          >
            <ArrowRight className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-2xl font-bold text-primary text-center">
            Booking Confirmed!
          </CardTitle>
          <div className="text-muted-foreground text-center">
            Thank you for booking with us. Your booking ID is:
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-lg font-semibold text-primary">{bookingId}</span>
            <Button size="icon" variant="ghost" onClick={handleCopy} aria-label="Copy Booking ID">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
          <div className="bg-secondary rounded-lg p-4">
            <div className="font-semibold mb-1">Booking Details</div>
            <div className="text-sm text-muted-foreground">
              <div><b>Device:</b> {booking?.device}</div>
              <div><b>Issue:</b> {booking?.issue}</div>
              <div><b>Service:</b> {booking?.serviceType}</div>
              <div><b>Address:</b> {booking?.address}</div>
              <div><b>Date:</b> {booking?.date}</div>
              <div><b>Time:</b> {booking?.time}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <Button variant="outline" onClick={handleDownloadInvoice}>
              <Download className="h-4 w-4 mr-2" /> Download Invoice
            </Button>
            <Button variant="outline" onClick={handleTrackOrder}>
              <ArrowRight className="h-4 w-4 mr-2" /> Track Order
            </Button>
            <Button variant="outline" onClick={handleChatSupport}>
              <MessageCircle className="h-4 w-4 mr-2" /> Chat Support
            </Button>
            <Button variant="default" onClick={handleReturnDashboard}>
              <Home className="h-4 w-4 mr-2" /> Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 
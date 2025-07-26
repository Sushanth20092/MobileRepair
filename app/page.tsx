"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Tablet, Headphones, Watch, Zap, Shield, Clock, Star, Moon, Sun, Bell, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { trackApiCall } from "@/lib/performance"
import LoadingSpinner from "@/components/LoadingSpinner"
import { SkeletonCard } from "@/components/SkeletonLoader"

// Lazy load non-critical components
const NotificationDropdown = lazy(() => import('@/components/NotificationDropdown'))
const ServicesSection = lazy(() => import('@/components/ServicesSection'))
const HowItWorksSection = lazy(() => import('@/components/HowItWorksSection'))
const CTASection = lazy(() => import('@/components/CTASection'))
const Footer = lazy(() => import('@/components/Footer'))

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

// Cache for cities data
let citiesCache: { id: string, name: string, pincodes?: string[] }[] | null = null
let citiesCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const services = [
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: "Mobile Repair",
    description: "Screen replacement, battery issues, water damage repair",
    features: ["Screen Replacement", "Battery Replacement", "Water Damage", "Software Issues"],
  },
  {
    icon: <Tablet className="h-8 w-8" />,
    title: "Tablet Repair",
    description: "iPad and Android tablet repairs",
    features: ["Screen Repair", "Charging Port", "Speaker Issues", "Performance Optimization"],
  },
  {
    icon: <Headphones className="h-8 w-8" />,
    title: "Audio Devices",
    description: "Headphones, earbuds, and speaker repairs",
    features: ["Audio Quality", "Connectivity", "Battery Life", "Physical Damage"],
  },
  {
    icon: <Watch className="h-8 w-8" />,
    title: "Smartwatch Repair",
    description: "Apple Watch, Samsung Galaxy Watch repairs",
    features: ["Screen Replacement", "Battery Issues", "Water Resistance", "Strap Replacement"],
  },
]

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [cities, setCities] = useState<{ id: string, name: string, pincodes?: string[] }[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [isRepairButtonLoading, setIsRepairButtonLoading] = useState(false)
  const [isAgentButtonLoading, setIsAgentButtonLoading] = useState(false)

  // Optimized cities fetching with caching
  const fetchCities = async () => {
    try {
      // Check cache first
      if (citiesCache && Date.now() - citiesCacheTime < CACHE_DURATION) {
        setCities(citiesCache)
        setCitiesLoading(false)
        return
      }

      const citiesData = await trackApiCall('fetch_cities', async () => {
        const response = await fetch('/api/cities')
        if (!response.ok) {
          throw new Error('Failed to fetch cities')
        }
        
        const result = await response.json()
        return result.data || []
      })
      
      setCities(citiesData)
      // Update cache
      citiesCache = citiesData
      citiesCacheTime = Date.now()
    } catch (err) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error loading cities",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      })
    } finally {
      setCitiesLoading(false)
    }
  }

  // Optimized notifications fetching
  const fetchNotifications = async () => {
    if (!user) return
    
    setNotifLoading(true)
    try {
      const result = await trackApiCall('fetch_notifications', async () => {
        const response = await fetch(`/api/notifications?userId=${user.id}&limit=7`)
        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }
        
        return await response.json()
      })
      
      setNotifications(result.data || [])
      setUnreadCount(result.unreadCount || 0)
    } catch (err) {
      console.error("Error fetching notifications:", err)
    } finally {
      setNotifLoading(false)
    }
  }

  // Debounced scroll handler
  const debouncedScrollToSection = debounce((sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }, 100)

  useEffect(() => {
    setMounted(true)
    fetchCities()
  }, [])

  useEffect(() => {
    if (user && notifOpen) {
      fetchNotifications()
    }
  }, [user, notifOpen])

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })
      
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleLoginRedirect = () => {
    router.push("/auth/login")
  }

  const handleRepairNow = async () => {
    if (isRepairButtonLoading) return // Prevent double clicks
    
    setIsRepairButtonLoading(true)
    try {
      if (!user) {
        router.push("/auth/login")
      } else if (user.role === 'admin') {
        router.push("/admin/dashboard")
      } else if (user.role === 'agent') {
        router.push("/agent/dashboard")
      } else {
        router.push("/customer/book-repair")
      }
    } finally {
      setIsRepairButtonLoading(false)
    }
  }

  const handleAgentApply = async () => {
    if (isAgentButtonLoading) return // Prevent double clicks
    
    setIsAgentButtonLoading(true)
    try {
      if (!user) {
        toast({
          title: "Please register or log in before applying to become an agent.",
          variant: "destructive",
        })
      } else {
        router.push("/agent/apply")
      }
    } finally {
      setIsAgentButtonLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Smartphone className="h-6 w-6" />
              <span className="font-bold text-xl">RepairHub</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => debouncedScrollToSection("services")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Our Services
            </button>
            <button
              onClick={() => debouncedScrollToSection("how-it-works")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => debouncedScrollToSection("contact")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            
            {user && user.role === 'user' && (
              <Suspense fallback={<LoadingSpinner />}>
                <NotificationDropdown
                  notifications={notifications}
                  unreadCount={unreadCount}
                  notifOpen={notifOpen}
                  notifLoading={notifLoading}
                  onToggle={() => setNotifOpen((o) => !o)}
                  onMarkAsRead={handleMarkAsRead}
                  onClose={() => setNotifOpen(false)}
                />
              </Suspense>
            )}
            
            {user ? (
              <>
                {user.role === 'user' && (
                  <Button asChild>
                    <Link href="/customer/profile">Profile</Link>
                  </Button>
                )}
                {(user.role === 'agent' || user.role === 'admin') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (user.role === 'agent') {
                        router.push("/agent/dashboard")
                      } else if (user.role === 'admin') {
                        router.push("/admin/dashboard")
                      }
                    }}
                  >
                    Dashboard
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={logout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={handleLoginRedirect}>
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional Mobile Device
              <span className="text-primary"> Repair Services</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Fast, reliable, and affordable repair services for all your mobile devices. Expert technicians, genuine
              parts, and warranty included.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <div className="flex flex-col items-center">
              <Select value="" onValueChange={() => {}}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={citiesLoading ? "Loading cities..." : "Available Cities"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="lg"
              className="px-8"
              onClick={handleRepairNow}
              disabled={isRepairButtonLoading}
            >
              {isRepairButtonLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isRepairButtonLoading ? "Loading..." : "Repair Now"}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              90 Day Warranty
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Same Day Service
            </div>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4" />
              4.9/5 Rating
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <Suspense fallback={
        <section className="py-20 px-4 bg-muted/50">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We repair all types of mobile devices with expert care and genuine parts
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </section>
      }>
        <ServicesSection services={services} />
      </Suspense>

      {/* How It Works Section */}
      <Suspense fallback={<LoadingSpinner />}>
        <HowItWorksSection />
      </Suspense>

      {/* CTA Section */}
      <Suspense fallback={<LoadingSpinner />}>
        <CTASection 
          user={user}
          onRepairNow={handleRepairNow}
          onAgentApply={handleAgentApply}
          isRepairButtonLoading={isRepairButtonLoading}
          isAgentButtonLoading={isAgentButtonLoading}
        />
      </Suspense>

      {/* Footer */}
      <Suspense fallback={<LoadingSpinner />}>
        <Footer />
      </Suspense>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Tablet, Headphones, Watch, Zap, Shield, Clock, Star, Moon, Sun, Bell } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { formatDistanceToNow } from "date-fns";

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    setMounted(true)
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase.from('cities').select('*')
        if (error) {
          console.error("Error fetching cities:", error)
        } else {
          setCities(data || [])
        }
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])

  useEffect(() => {
    if (!user) return;
    setNotifLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7)
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
        setNotifLoading(false);
      });
  }, [user, notifOpen]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleLoginRedirect = () => {
    router.push("/auth/login")
  }

  const handleRepairNow = () => {
    if (!user) {
      router.push("/auth/login")
    } else if (user.role === 'admin') {
      router.push("/admin/dashboard")
    } else if (user.role === 'agent') {
      router.push("/agent/dashboard")
    } else {
      router.push("/customer/book-repair")
    }
  }

  if (!mounted) return null

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
              onClick={() => scrollToSection("services")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Our Services
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("contact")}
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
              <div className="relative">
                <button
                  className="relative p-2 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6 text-gray-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {/* Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[95vw] bg-background border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-700 font-semibold text-gray-100 flex items-center justify-between bg-gray-900">
                      Notifications
                      <button className="text-xs text-muted-foreground hover:underline" onClick={() => setNotifOpen(false)}>Close</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-800 bg-gray-900">
                      {notifLoading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No notifications</div>
                      ) : notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 cursor-pointer hover:bg-gray-800 transition flex flex-col ${!n.is_read ? "bg-blue-900/30" : ""}`}
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                          <div className="font-medium text-gray-100 text-sm mb-1 line-clamp-1">{n.title}</div>
                          <div className="text-xs text-gray-300 mb-1 line-clamp-2">{n.message}</div>
                          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {user ? (
              <>
                {user.role === 'user' && (
                  <Button asChild>
                    <Link href="/customer/profile">Profile</Link>
                  </Button>
                )}
                {(user.role === 'agent' || user.role === 'admin') && (
                  <Button variant="outline" onClick={() => {
                    if (user.role === 'agent') {
                      router.push("/agent/dashboard")
                    } else if (user.role === 'admin') {
                      router.push("/admin/dashboard")
                    }
                  }}>Dashboard</Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    logout()
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLoginRedirect}
              >
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
            >
              <Zap className="mr-2 h-4 w-4" />
              Repair Now
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
      <section id="services" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We repair all types of mobile devices with expert care and genuine parts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-primary mb-4">{service.icon}</div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="mr-2 mb-2">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Simple steps to get your device repaired</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Book Online",
                description: "Select your device, describe the issue, and choose your preferred service option",
              },
              {
                step: "2",
                title: "Get It Fixed",
                description: "Our expert technicians diagnose and repair your device using genuine parts",
              },
              {
                step: "3",
                title: "Collect & Enjoy",
                description: "Pick up your repaired device or get it delivered to your doorstep",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Your Device Fixed?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied customers who trust us with their devices
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="px-8"
              onClick={handleRepairNow}
            >
              Start Repair Process
            </Button>
            {/* Restrict Join as Agent button to only 'user' role or not logged in */}
            {(!user || user.role === 'user') && (
              <Button
                size="lg"
                variant="outline"
                className="px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Please register or log in before applying to become an agent.",
                      variant: "destructive",
                    })
                  } else {
                    router.push("/agent/apply")
                  }
                }}
              >
                Join as Agent
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 bg-muted">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Smartphone className="h-6 w-6" />
                <span className="font-bold text-xl">RepairHub</span>
              </div>
              <p className="text-muted-foreground">
                Professional mobile device repair services with expert technicians and genuine parts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Mobile Repair</li>
                <li>Tablet Repair</li>
                <li>Audio Devices</li>
                <li>Smartwatch Repair</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Contact Us</li>
                <li>FAQ</li>
                <li>Warranty</li>
                <li>Track Repair</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>About Us</li>
                <li>Careers</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 RepairHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

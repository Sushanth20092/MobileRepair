"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Smartphone, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@supabase/supabase-js'

interface City {
  id: string
  name: string
  state: string
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, signup, forgotPassword, user } = useAuth()
  const { toast } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle URL parameters for messages
  useEffect(() => {
    const message = searchParams.get('message')
    
    if (message === 'password_reset_success') {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated successfully. Please login with your new password.",
      })
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (message === 'session_expired') {
      toast({
        title: "Session Expired",
        description: "Your password reset session has expired. Please login again.",
        variant: "destructive"
      })
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, toast])

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    role: "user",
  })

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
    agreeToTerms: false,
  })

  // Validate form fields
  const validateField = (name: string, value: string | boolean) => {
    let error = ""
    
    switch (name) {
      case "name":
        if (!value) error = "Full name is required"
        break
      case "email":
        if (!value) {
          error = "Email is required"
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value as string)) {
          error = "Invalid email address"
        }
        break
      case "phone":
        if (!value) {
          error = "Phone number is required"
        } else if (!/^[0-9]{10}$/.test(value as string)) {
          error = "Invalid phone number (10 digits required)"
        }
        break
      case "password":
        if (!value) {
          error = "Password is required"
        } else if ((value as string).length < 6) {
          error = "Password must be at least 6 characters"
        }
        break
      case "confirmPassword":
        if (value !== registerData.password) {
          error = "Passwords do not match"
        }
        break
      case "agreeToTerms":
        if (!value) error = "You must agree to the terms"
        break
    }
    
    return error
  }

  // Password validation helper
  function validatePassword(password: string): string {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return "";
  }

  // Handle field blur validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  // Handle select blur validation
  const handleSelectBlur = (name: string, value: string) => {
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  // Fetch cities on component mount
  // useEffect(() => {
  //   const fetchCities = async () => {
  //     try {
  //       const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  //       const response = await fetch(`${apiUrl}/api/cities/public`)
  //       if (response.ok) {
  //         const data = await response.json()
  //         setCities(data.cities || [])
  //       } else {
  //         console.error('Failed to fetch cities:', response.status, response.statusText)
  //       }
  //     } catch (error) {
  //       console.error('Error fetching cities:', error)
  //     }
  //   }
  //   fetchCities()
  // }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!loginData.email || !loginData.password) {
        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
        return
      }
      await login(loginData.email, loginData.password)
      toast({ title: "Success", description: "Logged in successfully" })

      // Always fetch the user's profile from the profiles table using the auth user id
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession()
      if (sessionError || !sessionData?.session?.user) {
        toast({ title: "Error", description: "Could not fetch user session", variant: "destructive" })
        return
      }
      const userId = sessionData.session.user.id
      const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', userId).single()
      if (profileError || !profile) {
        toast({ title: "Error", description: "Could not fetch user profile", variant: "destructive" })
        return
      }
      console.log('User role:', profile.role)
      if (profile.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (profile.role === 'agent') {
        // Check for unread agent_approved notification
        const { data: notifications, error: notifError } = await supabaseClient
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('is_read', false)
          .eq('type', 'agent_approved')
          .order('created_at', { ascending: false })
        if (!notifError && notifications && notifications.length > 0) {
          router.replace('/notifications/welcome')
        } else {
          router.replace('/agent/dashboard')
        }
      } else if (profile.role === 'user') {
        router.push('/')
      } else {
        router.push('/')
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Invalid credentials", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Validate all fields before submission
    const validationErrors: Record<string, string> = {}
    Object.entries(registerData).forEach(([key, value]) => {
      let error = "";
      if (key === "password") {
        error = validatePassword(value as string);
      } else if (key === "confirmPassword") {
        if ((value as string) !== registerData.password) {
          error = "Passwords do not match";
        }
      } else {
        error = validateField(key, value);
      }
      if (error) validationErrors[key] = error;
    })
    
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length > 0) {
      setIsLoading(false)
      return
    }
    
    try {
      // Check for unique email and phone before registration
      const { data: emailExists } = await supabaseClient.from('profiles').select('id').eq('email', registerData.email).single();
      if (emailExists) {
        setErrors(prev => ({ ...prev, email: 'Email already in use' }));
        setIsLoading(false);
        return;
      }
      const { data: phoneExists } = await supabaseClient.from('profiles').select('id').eq('phone', registerData.phone).single();
      if (phoneExists) {
        setErrors(prev => ({ ...prev, phone: 'Phone number already in use' }));
        setIsLoading(false);
        return;
      }
      // Only send required fields to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          phone: registerData.phone,
          password: registerData.password,
          role: registerData.role,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 409) {
          toast({ 
            title: "Email Already Exists", 
            description: "An account with this email already exists. Please use a different email or try logging in.", 
            variant: "destructive" 
          })
          setActiveTab("login")
          setLoginData(prev => ({ ...prev, email: registerData.email }))
        } else {
          throw new Error(data.message || 'Registration failed')
        }
        return
      }

      toast({ 
        title: "Success", 
        description: "Account created! Please check your email to verify. You'll be redirected to the homepage after confirmation." 
      })
      setActiveTab("login")
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Registration failed. Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" })
      return
    }
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginData.email }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: "Success", description: "Password reset link has been sent to your email." })
      } else {
        toast({ title: "Error", description: data.message || "Failed to send reset email", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to send reset email. Please try again.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to RepairHub</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter your name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        onBlur={handleBlur}
                        required
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="Enter phone number"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        onBlur={handleBlur}
                        required
                      />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      onBlur={handleBlur}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          name="password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="Create password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          onBlur={handleBlur}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowRegisterPassword((v) => !v)}
                        >
                          {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          name="confirmPassword"
                          type={showRegisterConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          onBlur={handleBlur}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowRegisterConfirmPassword((v) => !v)}
                        >
                          {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      name="agreeToTerms"
                      checked={registerData.agreeToTerms}
                      onCheckedChange={(checked) => {
                        setRegisterData({ ...registerData, agreeToTerms: checked as boolean })
                        setErrors(prev => ({ ...prev, agreeToTerms: checked ? "" : "You must agree to the terms" }))
                      }}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>
                    </Label>
                  </div>
                  {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
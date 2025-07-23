"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Smartphone, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UpdatePasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [hasValidRecoverySession, setHasValidRecoverySession] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  // Check for valid recovery session on component mount
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // First, check if we have recovery tokens in URL (this is how Supabase sends recovery links)
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          // Try to set the session with the recovery tokens
          const { data: { session: recoverySession }, error: recoveryError } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (recoverySession && !recoveryError) {
            // Successfully set recovery session
            setHasValidRecoverySession(true)
          } else {
            console.error('Recovery session error:', recoveryError)
            setSessionExpired(true)
          }
        } else {
          // No tokens in URL - check if we already have a valid session
          const { data: { session }, error } = await supabaseClient.auth.getSession()
          
          if (error) {
            console.error('Session check error:', error)
            setSessionExpired(true)
            return
          }

          if (session?.user) {
            // We have a session - check if it's a valid recovery session
            // For recovery sessions, we typically have a user with email provider
            const isRecoverySession = session.user.app_metadata?.provider === 'email' && 
                                     session.user.aud === 'authenticated' &&
                                     session.access_token

            if (isRecoverySession) {
              setHasValidRecoverySession(true)
            } else {
              // User is logged in but not in recovery mode - sign them out and show expired message
              await supabaseClient.auth.signOut()
              setSessionExpired(true)
            }
          } else {
            // No session at all
            setSessionExpired(true)
          }
        }
      } catch (error) {
        console.error('Recovery session check error:', error)
        setSessionExpired(true)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkRecoverySession()
  }, [searchParams])

  // Handle session expired redirect
  useEffect(() => {
    if (sessionExpired && !isCheckingSession) {
      toast({
        title: "Session Expired",
        description: "Your password reset session has expired. Please try again.",
        variant: "destructive"
      })
      
      // Redirect after 2.5 seconds
      const timer = setTimeout(() => {
        router.replace('/auth/login')
      }, 2500)
      
      return () => clearTimeout(timer)
    }
  }, [sessionExpired, isCheckingSession, router, toast])

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
  const handleBlur = (field: string, value: string) => {
    let error = ""
    
    if (field === "password") {
      error = validatePassword(value)
    } else if (field === "confirmPassword") {
      if (value !== password) {
        error = "Passwords do not match"
      }
    }
    
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate passwords
    const passwordError = validatePassword(password)
    const confirmError = password !== confirmPassword ? "Passwords do not match" : ""
    
    if (passwordError || confirmError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmError
      })
      setIsLoading(false)
      return
    }

    try {
      // Update the user's password
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      })

      if (error) {
        throw new Error(error.message)
      }

      // Immediately sign out to clear the recovery session
      await supabaseClient.auth.signOut()

      // Show success message and redirect
      toast({
        title: "Success",
        description: "Password reset successfully. Please log in with your new password.",
      })

      // Redirect to login page
      router.replace('/auth/login')

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Loading...</CardTitle>
              <CardDescription>
                Please wait while we verify your reset link.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Show session expired message
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Session Expired</CardTitle>
              <CardDescription>
                Your password reset session has expired. Redirecting you to the login page...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.replace('/auth/login')} className="w-full">
                Go to Login Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Don't show the form if no valid recovery session
  if (!hasValidRecoverySession) {
    return null
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Password Updated!</CardTitle>
              <CardDescription>
                Your password has been successfully updated. You will be redirected to the login page shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push('/auth/login')} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
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
          <Link href="/auth/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={(e) => handleBlur("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={(e) => handleBlur("confirmPassword", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 
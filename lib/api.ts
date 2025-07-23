import { createClient } from '@supabase/supabase-js'
import { toast } from "@/hooks/use-toast";

// Make sure to create a 'booking-images' storage bucket in Supabase for image uploads to work.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export async function apiGet<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiPost<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * Robust registration handler for Supabase Auth (email/password).
 * Handles all edge cases: first signup, re-signup before verification, expired email, and prevents verified re-registration.
 * Shows user-friendly toasts for all outcomes.
 */
export async function handleRegister(email: string, password: string): Promise<void> {
  try {
    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    // If signUp fails
    if (error) {
      // Edge case: User already registered
      if (error.message && error.message.toLowerCase().includes("user already registered")) {
        // Try to resend verification email
        const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
        if (resendError) {
          toast({
            title: "Account already exists.",
            description: resendError.message || "Please log in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "You’ve already signed up.",
            description: "We’ve re-sent the verification email.",
            variant: "default",
          });
        }
        return;
      }
      // Other errors
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // If signUp succeeds, check if email is confirmed
    // Supabase v2: data.user may be null if confirmation required
    if (data.user) {
      // If user is returned and email is confirmed
      if (data.user.email_confirmed_at) {
        toast({
          title: "Email already in use.",
          description: "Please log in.",
          variant: "destructive",
        });
        return;
      }
    }

    // If user is not confirmed, resend email just in case
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) {
      toast({
        title: "Signup successful!",
        description: "Please check your email to verify your account.",
        variant: "default",
      });
    } else {
      toast({
        title: "Verification email re-sent.",
        description: "Please check your inbox.",
        variant: "default",
      });
    }
  } catch (err: any) {
    toast({
      title: "Registration error",
      description: err?.message || "Something went wrong. Please try again.",
      variant: "destructive",
    });
  }
} 
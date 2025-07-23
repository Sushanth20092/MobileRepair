import { supabase } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/**
 * Robust registration handler for Supabase Auth (email/password).
 * Handles all edge cases: first signup, re-signup before verification, expired email, and prevents verified re-registration.
 * Shows user-friendly toasts for all outcomes.
 */
export async function handleRegister(email: string, password: string): Promise<void> {
  try {
    // 1. Try to register the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    // 2. If error: "User already registered"
    if (error) {
      if (error.message && error.message.toLowerCase().includes("user already registered")) {
        // Resend verification email
        const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
        if (resendError) {
          toast({
            title: "Account already exists.",
            description: resendError.message || "Please log in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "You've already signed up.",
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

    // 3. If signUp succeeds, but email is not confirmed
    if (data.user && !data.user.email_confirmed_at) {
      // Resend verification email just in case
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
      return;
    }

    // 4. If email is already confirmed
    if (data.user && data.user.email_confirmed_at) {
      toast({
        title: "Email already in use.",
        description: "Please log in.",
        variant: "destructive",
      });
      return;
    }

    // 5. If everything is fresh and successful
    toast({
      title: "Signup successful!",
      description: "Please check your email to verify your account.",
      variant: "default",
    });
  } catch (err: any) {
    toast({
      title: "Registration error",
      description: err?.message || "Something went wrong. Please try again.",
      variant: "destructive",
    });
  }
} 
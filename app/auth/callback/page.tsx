"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Home } from "lucide-react";
import { supabase } from "@/lib/api";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check if there are any error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Email verification failed. Please try again.');
          return;
        }

        // If no error, assume success
        setStatus('success');
        setMessage('Email confirmed successfully!');

        // Try to get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session?.user) {
          // Not logged in or session missing, redirect to login after short delay
          setTimeout(() => {
            router.replace("/auth/login");
          }, 2000);
          return;
        }
        const userId = sessionData.session.user.id;
        const userEmail = sessionData.session.user.email;
        // Fetch the user's profile to get their role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (profileError || !profile?.role) {
          setTimeout(() => {
            router.replace("/auth/login");
          }, 2000);
          return;
        }
        // Redirect based on role
        let redirectPath = "/";
        if (profile.role === 'admin') {
          redirectPath = "/admin/dashboard";
        } else if (profile.role === 'agent') {
          redirectPath = "/agent/dashboard";
        } else if (profile.role === 'user' || profile.role === 'customer') {
          // Support both 'user' and 'customer' as possible role names
          redirectPath = "/";
        }
        setTimeout(() => {
          router.replace(redirectPath);
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [router, searchParams]);

  const handleManualRedirect = () => {
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <div className="h-12 w-12 text-red-500 text-4xl">⚠️</div>}
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Confirmed!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">{message}</p>
          {status === 'success' && (
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to your dashboard...
            </p>
          )}
          {status === 'error' && (
            <Button onClick={handleManualRedirect} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
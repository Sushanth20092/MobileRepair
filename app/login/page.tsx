"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Preserve any query parameters when redirecting
    const params = new URLSearchParams(searchParams.toString())
    const redirectUrl = `/auth/login${params.toString() ? `?${params.toString()}` : ''}`
    router.replace(redirectUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">Please wait while we redirect you to the login page.</p>
      </div>
    </div>
  )
} 
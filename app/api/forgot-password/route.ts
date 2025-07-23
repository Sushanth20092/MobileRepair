import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      )
    }

    // Check if email exists and is verified in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_verified')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      // Don't expose whether the account exists or not
      return NextResponse.json(
        { success: true, message: "Password reset link has been sent to your email." },
        { status: 200 }
      )
    }

    // Check if the account is verified
    if (!profile.is_verified) {
      // Don't expose whether the account exists or not
      return NextResponse.json(
        { success: true, message: "Password reset link has been sent to your email." },
        { status: 200 }
      )
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      return NextResponse.json(
        { success: false, message: "Failed to send password reset email. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: "Password reset link has been sent to your email." },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
} 
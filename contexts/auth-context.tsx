"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/api"

type Role = "user" | "agent" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

interface AuthContextProps {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (data: { name: string; email: string; password: string; role: Role }) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Helper function to fetch user profile from profiles table
  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', userId)
        .single()
      
      if (error || !profile) {
        console.error('Error fetching user profile:', error)
        return null
      }
      
      return {
        id: userId,
        name: profile.name || "",
        email: email,
        role: profile.role as Role,
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { id, email } = session.user
        const userProfile = await fetchUserProfile(id, email!)
        if (userProfile) {
          setUser(userProfile)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    })
    
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { id, email } = session.user
        const userProfile = await fetchUserProfile(id, email!)
        if (userProfile) {
          setUser(userProfile)
        }
      }
    })
    
    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signup = async ({ name, email, password, role }: { name: string; email: string; password: string; role: Role }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    })
    if (error) throw new Error(error.message)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : undefined,
    })
    if (error) throw new Error(error.message)
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, forgotPassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

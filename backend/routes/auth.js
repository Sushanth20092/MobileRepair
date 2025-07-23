/* eslint-disable @typescript-eslint/no-var-requires */
const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const { registerValidation } = require("../middleware/validation")
const router = express.Router()
const bcrypt = require('bcryptjs')

// Test endpoint to debug registration
router.post("/test-register", async (req, res) => {
  try {
    const { name, email, phone, password, city_id, role = "user" } = req.body
    
    console.log('Test registration with data:', { name, email, phone, city_id, role })
    
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from("cities")
      .select("id, name")
      .eq("id", city_id)
      .single()
    
    if (testError) {
      console.error('City lookup error:', testError)
      return res.status(400).json({ message: "Invalid city_id", error: testError.message })
    }
    
    console.log('City found:', testData)
    
    // Test user creation without email confirmation
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role, city_id }
    })
    
    if (error) {
      console.error('User creation error:', error)
      return res.status(400).json({ message: error.message })
    }
    
    console.log('Test user created:', data.user?.id)
    
    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return res.status(400).json({ 
        message: "User created but profile not found", 
        userId: data.user.id,
        error: profileError.message 
      })
    }
    
    console.log('Profile found:', profile)
    
    res.json({ 
      message: "Test registration successful", 
      user: data.user,
      profile: profile 
    })
  } catch (error) {
    console.error('Test registration error:', error)
    res.status(500).json({ message: "Test registration failed", error: error.message })
  }
})

// Register
router.post("/register", registerValidation, async (req, res) => {
  try {
    const { name, email, phone, password, city_id, role = "user" } = req.body
    
    // Validate required fields (city_id is now optional)
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        message: "Missing required fields: name, email, phone, password" 
      })
    }

    // Validate role
    const validRoles = ['user', 'agent', 'admin']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      })
    }

    // Check if email already exists in profiles table
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing email:', checkError)
      return res.status(500).json({ 
        message: "Error checking email availability. Please try again." 
      })
    }
    
    if (existingProfile) {
      return res.status(409).json({ 
        message: "An account with this email already exists. Please use a different email or try logging in." 
      })
    }

    // Hash the password before storing (using bcrypt)
    const hashedPassword = await bcrypt.hash(password, 12)
    
    console.log('Attempting to register user:', { email, name, phone, city_id, role })
    
    // Register user in Supabase Auth, include city_id in user metadata only if present
    const userMetadata = { name, phone, role }
    if (city_id) userMetadata.city_id = city_id
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
      options: { 
        data: userMetadata,
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`
      }
  })
    
    if (error) {
      console.error('Supabase auth error:', error)
      return res.status(400).json({ message: error.message })
    }
    
    console.log('User registered successfully in Supabase Auth:', data.user?.id)
    
    // Wait a moment for the trigger to execute, then check if profile was created
    setTimeout(async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
        
        if (profileError) {
          console.error('Profile not found after trigger, attempting manual creation:', profileError)
          // Manual fallback: create profile manually
          const profileInsert = {
              id: data.user.id,
              name: name,
              phone: phone,
              role: role,
            is_verified: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              password: hashedPassword,
              addresses: '[]',
              email: email
          }
          if (city_id) profileInsert.city_id = city_id
          const { error: insertError } = await supabase
            .from("profiles")
            .insert([profileInsert])
          if (insertError) {
            console.error('Manual profile creation failed:', insertError)
          } else {
            console.log('Manual profile creation successful')
          }
        } else {
          console.log('Profile created successfully by trigger:', profile)
        }
      } catch (error) {
        console.error('Error checking/creating profile:', error)
      }
    }, 2000)
    
    // No manual insert into profiles table here; Supabase trigger will handle it
    res.status(201).json({ 
      message: "User registered. Please check your email to verify your account.",
      userId: data.user?.id 
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ 
      message: "Internal server error during registration. Please try again." 
    })
  }
})

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(400).json({ message: error.message })
  res.json({ message: "Login successful", session: data.session, user: data.user })
})

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ message: "Password reset email sent" })
})

// Get current user
router.get("/me", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "No token provided" })
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return res.status(401).json({ message: error.message })
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("*").eq("id", data.user.id).single()
  if (profileError) return res.status(400).json({ message: profileError.message })
  res.json({ user: { ...data.user, ...profile } })
})

module.exports = router


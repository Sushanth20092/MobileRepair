// TODO: This route needs to be refactored for Supabase. All references to 'User', 'Booking', and 'auth' have been removed/commented out.
const express = require("express")
// const User = require("../models/User")
// const Booking = require("../models/Booking")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Get user profile
router.get("/profile", auth, async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", req.user.id).single()
  if (error) return res.status(400).json({ message: error.message })
  res.json({ profile: data })
})

// All route logic removed. Please implement Supabase logic here.

module.exports = router

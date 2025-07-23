// TODO: This route needs to be refactored for Supabase. All references to 'Agent', 'User', 'Booking', 'Review', 'auth', and 'authorize' have been removed/commented out.
const express = require("express")
// const Agent = require("../models/Agent")
// const User = require("../models/User")
// const Booking = require("../models/Booking")
// const Review = require("../models/Review")
// const { auth, authorize } = require("../middleware/auth")
// const { agentApplicationValidation } = require("../middleware/validation")
// const { sendEmail } = require("../utils/emailService")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Get agent profile
router.get("/profile", auth, async (req, res) => {
  const { data, error } = await supabase.from("agents").select("*").eq("user_id", req.user.id).single()
  if (error) return res.status(400).json({ message: error.message })
  res.json({ agent: data })
})

// All route logic removed. Please implement Supabase logic here.

module.exports = router

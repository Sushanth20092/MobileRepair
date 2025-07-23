// TODO: This route needs to be refactored for Supabase. All references to 'Booking', 'Device', 'Agent', 'City', 'Chat', 'auth', and 'authorize' have been removed/commented out.
const express = require("express")
// const Booking = require("../models/Booking")
// const Device = require("../models/Device")
// const Agent = require("../models/Agent")
// const City = require("../models/City")
// const Chat = require("../models/Chat")
// const { auth, authorize } = require("../middleware/auth")
// const { bookingValidation } = require("../middleware/validation")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Create a booking
router.post("/", auth, async (req, res) => {
  const booking = { ...req.body, user_id: req.user.id }
  const { data, error } = await supabase.from("bookings").insert([booking]).select().single()
  if (error) return res.status(400).json({ message: error.message })
  res.status(201).json({ booking: data })
})

// All route logic removed. Please implement Supabase logic here.

module.exports = router

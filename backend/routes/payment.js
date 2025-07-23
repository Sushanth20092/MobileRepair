const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Update payment status for a booking
router.post("/update-status", auth, async (req, res) => {
  const { booking_id, payment_status } = req.body
  const { data, error } = await supabase.from("bookings").update({ payment_status }).eq("id", booking_id).select().single()
  if (error) return res.status(400).json({ message: error.message })
  res.json({ booking: data })
})

module.exports = router

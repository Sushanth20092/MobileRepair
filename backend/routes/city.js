const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Get all cities (public endpoint for registration)
router.get("/public", async (req, res) => {
  const { data, error } = await supabase.from("cities").select("*").eq("is_active", true)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ cities: data })
})

// Get all cities
router.get("/", auth, async (req, res) => {
  const { data, error } = await supabase.from("cities").select("*")
  if (error) return res.status(400).json({ message: error.message })
  res.json({ cities: data })
})

// Get city by ID
router.get("/:id", auth, async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from("cities").select("*").eq("id", id).single()
  if (error) return res.status(404).json({ message: error.message })
  res.json({ city: data })
})

// Validate pincode
router.get("/validate-pincode/:pincode", auth, async (req, res) => {
  const { pincode } = req.params
  const { data: city, error } = await supabase
    .from("cities")
    .select("*")
    .contains("pincodes", [pincode])
    .eq("is_active", true)
    .maybeSingle()
  if (error || !city) {
    return res.status(404).json({
      message: "Service not available in this pincode",
      available: false,
    })
  }
  res.json({
    available: true,
    city: {
      id: city.id,
      name: city.name,
      state: city.state,
      delivery_charges_standard: city.delivery_charges_standard,
      delivery_charges_express: city.delivery_charges_express,
    },
  })
})

module.exports = router

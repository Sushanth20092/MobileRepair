const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Get device categories
router.get("/categories", async (req, res) => {
  const { data, error } = await supabase.from("categories").select("*")
  if (error) return res.status(400).json({ message: error.message })
  res.json({ categories: data })
})

// Get brands by category
router.get("/brands/:category", auth, async (req, res) => {
  const { category } = req.params
  const { data, error } = await supabase.from("devices").select("brand").eq("category", category).neq("is_active", false)
  if (error) return res.status(400).json({ message: error.message })
  const brands = [...new Set(data.map(d => d.brand))]
  res.json({ brands })
})

// Get models by category
router.get("/models/:category_id", auth, async (req, res) => {
  const { category_id } = req.params
  const { data, error } = await supabase.from("brands").select("*").eq("category_id", category_id)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ models: data })
})

// Search devices
router.get("/search", auth, async (req, res) => {
  const { query } = req.query
  if (!query) return res.status(400).json({ message: "Query parameter required" })
  const { data, error } = await supabase.from("devices").select("*").or(`brand.ilike.%${query}%,model.ilike.%${query}%`).neq("is_active", false).limit(20)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ devices: data })
})

module.exports = router

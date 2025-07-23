const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Create a review
router.post("/", auth, async (req, res) => {
  const { booking_id, agent_id, rating, comment } = req.body
  const { data, error } = await supabase.from("reviews").insert([
    { booking_id, user_id: req.user.id, agent_id, rating, comment }
  ]).select().single()
  if (error) return res.status(400).json({ message: error.message })
  res.status(201).json({ review: data })
})

// Get reviews for a booking
router.get("/booking/:bookingId", async (req, res) => {
  const { bookingId } = req.params
  const { data: review, error } = await supabase
    .from("reviews")
    .select("*, user:profiles(name), agent:profiles(name)")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (error) return res.status(500).json({ message: error.message })
  res.json({ review })
})

// Get reviews for an agent
router.get("/agent/:agentId", async (req, res) => {
  const { agentId } = req.params
  const { page = 1, limit = 10 } = req.query
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data: reviews, error, count } = await supabase
    .from("reviews")
    .select("*, user:profiles(name), booking:bookings(id, device_id)", { count: "exact" })
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .range(from, to)
  if (error) return res.status(500).json({ message: error.message })

  // Get rating distribution
  const { data: ratingDistribution, error: distError } = await supabase
    .from("reviews")
    .select("rating, count:rating")
    .eq("agent_id", agentId)
    .group("rating")

  res.json({
    reviews,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count,
    ratingDistribution: ratingDistribution || [],
  })
})

// Get user's reviews
router.get("/my-reviews", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "No token provided" })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError) return res.status(401).json({ message: userError.message })

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*, booking:bookings(id, device_id), agent:profiles(name)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ message: error.message })
  res.json({ reviews })
})

module.exports = router

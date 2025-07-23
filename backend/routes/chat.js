const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Example: Get all chats for user
router.get("/", auth, async (req, res) => {
  const { data, error } = await supabase.from("chats").select("*").eq("user_id", req.user.id)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ chats: data })
})

module.exports = router

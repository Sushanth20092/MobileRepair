const { supabase } = require("../supabaseClient")

// Authentication middleware
async function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "No token provided" })
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return res.status(401).json({ message: error.message })
  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("*").eq("id", data.user.id).single()
  if (profileError) return res.status(401).json({ message: profileError.message })
  req.user = { ...data.user, ...profile }
  next()
}

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  }
}

module.exports = { auth, authorize } 
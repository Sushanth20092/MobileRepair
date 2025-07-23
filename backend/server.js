const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const morgan = require("morgan")
require("dotenv").config()

// const connectDB = require("./config/database")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const agentRoutes = require("./routes/agent")
const adminRoutes = require("./routes/admin")
const bookingRoutes = require("./routes/booking")
const deviceRoutes = require("./routes/device")
const cityRoutes = require("./routes/city")
const reviewRoutes = require("./routes/review")
const paymentRoutes = require("./routes/payment")
const uploadRoutes = require("./routes/upload")
const { errorHandler } = require("./middleware/errorHandler")
// const socketHandler = require("./utils/socketHandler")

const app = express()
// const server = http.createServer(app)
// const io = socketIo(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// })

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Compression and logging
app.use(compression())
app.use(morgan("combined"))

// Socket.io setup (removed)
// socketHandler(io)
// app.set("io", io)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/agent", agentRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/devices", deviceRoutes)
app.use("/api/cities", cityRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/upload", uploadRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Server is running", timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app

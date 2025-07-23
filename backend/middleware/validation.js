const { body, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    })
  }
  next()
}

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("phone").isMobilePhone("en-IN").withMessage("Please provide a valid phone number"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  // city_id is now optional, so we remove its validation
  handleValidationErrors,
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
]

const bookingValidation = [
  // body("device").isUUID().withMessage("Valid device ID is required"),
  body("faults").isArray({ min: 1 }).withMessage("At least one fault must be selected"),
  body("serviceType")
    .isIn(["local_dropoff", "collection_delivery", "postal"])
    .withMessage("Valid service type is required"),
  body("duration").isIn(["express", "standard", "economy"]).withMessage("Valid duration is required"),
  // body("city").isUUID().withMessage("Valid city ID is required"),
  handleValidationErrors,
]

const agentApplicationValidation = [
  body("shopName").trim().isLength({ min: 2, max: 100 }).withMessage("Shop name must be between 2 and 100 characters"),
  body("shopAddress.street").trim().notEmpty().withMessage("Street address is required"),
  body("shopAddress.city").trim().notEmpty().withMessage("City is required"),
  body("shopAddress.pincode").isLength({ min: 6, max: 6 }).withMessage("Pincode must be 6 digits"),
  body("idProof").isIn(["aadhar", "pan", "driving_license", "passport"]).withMessage("Valid ID proof type is required"),
  handleValidationErrors,
]

module.exports = {
  registerValidation,
  loginValidation,
  bookingValidation,
  agentApplicationValidation,
  handleValidationErrors,
}

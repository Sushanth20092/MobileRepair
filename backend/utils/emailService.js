const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Mobile Repair Service" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent:", info.messageId)
    return info
  } catch (error) {
    console.error("Email sending error:", error)
    throw error
  }
}

module.exports = { sendEmail }

const express = require("express")
const multer = require("multer")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

const upload = multer({ storage: multer.memoryStorage() })

// Helper: Upload file buffer to Supabase Storage
async function uploadToSupabaseStorage(file, folder = "mobile-repair") {
  const fileExt = file.originalname.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
  const { data, error } = await supabase.storage.from("images").upload(fileName, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  })
  if (error) throw error
  const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileName)
  return { url: publicUrlData.publicUrl, path: fileName }
}

// Upload multiple images (max 5)
router.post("/images", auth, upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0 || req.files.length > 5) {
      return res.status(400).json({ message: "Upload 1-5 images only" })
    }
    const imageUrls = []
    for (const file of req.files) {
      const uploaded = await uploadToSupabaseStorage(file)
      imageUrls.push(uploaded)
    }
    res.json({ message: "Images uploaded successfully", images: imageUrls })
  } catch (error) {
    console.error("Upload images error:", error)
    res.status(500).json({ message: "Server error while uploading images" })
  }
})

// Upload single image
router.post("/image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }
    const uploaded = await uploadToSupabaseStorage(req.file)
    res.json({ message: "Image uploaded successfully", image: uploaded })
  } catch (error) {
    console.error("Upload image error:", error)
    res.status(500).json({ message: "Server error while uploading image" })
  }
})

// Delete image
router.delete("/image/:path", auth, async (req, res) => {
  try {
    const { path } = req.params
    const { error } = await supabase.storage.from("images").remove([path])
    if (error) throw error
    res.json({ message: "Image deleted successfully" })
  } catch (error) {
    console.error("Delete image error:", error)
    res.status(500).json({ message: "Server error while deleting image" })
  }
})

module.exports = router

// api/routes/contact.js
import express from "express";
import { contactForm } from "../controllers/contactController.js";

const router = express.Router();

/**
 * @route   POST /api/contact
 * @desc    Handle contact form submissions from the frontend
 * @access  Public
 */
router.post("/", async (req, res, next) => {
  try {
    await contactForm(req, res);
  } catch (error) {
    console.error("❌ Contact form submission error:", error);
    next(error);
  }
});

/**
 * @route   GET /api/contact/health
 * @desc    Simple health check for contact route
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Contact route operational",
    timestamp: new Date(),
  });
});

export default router;

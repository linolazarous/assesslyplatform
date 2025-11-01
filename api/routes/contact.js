import express from "express";
import ContactMessage from "../models/ContactMessage.js";

const router = express.Router();

// GET all contact messages (admin)
router.get("/", async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH to mark as read/responded
router.patch("/:id", async (req, res) => {
  try {
    const { status, responseNote } = req.body;
    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status, responseNote },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

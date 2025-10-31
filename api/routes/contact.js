import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Example: send email or save to DB
    console.log('📩 Contact form received:', { name, email, message });

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

export default router;

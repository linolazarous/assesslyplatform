// api/routes/contact.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ContactMessage from '../models/ContactMessage.js';

dotenv.config();
const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Save message in DB
    const savedMessage = await ContactMessage.create({ name, email, subject, message });

    // Configure mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Change if using another SMTP
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_RECEIVER || process.env.EMAIL_USER,
      subject: `[Assessly Contact] ${subject}`,
      text: `
You have a new contact message from Assessly:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

Received at: ${new Date().toLocaleString()}
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully. We’ll get back to you soon!',
      data: savedMessage
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

export default router;

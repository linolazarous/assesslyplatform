import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Configure your mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Or your SMTP service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: email,
      to: process.env.CONTACT_RECEIVER || 'support@assessly.com',
      subject: `[Contact Form] ${subject}`,
      text: `
      You have a new message from Assessly Contact Form:
      ---------------------------------
      Name: ${name}
      Email: ${email}
      Subject: ${subject}
      Message:
      ${message}
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

export default router;

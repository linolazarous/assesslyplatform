import nodemailer from "nodemailer";
import ContactMessage from "../models/ContactMessage.js";
import axios from "axios";

export const contactForm = async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ message: "All fields are required." });

  let newMessage;
  try {
    // ✅ Step 1: Save to DB
    newMessage = await ContactMessage.create({ name, email, message });

    // ✅ Step 2: Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Step 3: Compose Email
    const mailOptions = {
      from: `"Assessly Contact" <${process.env.SMTP_USER}>`,
      to: "admin@assessly.com",
      subject: `📩 New Message from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2 style="color:#3b82f6;">New Contact Message</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Message:</b> ${message}</p>
          <p style="font-size:12px;color:#999;">Sent via Assessly Contact Form</p>
        </div>
      `,
    };

    // ✅ Step 4: Send email
    await transporter.sendMail(mailOptions);

    // ✅ Step 5: Update DB status
    newMessage.status = "sent";
    await newMessage.save();

    // ✅ Step 6: Optional Webhook notification
    if (process.env.CONTACT_WEBHOOK_URL) {
      await axios.post(process.env.CONTACT_WEBHOOK_URL, {
        event: "contact_message_sent",
        data: { id: newMessage._id, name, email, message },
      });
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully.",
      id: newMessage._id,
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    if (newMessage) {
      newMessage.status = "failed";
      await newMessage.save();
    }
    res.status(500).json({
      message: "Failed to send message.",
      error: error.message,
    });
  }
};

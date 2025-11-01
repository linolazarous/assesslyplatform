import nodemailer from "nodemailer";

/**
 * @desc Handle contact form submission
 * @route POST /api/contact
 * @access Public
 */
export const contactForm = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // ─────────────────────────────────────────────
    // Basic input validation
    // ─────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ─────────────────────────────────────────────
    // Ensure SMTP credentials exist
    // ─────────────────────────────────────────────
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("❌ Missing SMTP credentials in environment variables");
      return res.status(500).json({
        message: "Email configuration error. Please contact support.",
      });
    }

    // ─────────────────────────────────────────────
    // Configure Nodemailer Transport
    // ─────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for others
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allows Render/Cloud emails through
      },
    });

    // ─────────────────────────────────────────────
    // Compose the email
    // ─────────────────────────────────────────────
    const mailOptions = {
      from: `"Assessly Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_RECEIVER || "admin@assessly.com",
      subject: `📩 New Message from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;background:#f8f9fa;padding:20px;border-radius:8px;">
          <h2 style="color:#1976d2;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:4px solid #1976d2;padding-left:10px;color:#333;">
            ${message}
          </blockquote>
          <hr style="margin-top:20px;border:none;border-top:1px solid #ddd;" />
          <p style="font-size:12px;color:#999;">This email was automatically sent from the Assessly contact page.</p>
        </div>
      `,
    };

    // ─────────────────────────────────────────────
    // Send email
    // ─────────────────────────────────────────────
    await transporter.sendMail(mailOptions);

    console.log(`📨 Contact form email sent from: ${email}`);
    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send your message. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

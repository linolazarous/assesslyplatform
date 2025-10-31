import nodemailer from "nodemailer";

export const contactForm = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // or your custom SMTP host
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER, // your email
        pass: process.env.SMTP_PASS, // app password
      },
    });

    // ✅ Compose the email content
    const mailOptions = {
      from: `"Assessly Contact Form" <${process.env.SMTP_USER}>`,
      to: "admin@assessly.com", // 👈 your receiving address
      subject: `📩 New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="color:#1976d2;">New Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:4px solid #1976d2;padding-left:10px;">
            ${message}
          </blockquote>
          <hr/>
          <p style="font-size:12px;color:#999;">This message was sent via Assessly Contact Page</p>
        </div>
      `,
    };

    // ✅ Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return res.status(500).json({
      message: "Failed to send your message. Please try again later.",
      error: error.message,
    });
  }
};

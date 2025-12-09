// api/utils/mailer.js
import nodemailer from "nodemailer";

class MailerService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.stats = {
      sent: 0,
      failed: 0,
      lastError: null,
      lastSuccess: null,
    };

    this.init();
  }

  async init() {
    const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
    const missing = required.filter((v) => !process.env[v]);

    if (missing.length) {
      console.warn(
        "⚠️ Email disabled — missing config:",
        missing.join(", ")
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure:
        process.env.SMTP_SECURE === "true" ||
        Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 15,
      maxMessages: 300,
    });

    try {
      await this.transporter.verify();
      this.isConfigured = true;
      console.log("📧 Email service ready");
    } catch (err) {
      console.error("❌ Email setup failed:", err.message);
    }
  }

  /**
   * Main Send Email Handler
   */
  async send(options) {
    if (!this.isConfigured) {
      return { success: false, skipped: true, error: "Email not configured" };
    }

    const { to, subject, html, text } = options;
    if (!to || !subject || (!html && !text)) {
      return { success: false, error: "Invalid email payload" };
    }

    try {
      const res = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `Assessly <${process.env.SMTP_USER}>`,
        ...options,
        text: text || this.htmlToText(html),
      });

      this.stats.sent++;
      this.stats.lastSuccess = new Date();
      console.log("📤 Email sent:", res.messageId);

      return { success: true, messageId: res.messageId };
    } catch (err) {
      this.stats.failed++;
      this.stats.lastError = err.message;
      console.error("❌ Email Error:", err.message);

      return { success: false, error: err.message };
    }
  }

  /**
   * Convert HTML → TXT fallback
   */
  htmlToText(html) {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  /**
   * Useful for Health Monitoring API
   */
  status() {
    return {
      configured: this.isConfigured,
      stats: this.stats,
    };
  }
}

export const mailer = new MailerService();

/**
 * Common Templates (Reusable)
 */
export const EmailTemplates = {
  contactConfirmation: ({ name, email, message }) => ({
    subject: `📩 Inquiry Received - Assessly`,
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Hello ${name},</h2>
        <p>We’ve received your inquiry. Our team will respond shortly.</p>
        <hr/>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <br/>
        <p>Thanks for contacting Assessly!</p>
      </div>
    `,
  }),
  welcome: ({ name, dashboardLink }) => ({
    subject: "🎉 Welcome to Assessly!",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Welcome ${name}!</h2>
        <p>Your account is now active.</p>
        <a href="${dashboardLink}" style="padding:10px 20px;background:#43a047;color:#fff;text-decoration:none;border-radius:5px;">Open Dashboard</a>
      </div>
    `,
  }),
};

export default mailer;

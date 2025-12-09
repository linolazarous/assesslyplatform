// api/utils/mailer.js
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    this.templatesPath = path.join(
      __dirname,
      "../services/templates/emails"
    );

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
   * Load and compile a Handlebars template
   */
  async loadTemplate(templateName, context = {}) {
    try {
      const templateFile = path.join(this.templatesPath, `${templateName}.hbs`);
      const content = await fs.readFile(templateFile, "utf-8");
      const compiled = handlebars.compile(content);
      return compiled(context);
    } catch (err) {
      console.error("❌ Template load error:", err.message);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Send email
   */
  async send({ to, subject, html, text, attachments = [] }) {
    if (!this.isConfigured) {
      return { success: false, skipped: true, error: "Email not configured" };
    }
    if (!to || !subject || (!html && !text)) {
      return { success: false, error: "Invalid email payload" };
    }

    try {
      const res = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `Assessly <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments,
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

  htmlToText(html) {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  status() {
    return {
      configured: this.isConfigured,
      stats: this.stats,
    };
  }
}

export const mailer = new MailerService();

/**
 * Common email templates using Handlebars files
 */
export const EmailTemplates = {
  userWelcome: async ({ name, dashboardLink }) => {
    const html = await mailer.loadTemplate("user-welcome", { name, dashboardLink });
    return { subject: "🎉 Welcome to Assessly!", html };
  },
  orgInvitation: async ({ name, orgName, inviteLink }) => {
    const html = await mailer.loadTemplate("organization-invitation", { name, orgName, inviteLink });
    return { subject: `📩 Invitation to join ${orgName}`, html };
  },
  passwordReset: async ({ name, resetLink }) => {
    const html = await mailer.loadTemplate("password-reset", { name, resetLink });
    return { subject: "🔑 Reset Your Password", html };
  },
};

export default mailer;

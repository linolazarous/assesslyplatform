// api/services/emailService.js
import nodemailer from "nodemailer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import handlebars from "handlebars";
import { fileURLToPath } from "url";

// Support ESM for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Templates folder
const templatesPath = path.join(__dirname, "templates/emails");

// Cache for .hbs file reading
const templateCache = new Map();

/**
 * Load a .hbs template file once and cache it
 */
const loadTemplate = (fileName) => {
  const filePath = path.join(templatesPath, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing email template: ${filePath}`);
    return "";
  }

  if (!templateCache.has(fileName)) {
    const content = fs.readFileSync(filePath, "utf8");
    templateCache.set(fileName, content);
  }

  return templateCache.get(fileName);
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.configureTransporter();
      await this.loadTemplates();
      this.initialized = true;
      console.log("📧 Email Service is ready");
    } catch (error) {
      console.error("❌ Email Service initialization failed:", error.message);
    }
  }

  async configureTransporter() {
    if (process.env.NODE_ENV === "production") {
      console.log("💼 Using Production SMTP");
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.log("🧪 Development Mode: Using Ethereal Testing");
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.table({
        ethereal_user: testAccount.user,
        ethereal_pass: testAccount.pass,
      });
    }
  }

  /**
   * Load all .hbs templates in /templates/emails
   */
  async loadTemplates() {
    try {
      await fsPromises.access(templatesPath);
    } catch {
      console.warn("⚠️ Templates folder missing. Loading fallback templates...");
      this.createFallbackTemplates();
      return;
    }

    try {
      const files = await fsPromises.readdir(templatesPath);
      const hbsFiles = files.filter((file) => file.endsWith(".hbs"));

      if (hbsFiles.length === 0)
        throw new Error("No .hbs templates found in folder.");

      for (const file of hbsFiles) {
        const name = path.basename(file, ".hbs");
        const content = loadTemplate(file);
        this.templates.set(name, handlebars.compile(content));
        console.log(`📄 Email template loaded: ${name}`);
      }
    } catch (err) {
      console.error("⚠️ Template loading failure → fallback mode:", err.message);
      this.createFallbackTemplates();
    }
  }

  /**
   * Minimal fallback templates if folder is missing
   */
  createFallbackTemplates() {
    const fallback = {
      "user-wwelcome": `<h1>Welcome, {{name}}</h1>`,
      "organization-invitation": `<h1>Join {{organizationName}}</h1>`,
      "password-reset": `<h1>Reset your password</h1>`,
    };

    Object.entries(fallback).forEach(([name, html]) => {
      this.templates.set(name, handlebars.compile(html));
      console.log(`⚙️ Fallback template loaded: ${name}`);
    });
  }

  /**
   * Send email using compiled templates
   */
  async sendEmail({ to, subject, template, context = {}, ...rest }) {
    await this.init();

    if (!this.initialized) {
      return { success: false, error: "Email service not initialized" };
    }
    if (!to || !subject || !template) {
      return { success: false, error: "Missing required email fields" };
    }

    const templateFn = this.templates.get(template);
    if (!templateFn) {
      return { success: false, error: `Template not found: ${template}` };
    }

    // Inject global fields automatically
    const html = templateFn({
      ...context,
      currentYear: new Date().getFullYear(),
      supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
      platformUrl: process.env.FRONTEND_URL || "https://example.com",
    });

    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || "No Reply <no-reply@example.com>",
        to,
        subject,
        html,
        ...rest,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("📤 Email Preview:", nodemailer.getTestMessageUrl(result));
      }

      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error("❌ Failed to send email:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check service health & SMTP connection
   */
  async healthCheck() {
    try {
      await this.init();
      await this.transporter.verify();
      return {
        healthy: true,
        provider: process.env.NODE_ENV === "production" ? "SMTP" : "Ethereal",
        templates: Array.from(this.templates.keys()),
      };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
export const sendEmail = emailService.sendEmail.bind(emailService);
export default emailService;

// api/services/emailService.js
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      console.log("📧 Email Service Ready");
    } catch (error) {
      console.error("❌ Email initialization failed:", error.message);
    }
  }

  async configureTransporter() {
    if (process.env.NODE_ENV === "production") {
      console.log("💼 Production email mode enabled");

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
      console.log("🧪 Development email mode (Ethereal)");

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

  async loadTemplates() {
    const templatesDir = path.resolve(__dirname, "../templates/emails");

    try {
      await fs.access(templatesDir); // ensure directory exists
    } catch {
      console.warn("⚠️ Email templates folder missing — creating fallback...");
      await fs.mkdir(templatesDir, { recursive: true });
      this.createFallbackTemplates();
      return;
    }

    try {
      const files = await fs.readdir(templatesDir);

      const hbsFiles = files.filter((f) => f.endsWith(".hbs"));
      if (hbsFiles.length === 0) throw new Error("No template files found");

      for (const file of hbsFiles) {
        const name = path.basename(file, ".hbs");
        const templateContent = await fs.readFile(
          path.join(templatesDir, file),
          "utf8"
        );
        this.templates.set(name, handlebars.compile(templateContent));
        console.log(`📄 Loaded email template: ${name}`);
      }
    } catch (error) {
      console.error("⚠️ Failed to load templates → fallback mode:", error.message);
      this.createFallbackTemplates();
    }
  }

  createFallbackTemplates() {
    const fallback = {
      "user-welcome": `<h1>Welcome {{name}} to {{organizationName}}</h1>
      <p>Your role: {{role}}</p>
      <p>Login: <a href="{{loginUrl}}">Access Platform</a></p>`,

      "organization-invitation": `<h1>You've been invited to {{organizationName}}</h1>
      <p>Role: {{role}}</p>
      <p><a href="{{invitationUrl}}">Accept Invitation</a></p>`,

      "contact-confirmation": `<h3>Hello {{name}}</h3>
      <p>Your message regarding "{{subject}}" has been received.</p>`,

      "password-reset": `<h1>Reset Password</h1>
      <p>Click: <a href="{{resetUrl}}">Reset Password</a></p>
      <p>Expires in: {{expiresIn}}</p>`,

      "subscription-invoice": `<h1>Invoice: {{invoiceNumber}}</h1>
      <p>Total: {{amount}}</p>
      <p>Due: {{dueDate}}</p>`
    };

    Object.entries(fallback).forEach(([name, html]) => {
      this.templates.set(name, handlebars.compile(html));
      console.log(`⚙️ Fallback template loaded: ${name}`);
    });
  }

  async sendEmail(options) {
    await this.init(); // ensure transporter & templates are ready

    if (!this.initialized) {
      return { success: false, error: "Email service not initialized" };
    }

    const { to, subject, template, context = {} } = options;

    if (!to || !subject || !template) {
      return { success: false, error: "Missing required email fields" };
    }

    const templateFn = this.templates.get(template);
    if (!templateFn) {
      return { success: false, error: `Template not found: ${template}` };
    }

    const html = templateFn({
      ...context,
      currentYear: new Date().getFullYear(),
      supportEmail: process.env.SUPPORT_EMAIL || "assesslyinc@gmail.com",
      platformUrl: process.env.FRONTEND_URL
        || "https://assessly-gedp.onrender.com",
    });

    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || "Assessly <no-reply@assessly.com>",
        ...options,
        html,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("📤 Email Preview:", nodemailer.getTestMessageUrl(result));
      }

      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error("❌ Email send failure:", err.message);
      return { success: false, error: err.message };
    }
  }

  async healthCheck() {
    try {
      await this.init();
      await this.transporter.verify();
      return {
        healthy: true,
        provider: process.env.NODE_ENV === "production" ? "SMTP" : "Ethereal",
        loadedTemplates: Array.from(this.templates.keys()),
      };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
export const sendEmail = emailService.sendEmail.bind(emailService);
export default emailService;

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
    this.init();
  }

  async init() {
    try {
      // Create transporter based on environment
      if (process.env.NODE_ENV === 'production') {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        // Development: Use ethereal.email for testing
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('📧 Development email service using Ethereal');
        console.log(`Ethereal User: ${testAccount.user}`);
        console.log(`Ethereal Pass: ${testAccount.pass}`);
      }

      // Load email templates
      await this.loadTemplates();
      
      this.initialized = true;
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/emails');
    
    try {
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          
          this.templates.set(templateName, handlebars.compile(templateContent));
          console.log(`📄 Loaded email template: ${templateName}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load email templates, using fallbacks:', error.message);
      this.createFallbackTemplates();
    }
  }

  createFallbackTemplates() {
    const fallbackTemplates = {
      'user-welcome': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{organizationName}}!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>{{name}}</strong>,</p>
      <p>Your account has been created with the role: <strong>{{role}}</strong></p>
      <p>You can now access the platform using the button below:</p>
      <p style="text-align: center;">
        <a href="{{loginUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Access Platform
        </a>
      </p>
      <p>If you have any questions, contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,

      'organization-invitation': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
    </div>
    <div class="content">
      <p>You've been invited by <strong>{{inviterName}}</strong> to join <strong>{{organizationName}}</strong>.</p>
      <p>Role: <strong>{{role}}</strong></p>
      <p>Click the button below to accept your invitation:</p>
      <p style="text-align: center;">
        <a href="{{invitationUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p><small>This invitation will expire in {{expiresIn}}.</small></p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,

      'contact-confirmation': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Message Received</h1>
    </div>
    <div class="content">
      <p>Hello <strong>{{name}}</strong>,</p>
      <p>Thank you for contacting us. We've received your message and will get back to you within {{estimatedResponseTime}}.</p>
      <p><strong>Subject:</strong> {{subject}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p>If you need immediate assistance, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{organization}}. All rights reserved.</p>
      <p>Support: {{supportEmail}}</p>
    </div>
  </div>
</body>
</html>`
    };

    Object.entries(fallbackTemplates).forEach(([name, content]) => {
      this.templates.set(name, handlebars.compile(content));
    });
  }

  async sendEmail(options) {
    if (!this.initialized) {
      console.warn('Email service not initialized, skipping email send');
      return { success: false, error: 'Email service not initialized' };
    }

    try {
      const {
        to,
        subject,
        template,
        context = {},
        from = process.env.EMAIL_FROM || 'Assessly <noreply@assessly.com>',
        cc,
        bcc,
        attachments = []
      } = options;

      // Validate required fields
      if (!to || !subject || !template) {
        throw new Error('Missing required email fields: to, subject, or template');
      }

      // Get template
      const templateFn = this.templates.get(template);
      if (!templateFn) {
        throw new Error(`Email template not found: ${template}`);
      }

      // Prepare context with common variables
      const emailContext = {
        ...context,
        currentYear: new Date().getFullYear(),
        supportEmail: process.env.SUPPORT_EMAIL || 'support@assessly.com',
        platformUrl: process.env.FRONTEND_URL || 'https://assessly.com'
      };

      // Generate HTML content
      const html = templateFn(emailContext);

      // Prepare email options
      const mailOptions = {
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        attachments
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email sent:', {
          to,
          subject,
          previewUrl: nodemailer.getTestMessageUrl(result)
        });
      }

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };

    } catch (error) {
      console.error('❌ Email send failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Specific email methods for common use cases
  async sendWelcomeEmail(user, organization, role) {
    return this.sendEmail({
      to: user.email,
      subject: `Welcome to ${organization.name}!`,
      template: 'user-welcome',
      context: {
        name: user.name,
        organizationName: organization.name,
        role: role,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      }
    });
  }

  async sendOrganizationInvitation(email, organization, role, inviter, token) {
    const invitationUrl = `${process.env.FRONTEND_URL}/invitation/accept?token=${token}`;
    
    return this.sendEmail({
      to: email,
      subject: `Invitation to join ${organization.name}`,
      template: 'organization-invitation',
      context: {
        organizationName: organization.name,
        role: role,
        inviterName: inviter.name,
        inviterEmail: inviter.email,
        invitationUrl,
        expiresIn: '7 days'
      }
    });
  }

  async sendContactConfirmation(contactMessage, organization) {
    return this.sendEmail({
      to: contactMessage.email,
      subject: `We've received your message - ${organization.name}`,
      template: 'contact-confirmation',
      context: {
        name: contactMessage.name,
        subject: contactMessage.subject,
        priority: contactMessage.priority,
        estimatedResponseTime: this.getEstimatedResponseTime(contactMessage.priority),
        organization: organization.name,
        supportEmail: organization.supportEmail || 'support@assessly.com'
      }
    });
  }

  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Assessly',
      template: 'password-reset',
      context: {
        resetUrl,
        expiresIn: '1 hour'
      }
    });
  }

  async sendSubscriptionInvoice(invoice, organization, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Invoice ${invoice.invoiceNumber} - ${organization.name}`,
      template: 'subscription-invoice',
      context: {
        name: user.name,
        organizationName: organization.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        dueDate: invoice.dueDate.toLocaleDateString(),
        items: invoice.items,
        billingPeriod: invoice.billingPeriod
      }
    });
  }

  // Utility methods
  getEstimatedResponseTime(priority) {
    const responseTimes = {
      urgent: '2-4 hours',
      high: '8-12 hours',
      normal: '24-48 hours',
      low: '2-3 business days'
    };
    
    return responseTimes[priority] || responseTimes.normal;
  }

  // Health check
  async healthCheck() {
    if (!this.initialized) {
      return { healthy: false, error: 'Email service not initialized' };
    }

    try {
      await this.transporter.verify();
      return { 
        healthy: true, 
        provider: process.env.NODE_ENV === 'production' ? 'SMTP' : 'Ethereal',
        templates: Array.from(this.templates.keys())
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

export { emailService };
export default emailService;

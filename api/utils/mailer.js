// api/utils/mailer.js
import nodemailer from 'nodemailer';

/**
 * Production-ready email service for Assessly Platform
 * Features: retry logic, comprehensive error handling, template support, and monitoring
 */
class MailerService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.stats = {
      sent: 0,
      failed: 0,
      lastError: null,
      lastSuccess: null
    };
    
    this.initialize();
  }

  /**
   * Initialize email transporter with configuration validation
   */
  initialize() {
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('⚠️  Email service disabled - Missing environment variables:', missingVars.join(', '));
      return;
    }

    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Production optimizations
      pool: true,
      maxConnections: 10,
      maxMessages: 1000,
      rateDelta: 1000,
      rateLimit: 10,
      // Timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000, // 30 seconds
      // TLS options
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service configured and ready');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration failed:', error.message);
      this.stats.lastError = error.message;
      return false;
    }
  }

  /**
   * Send email with retry logic and comprehensive error handling
   */
  async sendEmail({ 
    to, 
    subject, 
    html, 
    text, 
    cc, 
    bcc, 
    attachments = [], 
    priority = 'normal',
    category = 'transactional',
    metadata = {}
  }) {
    // Validate email service availability
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Email service not configured',
        skipped: true
      };
    }

    // Validate input parameters
    const validationError = this.validateEmailParams({ to, subject, html, text });
    if (validationError) {
      throw new Error(`Email validation failed: ${validationError}`);
    }

    const mailOptions = {
      from: this.getFromAddress(),
      to: this.normalizeRecipients(to),
      subject: this.formatSubject(subject),
      html: html,
      text: text || this.htmlToPlainText(html),
      cc: this.normalizeRecipients(cc),
      bcc: this.normalizeRecipients(bcc),
      attachments,
      priority: this.getPriorityLevel(priority),
      headers: {
        'X-Priority': this.getPriorityLevel(priority),
        'X-Mailer': 'Assessly Platform',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'X-Category': category,
        ...metadata
      }
    };

    // Send with retry logic
    const result = await this.sendWithRetry(mailOptions);
    
    // Update statistics
    if (result.success) {
      this.stats.sent++;
      this.stats.lastSuccess = new Date();
    } else {
      this.stats.failed++;
      this.stats.lastError = result.error;
    }

    return result;
  }

  /**
   * Send email with exponential backoff retry logic
   */
  async sendWithRetry(mailOptions, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        
        console.log(`✅ Email sent to: ${mailOptions.to} | Subject: ${mailOptions.subject} | Attempt: ${attempt}`);
        
        return {
          success: true,
          messageId: result.messageId,
          response: result.response,
          attempt
        };
      } catch (error) {
        lastError = error;
        
        console.warn(`❌ Email send failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        // Don't retry for fatal errors
        if (this.isFatalError(error)) {
          break;
        }
        
        // Exponential backoff before retry
        if (attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown email error',
      attempts: maxRetries
    };
  }

  /**
   * Validate email parameters
   */
  validateEmailParams({ to, subject, html, text }) {
    if (!to) return 'Missing recipient (to)';
    if (!subject || subject.trim().length === 0) return 'Missing or empty subject';
    if (!html && !text) return 'Missing email content (html or text)';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const recipient of recipients) {
      if (!emailRegex.test(recipient.trim())) {
        return `Invalid email address: ${recipient}`;
      }
    }
    
    return null;
  }

  /**
   * Normalize recipient addresses
   */
  normalizeRecipients(recipients) {
    if (!recipients) return undefined;
    if (Array.isArray(recipients)) {
      return recipients.join(', ');
    }
    return recipients;
  }

  /**
   * Format subject with consistent prefix in non-production
   */
  formatSubject(subject) {
    if (process.env.NODE_ENV !== 'production') {
      return `[${process.env.NODE_ENV?.toUpperCase() || 'DEV'}] ${subject}`;
    }
    return subject;
  }

  /**
   * Get from address with fallback
   */
  getFromAddress() {
    return process.env.EMAIL_FROM || `Assessly <${process.env.SMTP_USER}>`;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToPlainText(html) {
    if (!html) return '';
    
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Get priority level for email
   */
  getPriorityLevel(priority) {
    const levels = {
      'high': '1',
      'normal': '3',
      'low': '5'
    };
    return levels[priority] || '3';
  }

  /**
   * Check if error is fatal (should not retry)
   */
  isFatalError(error) {
    const fatalCodes = ['EENVELOPE', 'EMESSAGE', 'EAUTH', 'ECONNECTION'];
    const fatalMessages = ['Invalid login', 'Authentication failed', 'Connection refused'];
    
    return fatalCodes.some(code => error.code === code) ||
           fatalMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      stats: { ...this.stats },
      successRate: this.stats.sent + this.stats.failed > 0 
        ? Math.round((this.stats.sent / (this.stats.sent + this.stats.failed)) * 100)
        : 0,
      uptime: process.uptime()
    };
  }

  /**
   * Test email configuration
   */
  async testConfiguration() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const testEmail = {
      to: process.env.SMTP_USER,
      subject: 'Assessly Platform - Email Service Test',
      html: this.getTestEmailTemplate(),
      category: 'test',
      metadata: {
        'X-Test-Timestamp': new Date().toISOString()
      }
    };

    return await this.sendEmail(testEmail);
  }

  /**
   * Get test email template
   */
  getTestEmailTemplate() {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e88e5, #0d47a1); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">✅ Email Service Test</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Assessly Platform Email System</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p><strong>Status:</strong> <span style="color: #43a047;">OPERATIONAL</span></p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</p>
          
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px;">
            <p style="margin: 0; color: #1565c0;">
              <strong>Note:</strong> This email confirms that your Assessly Platform email service is properly configured and functioning correctly.
            </p>
          </div>
        </div>
        
        <div style="padding: 20px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated test message from your Assessly Platform instance.</p>
        </div>
      </div>
    `;
  }
}

// Pre-defined email templates for common use cases
export const EmailTemplates = {
  /**
   * Email verification template
   */
  verification: ({ name, verificationUrl, expiresIn = '24 hours' }) => ({
    subject: 'Verify Your Email - Assessly Platform',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e88e5, #0d47a1); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Verify Your Email</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Welcome to Assessly! Please verify your email address to activate your account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 14px 28px; background: #1e88e5; color: white; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p>This link expires in <strong>${expiresIn}</strong>.</p>
          <p style="color: #666; font-size: 14px;">
            Or copy this URL: <br/>
            <code style="background: #f5f5f5; padding: 5px; border-radius: 3px;">${verificationUrl}</code>
          </p>
        </div>
      </div>
    `
  }),

  /**
   * Password reset template
   */
  passwordReset: ({ name, resetUrl, expiresIn = '1 hour' }) => ({
    subject: 'Reset Your Password - Assessly Platform',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #e53935, #b71c1c); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a password reset request for your account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 14px 28px; background: #e53935; color: white; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p>This link expires in <strong>${expiresIn}</strong>.</p>
          <p><strong>Security Note:</strong> If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `
  }),

  /**
   * Welcome email template
   */
  welcome: ({ name, dashboardUrl }) => ({
    subject: 'Welcome to Assessly! 🚀',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #43a047, #2e7d32); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Assessly!</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your account is ready! Start creating amazing assessments.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; padding: 14px 28px; background: #43a047; color: white; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }),

  /**
   * Assessment invitation template
   */
  assessmentInvite: ({ candidateName, assessmentName, inviteUrl, duration }) => ({
    subject: `Assessment Invitation: ${assessmentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7e57c2, #512da8); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Assessment Invitation</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p>Hi <strong>${candidateName}</strong>,</p>
          <p>You've been invited to take the <strong>${assessmentName}</strong> assessment.</p>
          
          <div style="background: #f3e5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Duration:</strong> ${duration}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="display: inline-block; padding: 14px 28px; background: #7e57c2; color: white; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Start Assessment
            </a>
          </div>
        </div>
      </div>
    `
  })
};

// Create singleton instance
const mailerService = new MailerService();

// Export functions for backward compatibility
export const sendMail = (options) => mailerService.sendEmail(options);
export const getEmailStats = () => mailerService.getStatus();
export const testEmailConfig = () => mailerService.testConfiguration();

// Export for direct use
export default mailerService;

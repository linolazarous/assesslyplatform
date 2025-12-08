/**
 * Email Service for Assessly Platform
 * Handles sending emails using configured templates
 */

import nodemailer from 'nodemailer';
import { 
  assessmentInviteTemplate,
  resetPasswordTemplate,
  welcomeTemplate,
  assessmentCompleteTemplate,
  subscriptionChangeTemplate 
} from '../templates/emailTemplates.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize email transporter
   */
  async init() {
    try {
      // Use environment variables for email configuration
      const transportConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };

      // Only create transporter if we have credentials
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        this.transporter = nodemailer.createTransport(transportConfig);
        
        // Verify connection
        await this.transporter.verify();
        this.isInitialized = true;
        console.log('✅ Email service initialized successfully');
      } else {
        console.log('⚠️  Email service not initialized - missing credentials');
        console.log('ℹ️  Emails will be logged to console instead');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.log('ℹ️  Emails will be logged to console instead');
    }
  }

  /**
   * Send email using template
   * @param {string} templateName - Name of the template to use
   * @param {Object} data - Template data
   * @param {Object} options - Additional email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(templateName, data, options = {}) {
    try {
      // Generate email content from template
      const emailData = this.generateEmailContent(templateName, data);
      
      if (!emailData) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Merge template data with options
      const mailOptions = {
        from: options.from || process.env.EMAIL_FROM || 'Assessly <noreply@assessly.com>',
        to: emailData.to || data.user?.email,
        cc: emailData.cc || options.cc,
        bcc: emailData.bcc || options.bcc,
        subject: emailData.subject || options.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: options.replyTo || process.env.EMAIL_REPLY_TO
      };

      // Remove undefined values
      Object.keys(mailOptions).forEach(key => 
        mailOptions[key] === undefined && delete mailOptions[key]
      );

      // Send email if transporter is initialized, otherwise log
      if (this.isInitialized && this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${mailOptions.subject} to ${mailOptions.to}`);
        return { success: true, messageId: info.messageId };
      } else {
        // Log email to console (development/fallback mode)
        console.log('📧 Email (console log mode):');
        console.log('Subject:', mailOptions.subject);
        console.log('To:', mailOptions.to);
        console.log('CC:', mailOptions.cc);
        console.log('BCC:', mailOptions.bcc);
        console.log('HTML Preview (first 200 chars):', mailOptions.html?.substring(0, 200) + '...');
        console.log('---');
        return { success: true, messageId: 'console-log', mode: 'console' };
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  /**
   * Generate email content from template
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @returns {Object} Email data object
   */
  generateEmailContent(templateName, data) {
    const templates = {
      'assessment-invite': assessmentInviteTemplate,
      'reset-password': resetPasswordTemplate,
      'welcome': welcomeTemplate,
      'assessment-complete': assessmentCompleteTemplate,
      'subscription-change': subscriptionChangeTemplate
    };

    const templateFunction = templates[templateName];
    if (!templateFunction) {
      console.error(`Template "${templateName}" not found. Available templates:`, Object.keys(templates));
      return null;
    }

    return templateFunction(data);
  }

  /**
   * Send assessment invitation email
   */
  async sendAssessmentInvite(data) {
    return this.sendEmail('assessment-invite', data);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data) {
    return this.sendEmail('reset-password', data);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data) {
    return this.sendEmail('welcome', data);
  }

  /**
   * Send assessment completion notification
   */
  async sendAssessmentComplete(data) {
    return this.sendEmail('assessment-complete', data);
  }

  /**
   * Send subscription change notification
   */
  async sendSubscriptionChange(data) {
    return this.sendEmail('subscription-change', data);
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;

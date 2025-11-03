import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email configuration with validation
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Connection pool and timeout settings
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5
};

const EMAIL_FROM = process.env.EMAIL_FROM || `Assessly <${process.env.SMTP_USER}>`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@assessly.com';

// Validate SMTP configuration
function validateSmtpConfig() {
  const { host, auth } = SMTP_CONFIG;
  
  if (!host || !auth.user || !auth.pass) {
    console.warn('⚠️  SMTP configuration incomplete. Email functionality will be disabled.');
    console.warn('   Required environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
    return false;
  }
  
  return true;
}

// Create transporter with enhanced configuration
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Email sending statistics
const emailStats = {
  sent: 0,
  failed: 0,
  lastError: null
};

// Verify transporter on startup
let isTransporterVerified = false;

async function verifyTransporter() {
  if (!validateSmtpConfig()) {
    return false;
  }

  try {
    await transporter.verify();
    isTransporterVerified = true;
    console.log('✅ SMTP transporter verified and ready');
    return true;
  } catch (error) {
    console.error('❌ SMTP transporter verification failed:', error.message);
    emailStats.lastError = error.message;
    return false;
  }
}

// Initialize transporter verification (non-blocking)
verifyTransporter().catch(console.error);

/**
 * Enhanced email sending with retry logic and comprehensive error handling
 */
export async function sendMail({ to, subject, html, text, cc, bcc, attachments = [], priority = 'normal' }) {
  // Check if email is enabled
  if (!isTransporterVerified) {
    console.warn('📧 Email sending skipped: SMTP not configured or verified');
    return { success: false, error: 'Email service not configured', skipped: true };
  }

  // Validate required fields
  if (!to || !subject || (!html && !text)) {
    throw new Error('Missing required email fields: to, subject, and html or text');
  }

  const mailOptions = {
    from: EMAIL_FROM,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject,
    html: html,
    text: text || htmlToPlain(html),
    cc,
    bcc,
    attachments,
    priority: getPriorityLevel(priority),
    headers: {
      'X-Priority': getPriorityLevel(priority),
      'X-Mailer': 'Assessly Platform',
      'X-Auto-Response-Suppress': 'OOF, AutoReply'
    }
  };

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      emailStats.sent++;
      
      console.log(`✅ Email sent successfully to: ${to} | Subject: ${subject} | Attempt: ${attempt}`);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        attempt
      };
    } catch (error) {
      lastError = error;
      emailStats.failed++;
      
      console.error(`❌ Email send failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Don't retry for certain errors
      if (isFatalError(error)) {
        break;
      }
      
      // Exponential backoff before retry
      if (attempt < maxRetries) {
        const backoffTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  // All retries failed
  emailStats.lastError = lastError?.message;
  
  return {
    success: false,
    error: lastError?.message || 'Unknown email error',
    attempts: maxRetries
  };
}

/**
 * Load email template from file system
 */
export async function loadEmailTemplate(templateName, variables = {}) {
  try {
    const templatesDir = path.join(__dirname, '../templates/emails');
    const templatePath = path.join(templatesDir, `${templateName}.html`);
    
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), variables[key]);
    });
    
    return template;
  } catch (error) {
    console.warn(`⚠️  Could not load email template "${templateName}":`, error.message);
    return null;
  }
}

/**
 * Convert HTML to plain text (enhanced version)
 */
function htmlToPlain(html) {
  if (!html) return '';
  
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Get priority level for email
 */
function getPriorityLevel(priority) {
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
function isFatalError(error) {
  const fatalCodes = ['EENVELOPE', 'EMESSAGE', 'EAUTH'];
  return fatalCodes.some(code => error.code === code);
}

/**
 * Get email sending statistics
 */
export function getEmailStats() {
  return {
    ...emailStats,
    isConfigured: isTransporterVerified,
    successRate: emailStats.sent + emailStats.failed > 0 
      ? (emailStats.sent / (emailStats.sent + emailStats.failed)) * 100 
      : 0
  };
}

/**
 * Test email configuration
 */
export async function testEmailConfig() {
  const testEmail = {
    to: process.env.SMTP_USER,
    subject: 'Assessly Platform - Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color:#1e88e5">✅ Email Test Successful</h2>
        <p>This is a test email from your Assessly Platform.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <hr/>
        <p style="font-size:12px;color:#666;">
          If you received this email, your SMTP configuration is working correctly.
        </p>
      </div>
    `
  };

  return await sendMail(testEmail);
}

// Email templates
export const emailTemplates = {
  /**
   * Verification email template
   */
  verification: ({ name, verifyUrl, expiresIn = '24 hours' }) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e88e5, #0d47a1); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Verify Your Email</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Welcome to Assessly Platform</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        
        <p>Thank you for signing up for Assessly! To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="display: inline-block; padding: 14px 28px; background: #1e88e5; color: white; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <p>This verification link will expire in <strong>${expiresIn}</strong>.</p>
        
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this URL into your browser:
          <br/>
          <a href="${verifyUrl}" style="color: #1e88e5; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      
      <div style="padding: 20px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
        <p>If you didn't create an account with Assessly, please ignore this email.</p>
        <p>Need help? Contact our support team at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  `,

  /**
   * Password reset email template
   */
  passwordReset: ({ name, resetUrl, expiresIn = '1 hour' }) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #e53935, #b71c1c); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Assessly Platform Security</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        
        <p>We received a request to reset your password for your Assessly account. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 14px 28px; background: #e53935; color: white; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Reset Your Password
          </a>
        </div>
        
        <p>This password reset link will expire in <strong>${expiresIn}</strong> for security reasons.</p>
        
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this URL into your browser:
          <br/>
          <a href="${resetUrl}" style="color: #e53935; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.</p>
      </div>
      
      <div style="padding: 20px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated security message from Assessly Platform.</p>
        <p>Contact support: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  `,

  /**
   * Welcome email template
   */
  welcome: ({ name, loginUrl, supportEmail = SUPPORT_EMAIL }) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #43a047, #2e7d32); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to Assessly! 🎉</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Your assessment journey begins here</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <p>Hi <strong>${name}</strong>,</p>
        
        <p>Welcome to Assessly Platform! We're excited to have you on board and can't wait to see how you'll transform your assessment processes.</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">🚀 Get Started</h3>
          <ul style="margin-bottom: 0;">
            <li>Create your first assessment</li>
            <li>Invite team members to collaborate</li>
            <li>Explore advanced analytics features</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="display: inline-block; padding: 14px 28px; background: #43a047; color: white; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Start Creating Assessments
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
        <p>Need help getting started? Check out our <a href="${loginUrl}/docs">documentation</a> or contact our team.</p>
        <p>Email: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      </div>
    </div>
  `
};

// Legacy template functions for backward compatibility
export const verificationEmailTemplate = emailTemplates.verification;
export const passwordResetEmailTemplate = emailTemplates.passwordReset;

export default {
  sendMail,
  loadEmailTemplate,
  getEmailStats,
  testEmailConfig,
  emailTemplates,
  verificationEmailTemplate,
  passwordResetEmailTemplate
};

// src/templates/emailTemplates.js
import { format } from 'date-fns';

// Email configuration
const EMAIL_CONFIG = {
  logoUrl: process.env.REACT_APP_EMAIL_LOGO_URL || 'https://assessly.com/logo.png',
  primaryColor: '#3f51b5', // Material-UI primary color
  secondaryColor: '#f50057', // Material-UI secondary color
  backgroundColor: '#f8f9fa',
  textColor: '#2d3748',
  mutedColor: '#718096',
  borderColor: '#e2e8f0',
  fontFamily: 'Arial, Helvetica, sans-serif',
  companyName: 'Assessly Platform',
  supportEmail: 'support@assessly.com',
  websiteUrl: 'https://assessly.com',
};

/**
 * Base email template with header and footer
 */
const baseTemplate = (content, options = {}) => {
  const {
    title = '',
    includeLogo = true,
    includeFooter = true,
    actionButton = null,
    secondaryAction = null,
    disclaimer = '',
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || EMAIL_CONFIG.companyName}</title>
    <style>
        body {
            font-family: ${EMAIL_CONFIG.fontFamily};
            line-height: 1.6;
            color: ${EMAIL_CONFIG.textColor};
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor});
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            height: 50px;
            margin-bottom: 15px;
        }
        .content {
            padding: 30px;
        }
        .title {
            color: ${EMAIL_CONFIG.primaryColor};
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 20px 0;
            border-bottom: 2px solid ${EMAIL_CONFIG.borderColor};
            padding-bottom: 10px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor});
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(63, 81, 181, 0.3);
        }
        .secondary-button {
            display: inline-block;
            color: ${EMAIL_CONFIG.primaryColor};
            border: 2px solid ${EMAIL_CONFIG.primaryColor};
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px 5px;
            text-align: center;
        }
        .footer {
            background-color: ${EMAIL_CONFIG.backgroundColor};
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: ${EMAIL_CONFIG.mutedColor};
            border-top: 1px solid ${EMAIL_CONFIG.borderColor};
        }
        .info-box {
            background-color: ${EMAIL_CONFIG.backgroundColor};
            border-left: 4px solid ${EMAIL_CONFIG.primaryColor};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .metadata {
            background-color: ${EMAIL_CONFIG.backgroundColor};
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
        .metadata-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .metadata-label {
            font-weight: 600;
            color: ${EMAIL_CONFIG.mutedColor};
        }
        .disclaimer {
            font-size: 12px;
            color: ${EMAIL_CONFIG.mutedColor};
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid ${EMAIL_CONFIG.borderColor};
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 20px;
            }
            .button {
                display: block;
                margin: 20px auto;
            }
            .secondary-button {
                display: block;
                margin: 10px auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${includeLogo ? `
        <div class="header">
            <img src="${EMAIL_CONFIG.logoUrl}" alt="${EMAIL_CONFIG.companyName} Logo" class="logo" />
            <h1 style="color: white; margin: 0; font-size: 20px;">${EMAIL_CONFIG.companyName}</h1>
        </div>
        ` : ''}
        
        <div class="content">
            ${title ? `<h2 class="title">${title}</h2>` : ''}
            
            ${content}
            
            ${actionButton ? `
            <div style="text-align: center;">
                <a href="${actionButton.link}" class="button">
                    ${actionButton.text}
                </a>
            </div>
            ` : ''}
            
            ${secondaryAction ? `
            <div style="text-align: center; margin-top: 10px;">
                <a href="${secondaryAction.link}" class="secondary-button">
                    ${secondaryAction.text}
                </a>
            </div>
            ` : ''}
            
            ${disclaimer ? `
            <div class="disclaimer">
                ${disclaimer}
            </div>
            ` : ''}
        </div>
        
        ${includeFooter ? `
        <div class="footer">
            <p>
                © ${new Date().getFullYear()} ${EMAIL_CONFIG.companyName}. All rights reserved.<br/>
                <a href="${EMAIL_CONFIG.websiteUrl}" style="color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none;">${EMAIL_CONFIG.websiteUrl}</a> • 
                <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none;">${EMAIL_CONFIG.supportEmail}</a>
            </p>
            <p style="font-size: 12px; margin-top: 10px;">
                This email was sent from our notification system. Please do not reply to this email.
            </p>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
};

/**
 * Template for inviting a candidate to take an assessment
 */
export const assessmentInviteTemplate = (data) => {
  const {
    assessment,
    inviteLink,
    candidateName,
    assessorName,
    organizationName,
    expiryDays = 7,
    instructions = '',
    timeLimit = null,
  } = data;

  const metadata = [
    { label: 'Assessment', value: assessment.title },
    { label: 'Invited by', value: assessorName },
    { label: 'Organization', value: organizationName },
    { label: 'Expires in', value: `${expiryDays} days` },
  ];

  if (timeLimit) {
    metadata.push({ label: 'Time Limit', value: `${timeLimit} minutes` });
  }

  const metadataHtml = metadata.map(item => `
    <div class="metadata-item">
        <span class="metadata-label">${item.label}:</span>
        <span>${item.value}</span>
    </div>
  `).join('');

  const content = `
    <p>Hello ${candidateName || 'Candidate'},</p>
    
    <p>You've been invited by <strong>${assessorName}</strong> to complete an assessment on the Assessly Platform.</p>
    
    <div class="info-box">
        <strong>Assessment Details:</strong><br/>
        ${assessment.description || 'No description provided.'}
    </div>
    
    <div class="metadata">
        ${metadataHtml}
    </div>
    
    ${instructions ? `
    <div class="info-box">
        <strong>Instructions:</strong><br/>
        ${instructions}
    </div>
    ` : ''}
    
    <p>Click the button below to begin the assessment. Make sure you have a stable internet connection and enough time to complete it.</p>
    
    <p>If you have any questions or encounter issues, please contact ${assessorName} or our support team.</p>
  `;

  return {
    subject: `📋 Assessment Invitation: ${assessment.title}`,
    html: baseTemplate(content, {
      title: 'Assessment Invitation',
      actionButton: {
        text: 'Start Assessment',
        link: inviteLink,
      },
      disclaimer: `This invitation link will expire in ${expiryDays} days. If you need a new link, please contact ${assessorName}.`,
    }),
    text: `You've been invited to take "${assessment.title}" by ${assessorName}. 
    Click here to begin: ${inviteLink}
    
    Assessment: ${assessment.title}
    ${assessment.description ? `Description: ${assessment.description}` : ''}
    ${instructions ? `Instructions: ${instructions}` : ''}
    Expires in: ${expiryDays} days
    ${timeLimit ? `Time Limit: ${timeLimit} minutes` : ''}
    
    If you have questions, contact ${assessorName} or ${EMAIL_CONFIG.supportEmail}`,
  };
};

/**
 * Template for assessment completion notification
 */
export const assessmentCompletedTemplate = (data) => {
  const {
    assessment,
    candidateName,
    assessorName,
    score = null,
    totalQuestions = null,
    completionTime = null,
    resultsLink = null,
    feedback = null,
  } = data;

  const scoreDisplay = score !== null && totalQuestions !== null 
    ? `${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)`
    : 'Not scored yet';

  const content = `
    <p>Hello ${assessorName},</p>
    
    <p><strong>${candidateName}</strong> has completed the assessment <strong>"${assessment.title}"</strong>.</p>
    
    <div class="metadata">
        <div class="metadata-item">
            <span class="metadata-label">Candidate:</span>
            <span>${candidateName}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Assessment:</span>
            <span>${assessment.title}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Score:</span>
            <span><strong>${scoreDisplay}</strong></span>
        </div>
        ${completionTime ? `
        <div class="metadata-item">
            <span class="metadata-label">Completion Time:</span>
            <span>${completionTime} minutes</span>
        </div>
        ` : ''}
        <div class="metadata-item">
            <span class="metadata-label">Completed at:</span>
            <span>${format(new Date(), 'PPPpp')}</span>
        </div>
    </div>
    
    ${feedback ? `
    <div class="info-box">
        <strong>Candidate Feedback:</strong><br/>
        "${feedback}"
    </div>
    ` : ''}
    
    <p>You can review the detailed results and responses by clicking the button below.</p>
  `;

  return {
    subject: `✅ Assessment Completed: ${assessment.title} - ${candidateName}`,
    html: baseTemplate(content, {
      title: 'Assessment Completed',
      actionButton: resultsLink ? {
        text: 'View Results',
        link: resultsLink,
      } : null,
    }),
    text: `${candidateName} has completed "${assessment.title}".
    
    Score: ${scoreDisplay}
    ${completionTime ? `Completion Time: ${completionTime} minutes` : ''}
    Completed: ${format(new Date(), 'PPPpp')}
    ${feedback ? `Feedback: ${feedback}` : ''}
    
    ${resultsLink ? `View results: ${resultsLink}` : ''}`,
  };
};

/**
 * Template for sending a password reset link
 */
export const resetPasswordTemplate = (data) => {
  const { resetLink, userName, expiryHours = 1, ipAddress = null } = data;

  const content = `
    <p>Hello ${userName || 'User'},</p>
    
    <p>We received a request to reset your password for your Assessly Platform account.</p>
    
    <p>Click the button below to create a new password. This link will expire in <strong>${expiryHours} hour${expiryHours !== 1 ? 's' : ''}</strong>.</p>
    
    ${ipAddress ? `
    <div class="info-box">
        <strong>Security Notice:</strong><br/>
        This request was made from IP address: ${ipAddress}<br/>
        If you didn't request this change, please secure your account immediately.
    </div>
    ` : ''}
    
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <p>For security reasons, we recommend:</p>
    <ul>
        <li>Using a strong, unique password</li>
        <li>Enabling two-factor authentication</li>
        <li>Regularly updating your password</li>
    </ul>
  `;

  return {
    subject: '🔒 Reset Your Assessly Password',
    html: baseTemplate(content, {
      title: 'Password Reset Request',
      actionButton: {
        text: 'Reset Password',
        link: resetLink,
      },
      disclaimer: `This password reset link expires in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}.`,
    }),
    text: `Password Reset Request
    
    Click here to reset your password: ${resetLink}
    
    This link expires in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}.
    
    ${ipAddress ? `Request made from IP: ${ipAddress}` : ''}
    
    If you didn't request this, please ignore this email.`,
  };
};

/**
 * Template for a new user welcome email
 */
export const welcomeTemplate = (data) => {
  const { userName, loginLink, organizationName, role, features = [] } = data;

  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  const content = `
    <p>Welcome to Assessly Platform, <strong>${userName}</strong>! 🎉</p>
    
    <p>We're excited to have you join our community of organizations transforming their assessment processes.</p>
    
    <div class="metadata">
        <div class="metadata-item">
            <span class="metadata-label">Account Type:</span>
            <span>${roleDisplay}</span>
        </div>
        ${organizationName ? `
        <div class="metadata-item">
            <span class="metadata-label">Organization:</span>
            <span>${organizationName}</span>
        </div>
        ` : ''}
        <div class="metadata-item">
            <span class="metadata-label">Account Created:</span>
            <span>${format(new Date(), 'PPP')}</span>
        </div>
    </div>
    
    <div class="info-box">
        <strong>Getting Started:</strong><br/>
        1. Complete your profile setup<br/>
        2. Explore the dashboard and features<br/>
        3. ${role === 'assessor' ? 'Create your first assessment' : 'Take your first assessment'}<br/>
        4. Review analytics and insights
    </div>
    
    ${features.length > 0 ? `
    <p><strong>Key Features Available:</strong></p>
    <ul>
        ${features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
    ` : ''}
    
    <p>Need help getting started? Check out our <a href="${EMAIL_CONFIG.websiteUrl}/docs">documentation</a> or contact our support team.</p>
  `;

  return {
    subject: `🎯 Welcome to Assessly Platform, ${userName}!`,
    html: baseTemplate(content, {
      title: 'Welcome to Assessly Platform',
      actionButton: {
        text: 'Go to Dashboard',
        link: loginLink,
      },
      secondaryAction: {
        text: 'View Documentation',
        link: `${EMAIL_CONFIG.websiteUrl}/docs`,
      },
    }),
    text: `Welcome to Assessly Platform, ${userName}!
    
    Account Details:
    - Role: ${roleDisplay}
    ${organizationName ? `- Organization: ${organizationName}\n` : ''}
    - Created: ${format(new Date(), 'PPP')}
    
    Get started: ${loginLink}
    Documentation: ${EMAIL_CONFIG.websiteUrl}/docs
    
    Need help? Contact ${EMAIL_CONFIG.supportEmail}`,
  };
};

/**
 * Template for organization invitation
 */
export const organizationInviteTemplate = (data) => {
  const {
    inviteLink,
    inviterName,
    organizationName,
    role,
    expiryDays = 7,
  } = data;

  const content = `
    <p>You've been invited to join <strong>${organizationName}</strong> on Assessly Platform!</p>
    
    <p><strong>${inviterName}</strong> has invited you to join their organization as a <strong>${role}</strong>.</p>
    
    <div class="metadata">
        <div class="metadata-item">
            <span class="metadata-label">Organization:</span>
            <span>${organizationName}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Invited by:</span>
            <span>${inviterName}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Role:</span>
            <span>${role}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Invitation expires:</span>
            <span>${expiryDays} days</span>
        </div>
    </div>
    
    <div class="info-box">
        <strong>What you can do as a ${role}:</strong><br/>
        ${role === 'admin' ? `
        • Manage organization settings<br/>
        • Invite team members<br/>
        • Access all assessments and analytics<br/>
        • Manage billing and subscriptions
        ` : role === 'assessor' ? `
        • Create and manage assessments<br/>
        • Invite candidates<br/>
        • Review assessment results<br/>
        • Generate reports
        ` : `
        • Take assigned assessments<br/>
        • View your results<br/>
        • Track your progress
        `}
    </div>
    
    <p>Click the button below to accept the invitation and set up your account.</p>
  `;

  return {
    subject: `🤝 Invitation to join ${organizationName} on Assessly Platform`,
    html: baseTemplate(content, {
      title: 'Organization Invitation',
      actionButton: {
        text: 'Accept Invitation',
        link: inviteLink,
      },
      disclaimer: `This invitation will expire in ${expiryDays} days.`,
    }),
    text: `You've been invited to join ${organizationName} on Assessly Platform.
    
    Invited by: ${inviterName}
    Role: ${role}
    Organization: ${organizationName}
    Expires in: ${expiryDays} days
    
    Accept invitation: ${inviteLink}`,
  };
};

/**
 * Template for billing and subscription notifications
 */
export const billingNotificationTemplate = (data) => {
  const {
    type,
    userName,
    organizationName,
    amount,
    currency = 'USD',
    invoiceLink,
    dueDate,
    planName,
    actionRequired = false,
  } = data;

  const templates = {
    invoice: {
      title: 'New Invoice Available',
      subject: `📄 Invoice for ${organizationName} - ${format(new Date(), 'MMM yyyy')}`,
    },
    payment_failed: {
      title: 'Payment Failed',
      subject: '⚠️ Payment Failed - Action Required',
    },
    subscription_updated: {
      title: 'Subscription Updated',
      subject: `🔄 Subscription Updated for ${organizationName}`,
    },
    trial_ending: {
      title: 'Trial Ending Soon',
      subject: `⏰ Your Trial for ${organizationName} is Ending Soon`,
    },
    receipt: {
      title: 'Payment Receipt',
      subject: `✅ Payment Confirmation for ${organizationName}`,
    },
  };

  const template = templates[type] || templates.invoice;

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const content = `
    <p>Hello ${userName},</p>
    
    <p>${organizationName ? `Regarding your organization <strong>${organizationName}</strong>:` : ''}</p>
    
    ${type === 'invoice' ? `
    <div class="info-box">
        <strong>Invoice Details:</strong><br/>
        Amount: <strong>${formatCurrency(amount, currency)}</strong><br/>
        ${dueDate ? `Due Date: ${format(new Date(dueDate), 'PPP')}` : ''}<br/>
        ${planName ? `Plan: ${planName}` : ''}
    </div>
    
    <p>Your invoice is now available for viewing and payment. You can download a PDF copy or pay directly through the platform.</p>
    ` : type === 'payment_failed' ? `
    <div class="info-box" style="border-left-color: #f44336;">
        <strong>Payment Failed:</strong><br/>
        We were unable to process your payment of ${formatCurrency(amount, currency)}.<br/>
        Please update your payment method to avoid service interruption.
    </div>
    
    <p><strong>Action Required:</strong> Please update your payment information within 3 days to maintain uninterrupted service.</p>
    ` : type === 'trial_ending' ? `
    <div class="info-box" style="border-left-color: #ff9800;">
        <strong>Trial Ending:</strong><br/>
        Your free trial for ${planName} ends on ${format(new Date(dueDate), 'PPP')}.<br/>
        To continue using all features, please upgrade to a paid plan.
    </div>
    
    <p>Upgrade now to avoid losing access to premium features and your assessment data.</p>
    ` : type === 'receipt' ? `
    <div class="info-box" style="border-left-color: #4caf50;">
        <strong>Payment Confirmed:</strong><br/>
        Amount: <strong>${formatCurrency(amount, currency)}</strong><br/>
        Date: ${format(new Date(), 'PPP')}<br/>
        ${planName ? `Plan: ${planName}` : ''}
    </div>
    
    <p>Thank you for your payment! Your subscription has been successfully processed.</p>
    ` : ''}
    
    ${actionRequired ? `
    <div style="background-color: #fff3cd; border: 1px solid #ffecb5; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <strong style="color: #856404;">⚠️ Action Required</strong>
        <p style="margin: 10px 0 0 0;">${data.actionMessage || 'Please take action to avoid service interruption.'}</p>
    </div>
    ` : ''}
  `;

  return {
    subject: template.subject,
    html: baseTemplate(content, {
      title: template.title,
      actionButton: invoiceLink ? {
        text: type === 'payment_failed' ? 'Update Payment Method' : 'View Details',
        link: invoiceLink,
      } : null,
      disclaimer: 'This is an automated notification. Please do not reply to this email.',
    }),
    text: `${template.title}
    
    ${organizationName ? `Organization: ${organizationName}\n` : ''}
    ${type === 'invoice' ? `Amount: ${formatCurrency(amount, currency)}\n` : ''}
    ${dueDate ? `Due Date: ${format(new Date(dueDate), 'PPP')}\n` : ''}
    ${planName ? `Plan: ${planName}\n` : ''}
    
    ${invoiceLink ? `View details: ${invoiceLink}` : ''}
    
    ${actionRequired ? `\nACTION REQUIRED: ${data.actionMessage || 'Please take action.'}` : ''}`,
  };
};

/**
 * Template for system notifications and alerts
 */
export const systemNotificationTemplate = (data) => {
  const {
    type,
    title,
    message,
    priority = 'medium', // low, medium, high, critical
    actionLink = null,
    actionText = 'View Details',
    timestamp = new Date(),
  } = data;

  const priorityColors = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    critical: '#d32f2f',
  };

  const priorityLabels = {
    low: 'Information',
    medium: 'Notification',
    high: 'Alert',
    critical: 'Critical Alert',
  };

  const content = `
    <div style="border-left: 4px solid ${priorityColors[priority]}; padding-left: 15px; margin: 20px 0;">
        <strong style="color: ${priorityColors[priority]};">${priorityLabels[priority].toUpperCase()}</strong>
        <h3 style="margin: 10px 0;">${title}</h3>
        <p>${message}</p>
        <p style="font-size: 12px; color: ${EMAIL_CONFIG.mutedColor};">
            ${format(new Date(timestamp), 'PPPpp')}
        </p>
    </div>
    
    ${type === 'maintenance' ? `
    <div class="info-box">
        <strong>Maintenance Details:</strong><br/>
        ${data.maintenanceDetails || 'Scheduled system maintenance.'}
    </div>
    ` : ''}
    
    ${type === 'security' ? `
    <div class="info-box" style="border-left-color: #f44336;">
        <strong>Security Notice:</strong><br/>
        ${data.securityDetails || 'Please review this security notice carefully.'}
    </div>
    ` : ''}
  `;

  return {
    subject: `${priority === 'critical' ? '🚨 ' : priority === 'high' ? '⚠️ ' : ''}${title}`,
    html: baseTemplate(content, {
      title: 'System Notification',
      actionButton: actionLink ? {
        text: actionText,
        link: actionLink,
      } : null,
      includeLogo: false,
      disclaimer: 'This is an automated system notification.',
    }),
    text: `${priorityLabels[priority]}: ${title}
    
    ${message}
    
    ${type === 'maintenance' ? `Maintenance Details: ${data.maintenanceDetails}\n` : ''}
    ${type === 'security' ? `Security Details: ${data.securityDetails}\n` : ''}
    Time: ${format(new Date(timestamp), 'PPPpp')}
    
    ${actionLink ? `${actionText}: ${actionLink}` : ''}`,
  };
};

export default {
  assessmentInviteTemplate,
  assessmentCompletedTemplate,
  resetPasswordTemplate,
  welcomeTemplate,
  organizationInviteTemplate,
  billingNotificationTemplate,
  systemNotificationTemplate,
};

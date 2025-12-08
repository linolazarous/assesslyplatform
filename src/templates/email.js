// src/templates/email.js
/**
 * Enterprise-grade email templates for Assessly Platform
 * Multi-tenant aware, customizable, and responsive email templates
 */

// Configuration
const EMAIL_CONFIG = {
  LOGO_URL_PLACEHOLDER: 'https://assessly-gedp.onrender.com/logo.png',
  PRIMARY_COLOR: '#3f51b5',
  SECONDARY_COLOR: '#f8f9fa',
  SUCCESS_COLOR: '#4caf50',
  WARNING_COLOR: '#ff9800',
  ERROR_COLOR: '#f44336',
  TEXT_PRIMARY: '#2d3748',
  TEXT_SECONDARY: '#718096',
  TEXT_LIGHT: '#a0aec0',
  BORDER_COLOR: '#e2e8f0',
  FONT_FAMILY: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  MAX_WIDTH: '600px',
  BORDER_RADIUS: '8px'
};

// Template utility functions
const templateUtils = {
  /**
   * Generate email header with logo
   * @param {Object} options - Header options
   * @returns {string} HTML string for header
   */
  generateHeader: (options = {}) => {
    const {
      logoUrl = EMAIL_CONFIG.LOGO_URL_PLACEHOLDER,
      organizationName,
      organizationLogo,
      showTagline = true
    } = options;

    const logo = organizationLogo || logoUrl;
    const orgName = organizationName ? ` | ${organizationName}` : '';

    return `
      <div style="text-align: center; margin-bottom: 30px; padding: 20px 0; background-color: ${EMAIL_CONFIG.SECONDARY_COLOR};">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${EMAIL_CONFIG.MAX_WIDTH}; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <img src="${logo}" 
                   alt="${organizationName || 'Assessly'} Logo" 
                   style="height: 40px; width: auto; max-width: 150px;"
                   width="150" height="40">
              ${organizationName ? `
                <h1 style="font-size: 18px; font-weight: 600; color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 10px 0 5px 0;">
                  ${organizationName}
                </h1>
              ` : ''}
              ${showTagline ? `
                <p style="font-size: 14px; color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0;">
                  Modern Assessment Platform${orgName}
                </p>
              ` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  /**
   * Generate email footer with legal links
   * @param {Object} options - Footer options
   * @returns {string} HTML string for footer
   */
  generateFooter: (options = {}) => {
    const {
      unsubscribeLink,
      contactEmail = 'assesslyinc@gmail.com',
      privacyPolicyLink = 'https://assessly-gedp.onrender.com/privacy',
      termsLink = 'https://assessly-assessly-gedp.onrender.com/terms',
      organizationName
    } = options;

    const orgText = organizationName ? `from ${organizationName}` : '';

    return `
      <div style="border-top: 1px solid ${EMAIL_CONFIG.BORDER_COLOR}; padding-top: 20px; margin-top: 30px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${EMAIL_CONFIG.MAX_WIDTH}; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <p style="font-size: 12px; color: ${EMAIL_CONFIG.TEXT_LIGHT}; margin: 0 0 10px 0;">
                You received this email ${orgText} because you are part of the Assessly Platform.
              </p>
              <p style="font-size: 12px; color: ${EMAIL_CONFIG.TEXT_LIGHT}; margin: 0 0 15px 0;">
                <a href="${privacyPolicyLink}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="${termsLink}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">Terms of Service</a>
                ${contactEmail ? `&nbsp;|&nbsp;<a href="mailto:${contactEmail}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">Contact Support</a>` : ''}
              </p>
              ${unsubscribeLink ? `
                <p style="font-size: 12px; color: ${EMAIL_CONFIG.TEXT_LIGHT}; margin: 0;">
                  <a href="${unsubscribeLink}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">Unsubscribe</a>
                  from these emails
                </p>
              ` : ''}
              <p style="font-size: 11px; color: ${EMAIL_CONFIG.TEXT_LIGHT}; margin: 15px 0 0 0;">
                &copy; ${new Date().getFullYear()} Assessly Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  /**
   * Generate call-to-action button
   * @param {Object} options - Button options
   * @returns {string} HTML string for button
   */
  generateButton: (options = {}) => {
    const {
      text,
      url,
      color = EMAIL_CONFIG.PRIMARY_COLOR,
      textColor = '#ffffff',
      size = 'medium'
    } = options;

    const padding = size === 'large' ? '15px 30px' : size === 'small' ? '8px 16px' : '12px 24px';
    const fontSize = size === 'large' ? '16px' : size === 'small' ? '14px' : '15px';

    return `
      <div style="text-align: center; margin: 30px 0;">
        <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" 
                       href="${url}" style="height:${size === 'large' ? '50px' : size === 'small' ? '38px' : '44px'}; 
                       v-text-anchor:middle; width:${size === 'large' ? '250px' : size === 'small' ? '150px' : '200px'};" 
                       arcsize="10%" stroke="f" fillcolor="${color}">
            <w:anchorlock/>
            <center style="color:${textColor}; font-family:${EMAIL_CONFIG.FONT_FAMILY}; font-size:${fontSize}; font-weight:600;">
              ${text}
            </center>
          </v:roundrect>
        <![endif]-->
        <a href="${url}"
           style="background-color: ${color}; color: ${textColor}; 
                  padding: ${padding}; border-radius: ${EMAIL_CONFIG.BORDER_RADIUS}; 
                  text-decoration: none; font-weight: 600; font-size: ${fontSize};
                  display: inline-block; mso-hide: all;">
          ${text}
        </a>
      </div>
    `;
  },

  /**
   * Generate information card
   * @param {Object} options - Card options
   * @returns {string} HTML string for card
   */
  generateCard: (options = {}) => {
    const {
      title,
      content,
      icon,
      border = true,
      backgroundColor = '#ffffff'
    } = options;

    const borderStyle = border ? `1px solid ${EMAIL_CONFIG.BORDER_COLOR}` : 'none';

    return `
      <div style="background-color: ${backgroundColor}; border: ${borderStyle}; 
                  border-radius: ${EMAIL_CONFIG.BORDER_RADIUS}; padding: 20px; margin: 20px 0;">
        ${icon ? `
          <div style="text-align: center; margin-bottom: 15px;">
            <img src="${icon}" alt="${title}" style="height: 40px; width: auto;">
          </div>
        ` : ''}
        ${title ? `<h3 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">${title}</h3>` : ''}
        <div style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; font-size: 14px; line-height: 1.5;">
          ${content}
        </div>
      </div>
    `;
  },

  /**
   * Generate step-by-step instructions
   * @param {Array} steps - Array of step objects
   * @returns {string} HTML string for steps
   */
  generateSteps: (steps) => {
    return steps.map((step, index) => `
      <div style="margin-bottom: 15px; padding-left: 20px; position: relative;">
        <div style="position: absolute; left: 0; top: 0; 
                    background-color: ${EMAIL_CONFIG.PRIMARY_COLOR}; 
                    color: white; width: 20px; height: 20px; 
                    border-radius: 50%; text-align: center; 
                    font-size: 12px; font-weight: 600; line-height: 20px;">
          ${index + 1}
        </div>
        <div style="margin-left: 10px;">
          <strong style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; display: block; margin-bottom: 5px;">
            ${step.title}
          </strong>
          <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; font-size: 14px;">
            ${step.description}
          </p>
        </div>
      </div>
    `).join('');
  }
};

// Main template wrapper
const generateEmailWrapper = (content, options = {}) => {
  const {
    preheader = '',
    organization,
    unsubscribeLink,
    contactEmail,
    privacyPolicyLink,
    termsLink
  } = options;

  const orgOptions = organization ? {
    organizationName: organization.name,
    organizationLogo: organization.logoUrl,
    contactEmail: organization.contactEmail || contactEmail
  } : {};

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${options.subject || 'Assessly Email'}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            padding: 10px !important;
          }
          .button {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
          }
        }
        .dark-mode {
          display: none;
        }
        @media (prefers-color-scheme: dark) {
          .light-mode { display: none; }
          .dark-mode { display: block; }
        }
      </style>
      <!--[if mso]>
      <style>
        .container {
          width: 600px !important;
        }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: ${EMAIL_CONFIG.FONT_FAMILY}; 
                 background-color: #f5f7fa; color: ${EMAIL_CONFIG.TEXT_PRIMARY}; 
                 line-height: 1.6;">
      <!--[if mso]>
        <div style="background-color: #f5f7fa;">
      <![endif]-->
      
      ${preheader ? `
        <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; 
                    opacity: 0; overflow: hidden;">
          ${preheader}
        </div>
      ` : ''}
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" 
                   style="max-width: ${EMAIL_CONFIG.MAX_WIDTH}; background-color: #ffffff; 
                          border-radius: ${EMAIL_CONFIG.BORDER_RADIUS}; overflow: hidden; 
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 0;">
                  ${templateUtils.generateHeader(orgOptions)}
                  
                  <div style="padding: 0 40px 40px;">
                    ${content}
                  </div>
                  
                  ${templateUtils.generateFooter({
                    ...orgOptions,
                    unsubscribeLink,
                    privacyPolicyLink,
                    termsLink
                  })}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!--[if mso]>
        </div>
      <![endif]-->
    </body>
    </html>
  `;
};

/**
 * Assessment invitation template
 */
export const assessmentInviteTemplate = (data) => {
  const {
    assessment,
    inviteLink,
    candidate,
    assessor,
    organization,
    expiryDays = 7,
    instructions = [],
    customMessage
  } = data;

  const content = `
    <h2 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
      Assessment Invitation
    </h2>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0 0 20px 0; font-size: 16px;">
      Hello ${candidate.name ? candidate.name : 'there'},<br>
      You've been invited by ${assessor.name} to complete an assessment.
    </p>
    
    ${templateUtils.generateCard({
      title: assessment.title,
      content: assessment.description || 'Please complete this assessment at your earliest convenience.',
      border: true
    })}
    
    ${instructions.length > 0 ? `
      <h3 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 25px 0 15px 0; font-size: 18px; font-weight: 600;">
        Instructions
      </h3>
      ${templateUtils.generateSteps(instructions)}
    ` : ''}
    
    ${customMessage ? `
      <div style="background-color: ${EMAIL_CONFIG.SECONDARY_COLOR}; 
                  border-left: 4px solid ${EMAIL_CONFIG.PRIMARY_COLOR}; 
                  padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: ${EMAIL_CONFIG.TEXT_PRIMARY}; font-style: italic;">
          ${customMessage}
        </p>
      </div>
    ` : ''}
    
    ${templateUtils.generateButton({
      text: 'Start Assessment',
      url: inviteLink,
      size: 'large',
      color: EMAIL_CONFIG.PRIMARY_COLOR
    })}
    
    <div style="margin-top: 30px; padding: 15px; background-color: ${EMAIL_CONFIG.SECONDARY_COLOR}; 
                border-radius: ${EMAIL_CONFIG.BORDER_RADIUS};">
      <h4 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
        Important Information
      </h4>
      <ul style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>This assessment will take approximately ${assessment.duration || '30-45'} minutes</li>
        <li>You'll need a stable internet connection</li>
        <li>Make sure you're in a quiet environment</li>
        <li>This link expires in ${expiryDays} days</li>
        ${assessment.allowRetake === false ? '<li>Only one attempt is allowed</li>' : ''}
      </ul>
    </div>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_LIGHT}; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
      Questions? Contact ${assessor.name} at 
      <a href="mailto:${assessor.email}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">
        ${assessor.email}
      </a>
    </p>
  `;

  const html = generateEmailWrapper(content, {
    subject: `Assessment Invitation: ${assessment.title}`,
    preheader: `You've been invited to take "${assessment.title}". Click to start.`,
    organization,
    unsubscribeLink: candidate.unsubscribeLink
  });

  const text = `Assessment Invitation: ${assessment.title}

Hello ${candidate.name ? candidate.name : 'there'},

You've been invited by ${assessor.name} to complete the assessment "${assessment.title}".

${assessment.description ? `Description: ${assessment.description}` : ''}

Start your assessment here: ${inviteLink}

This link expires in ${expiryDays} days.

Questions? Contact ${assessor.name} at ${assessor.email}`;

  return {
    subject: `Assessment Invitation: ${assessment.title}`,
    html,
    text,
    to: candidate.email,
    cc: assessor.ccEmail ? [assessor.ccEmail] : [],
    bcc: assessor.bccEmail ? [assessor.bccEmail] : []
  };
};

/**
 * Password reset template
 */
export const resetPasswordTemplate = (data) => {
  const {
    resetLink,
    user,
    organization,
    expiryHours = 1
  } = data;

  const content = `
    <h2 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
      Reset Your Password
    </h2>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0 0 20px 0; font-size: 16px;">
      Hello ${user.name ? user.name : 'there'},<br>
      We received a request to reset your password for your Assessly account.
    </p>
    
    ${templateUtils.generateButton({
      text: 'Reset Password',
      url: resetLink,
      size: 'large',
      color: EMAIL_CONFIG.PRIMARY_COLOR
    })}
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 20px 0; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; 
         word-break: break-all; font-size: 13px;">
        ${resetLink}
      </a>
    </p>
    
    <div style="margin-top: 30px; padding: 15px; background-color: #fff3e0; 
                border-left: 4px solid ${EMAIL_CONFIG.WARNING_COLOR}; 
                border-radius: 4px;">
      <h4 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
        Security Notice
      </h4>
      <ul style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>This link expires in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}</li>
        <li>If you didn't request this, you can safely ignore this email</li>
        <li>Your password will not change until you create a new one</li>
      </ul>
    </div>
  `;

  const html = generateEmailWrapper(content, {
    subject: 'Reset Your Assessly Password',
    preheader: 'Reset your password by clicking the link below.',
    organization
  });

  const text = `Reset Your Password

Hello ${user.name ? user.name : 'there'},

We received a request to reset your password for your Assessly account.

Reset your password here: ${resetLink}

This link expires in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.

If you didn't request this password reset, please ignore this email.`;

  return {
    subject: 'Reset Your Assessly Password',
    html,
    text,
    to: user.email
  };
};

/**
 * Welcome email template
 */
export const welcomeTemplate = (data) => {
  const {
    user,
    organization,
    dashboardLink,
    setupSteps = []
  } = data;

  const content = `
    <h2 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
      Welcome to Assessly!
    </h2>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0 0 20px 0; font-size: 16px;">
      Hello ${user.name ? user.name : 'there'},<br>
      Welcome to Assessly${organization ? ` and ${organization.name}` : ''}! 
      We're excited to have you onboard.
    </p>
    
    ${templateUtils.generateCard({
      title: 'Your Account is Ready',
      content: 'You can now access all features of the Assessly Platform.',
      icon: 'https://assessly.com/icons/welcome.png',
      border: true
    })}
    
    ${setupSteps.length > 0 ? `
      <h3 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 25px 0 15px 0; font-size: 18px; font-weight: 600;">
        Get Started
      </h3>
      ${templateUtils.generateSteps(setupSteps)}
    ` : ''}
    
    ${templateUtils.generateButton({
      text: 'Go to Dashboard',
      url: dashboardLink,
      size: 'large',
      color: EMAIL_CONFIG.SUCCESS_COLOR
    })}
    
    <div style="margin-top: 30px; display: flex; flex-wrap: wrap; gap: 15px;">
      <div style="flex: 1; min-width: 200px;">
        ${templateUtils.generateCard({
          title: 'Create Assessments',
          content: 'Design custom assessments with various question types.',
          backgroundColor: EMAIL_CONFIG.SECONDARY_COLOR,
          border: false
        })}
      </div>
      <div style="flex: 1; min-width: 200px;">
        ${templateUtils.generateCard({
          title: 'Invite Candidates',
          content: 'Share assessment links with candidates and track progress.',
          backgroundColor: EMAIL_CONFIG.SECONDARY_COLOR,
          border: false
        })}
      </div>
      <div style="flex: 1; min-width: 200px;">
        ${templateUtils.generateCard({
          title: 'Analyze Results',
          content: 'Get detailed analytics and insights from assessments.',
          backgroundColor: EMAIL_CONFIG.SECONDARY_COLOR,
          border: false
        })}
      </div>
    </div>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
      Need help getting started? 
      <a href="https://docs.assessly.com" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">
        Check our documentation
      </a> or 
      <a href="mailto:support@assessly.com" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">
        contact support
      </a>
    </p>
  `;

  const html = generateEmailWrapper(content, {
    subject: `Welcome to Assessly${organization ? ` | ${organization.name}` : ''}!`,
    preheader: 'Get started with your new Assessly account.',
    organization
  });

  const text = `Welcome to Assessly${organization ? ` and ${organization.name}` : ''}!

Hello ${user.name ? user.name : 'there'},

Welcome to Assessly! We're excited to have you onboard.

Access your dashboard here: ${dashboardLink}

Get started by:
1. Creating your first assessment
2. Inviting candidates
3. Analyzing results

Need help? Check our documentation at https://docs.assessly.com
or contact support at support@assessly.com`;

  return {
    subject: `Welcome to Assessly${organization ? ` | ${organization.name}` : ''}!`,
    html,
    text,
    to: user.email
  };
};

/**
 * Assessment completion notification template
 */
export const assessmentCompleteTemplate = (data) => {
  const {
    assessment,
    candidate,
    assessor,
    score,
    organization,
    reportLink,
    nextSteps = []
  } = data;

  const scoreColor = score >= 80 ? EMAIL_CONFIG.SUCCESS_COLOR : 
                     score >= 60 ? EMAIL_CONFIG.WARNING_COLOR : 
                     EMAIL_CONFIG.ERROR_COLOR;

  const content = `
    <h2 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
      Assessment Completed
    </h2>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0 0 20px 0; font-size: 16px;">
      Hello ${assessor.name},<br>
      ${candidate.name} has completed the assessment "${assessment.title}".
    </p>
    
    ${templateUtils.generateCard({
      title: 'Assessment Results',
      content: `
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: 700; color: ${scoreColor};">
              ${score}%
            </div>
            <div style="font-size: 14px; color: ${EMAIL_CONFIG.TEXT_LIGHT};">Score</div>
          </div>
          <div style="flex: 1;">
            <div style="margin-bottom: 8px;">
              <strong style="color: ${EMAIL_CONFIG.TEXT_PRIMARY};">Candidate:</strong> 
              ${candidate.name} (${candidate.email})
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: ${EMAIL_CONFIG.TEXT_PRIMARY};">Completed:</strong> 
              ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div>
              <strong style="color: ${EMAIL_CONFIG.TEXT_PRIMARY};">Duration:</strong> 
              ${assessment.duration || 'Not recorded'}
            </div>
          </div>
        </div>
      `,
      border: true
    })}
    
    ${reportLink ? templateUtils.generateButton({
      text: 'View Detailed Report',
      url: reportLink,
      size: 'medium',
      color: EMAIL_CONFIG.PRIMARY_COLOR
    }) : ''}
    
    ${nextSteps.length > 0 ? `
      <h3 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 25px 0 15px 0; font-size: 18px; font-weight: 600;">
        Recommended Next Steps
      </h3>
      ${templateUtils.generateSteps(nextSteps)}
    ` : ''}
    
    <p style="color: ${EMAIL_CONFIG.TEXT_LIGHT}; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
      This is an automated notification. To manage notifications, visit your 
      <a href="${organization ? organization.settingsLink : 'https://assessly.com/settings'}" 
         style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">
        account settings
      </a>.
    </p>
  `;

  const html = generateEmailWrapper(content, {
    subject: `Assessment Completed: ${assessment.title}`,
    preheader: `${candidate.name} completed ${assessment.title} with score ${score}%.`,
    organization
  });

  const text = `Assessment Completed: ${assessment.title}

Hello ${assessor.name},

${candidate.name} has completed the assessment "${assessment.title}".

Results:
• Score: ${score}%
• Candidate: ${candidate.name} (${candidate.email})
• Completed: ${new Date().toLocaleDateString()}
• Duration: ${assessment.duration || 'Not recorded'}

${reportLink ? `View detailed report: ${reportLink}` : ''}

This is an automated notification.`;

  return {
    subject: `Assessment Completed: ${assessment.title}`,
    html,
    text,
    to: assessor.email,
    cc: assessment.ccEmails || [],
    bcc: assessment.bccEmails || []
  };
};

/**
 * Subscription upgrade/downgrade notification
 */
export const subscriptionChangeTemplate = (data) => {
  const {
    user,
    organization,
    oldPlan,
    newPlan,
    effectiveDate,
    billingAmount,
    billingPeriod,
    featuresChanged = [],
    contactSupportLink = 'https://assessly-gedp.onrender.com/support'
  } = data;

  const isUpgrade = newPlan.tier > (oldPlan?.tier || 0);
  const action = isUpgrade ? 'upgraded' : 'downgraded';

  const content = `
    <h2 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
      Subscription ${isUpgrade ? 'Upgraded' : 'Changed'}
    </h2>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0 0 20px 0; font-size: 16px;">
      Hello ${user.name ? user.name : 'there'},<br>
      Your subscription has been ${action} from <strong>${oldPlan?.name || 'Free'}</strong> 
      to <strong>${newPlan.name}</strong>.
    </p>
    
    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 30px 0;">
      <div style="flex: 1; min-width: 250px;">
        <div style="background-color: ${EMAIL_CONFIG.SECONDARY_COLOR}; 
                    padding: 20px; border-radius: ${EMAIL_CONFIG.BORDER_RADIUS};">
          <h3 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
            New Plan Details
          </h3>
          <div style="font-size: 28px; font-weight: 700; color: ${EMAIL_CONFIG.PRIMARY_COLOR}; 
                      margin-bottom: 10px;">
            ${formatCurrency(billingAmount, newPlan.currency)}
          </div>
          <div style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin-bottom: 15px;">
            per ${billingPeriod}
          </div>
          <ul style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>${newPlan.features.maxUsers} users</li>
            <li>${newPlan.features.maxAssessments} assessments</li>
            <li>${formatStorage(newPlan.features.maxStorage)} storage</li>
            ${newPlan.features.apiAccess ? '<li>API Access</li>' : ''}
            ${newPlan.features.prioritySupport ? '<li>Priority Support</li>' : ''}
          </ul>
        </div>
      </div>
      
      ${featuresChanged.length > 0 ? `
        <div style="flex: 1; min-width: 250px;">
          <div style="background-color: ${isUpgrade ? '#e8f5e9' : '#ffebee'}; 
                      padding: 20px; border-radius: ${EMAIL_CONFIG.BORDER_RADIUS};">
            <h3 style="color: ${isUpgrade ? EMAIL_CONFIG.SUCCESS_COLOR : EMAIL_CONFIG.ERROR_COLOR}; 
                       margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              ${isUpgrade ? 'New Features' : 'Feature Changes'}
            </h3>
            <ul style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; padding-left: 20px; font-size: 14px;">
              ${featuresChanged.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        </div>
      ` : ''}
    </div>
    
    <div style="margin: 30px 0; padding: 15px; background-color: ${EMAIL_CONFIG.SECONDARY_COLOR}; 
                border-radius: ${EMAIL_CONFIG.BORDER_RADIUS};">
      <h4 style="color: ${EMAIL_CONFIG.TEXT_PRIMARY}; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
        Effective Date
      </h4>
      <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 0; font-size: 14px;">
        Changes will take effect on <strong>${formatDate(effectiveDate, 'LONG')}</strong>.
        ${isUpgrade ? 'You may be charged a prorated amount for the current billing period.' : ''}
      </p>
    </div>
    
    <p style="color: ${EMAIL_CONFIG.TEXT_SECONDARY}; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
      Questions about your subscription? 
      <a href="${contactSupportLink}" style="color: ${EMAIL_CONFIG.PRIMARY_COLOR}; text-decoration: none;">
        Contact our support team
      </a>
    </p>
  `;

  const html = generateEmailWrapper(content, {
    subject: `Subscription ${isUpgrade ? 'Upgraded' : 'Changed'}: ${newPlan.name}`,
    preheader: `Your subscription has been ${action} to ${newPlan.name}.`,
    organization
  });

  const text = `Subscription ${action.toUpperCase()}

Hello ${user.name ? user.name : 'there'},

Your subscription has been ${action} from ${oldPlan?.name || 'Free'} to ${newPlan.name}.

New Plan: ${newPlan.name}
Price: ${formatCurrency(billingAmount, newPlan.currency)} per ${billingPeriod}
Effective Date: ${formatDate(effectiveDate, 'LONG')}

${featuresChanged.length > 0 ? `
${isUpgrade ? 'New Features:' : 'Feature Changes:'}
${featuresChanged.map(f => `• ${f}`).join('\n')}
` : ''}

Questions? Contact support: ${contactSupportLink}`;

  return {
    subject: `Subscription ${isUpgrade ? 'Upgraded' : 'Changed'}: ${newPlan.name}`,
    html,
    text,
    to: user.email,
    cc: organization?.billingEmail ? [organization.billingEmail] : []
  };
};

// Helper formatting functions (would be imported from formatters.js)
const formatCurrency = (amount, currency) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
};

const formatDate = (date, format) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatStorage = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

/**
 * Generate email preview for testing
 */
export const generateEmailPreview = (templateName, data) => {
  const templates = {
    assessmentInvite: assessmentInviteTemplate,
    resetPassword: resetPasswordTemplate,
    welcome: welcomeTemplate,
    assessmentComplete: assessmentCompleteTemplate,
    subscriptionChange: subscriptionChangeTemplate
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }

  return template(data);
};

export default {
  assessmentInviteTemplate,
  resetPasswordTemplate,
  welcomeTemplate,
  assessmentCompleteTemplate,
  subscriptionChangeTemplate,
  generateEmailPreview,
  EMAIL_CONFIG,
  templateUtils
};

// Templates/emailTemplates.jsx

// Placeholder for the organization's logo URL
const LOGO_URL_PLACEHOLDER = "https://[YOUR_DOMAIN]/logo.png"; 

/**
 * Template for inviting a candidate to take an assessment.
 * @param {object} assessment - { title, description }
 * @param {string} inviteLink - URL to start the assessment.
 * @returns {object} Email object with subject, html, and text.
 */
export const assessmentInviteTemplate = (assessment, inviteLink) => ({
  subject: `You've been invited to take an assessment: ${assessment.title}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 20px; padding: 10px 0; background-color: #f8f9fa;">
        <img src="${LOGO_URL_PLACEHOLDER}" alt="Assessly Logo" style="height: 40px;"/>
      </div>
      <h2 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Assessment Invitation</h2>
      <p>You've been invited by an Assessor to complete the assessment:</p>
      <h3 style="color: #3f51b5;">${assessment.title}</h3>
      ${assessment.description ? `<p style="color: #4a5568;">${assessment.description}</p>` : ''}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" 
           style="background-color: #3f51b5; color: white; 
                  padding: 12px 24px; border-radius: 8px; 
                  text-decoration: none; font-weight: 600; 
                  display: inline-block;">
          Start Assessment
        </a>
      </div>
      <p style="font-size: 14px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This link will expire in 7 days. If you have questions, please contact your assessor.
      </p>
    </div>
  `,
  text: `You've been invited to take the assessment "${assessment.title}". 
  Click here to begin: ${inviteLink}`
});

/**
 * Template for sending a password reset link.
 * @param {string} resetLink - URL to reset the password.
 * @returns {object} Email object with subject, html, and text.
 */
export const resetPasswordTemplate = (resetLink) => ({
  subject: 'Reset Your Assessly Password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 20px; padding: 10px 0; background-color: #f8f9fa;">
        <img src="${LOGO_URL_PLACEHOLDER}" alt="Assessly Logo" style="height: 40px;"/>
      </div>
      <h2 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Password Reset Request</h2>
      <p>You requested a password reset. Click the button below to complete the process:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #3f51b5; color: white; 
                  padding: 12px 24px; border-radius: 8px; 
                  text-decoration: none; font-weight: 600;
                  display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #718096; text-align: center;">
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      </p>
    </div>
  `,
  text: `Click here to reset your password: ${resetLink}`
});

/**
 * Template for a new user welcome email.
 * @param {string} loginLink - URL to the login page.
 * @returns {object} Email object with subject, html, and text.
 */
export const welcomeTemplate = (loginLink) => ({
  subject: 'Welcome to Assessly!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 20px; padding: 10px 0; background-color: #f8f9fa;">
        <img src="${LOGO_URL_PLACEHOLDER}" alt="Assessly Logo" style="height: 40px;"/>
      </div>
      <h2 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Welcome to Assessly</h2>
      <p>Thank you for joining Assessly, the modern AI-Powered Assessment Platform!</p>
      <p>You can now log in and start creating or taking assessments.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginLink}" 
           style="background-color: #4caf50; color: white; 
                  padding: 12px 24px; border-radius: 8px; 
                  text-decoration: none; font-weight: 600;
                  display: inline-block;">
          Go to Dashboard
        </a>
      </div>
      <p style="font-size: 14px; color: #718096; text-align: center;">
        Happy assessing!
      </p>
    </div>
  `,
  text: `Welcome to Assessly! Log in here: ${loginLink}`
});

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../src/api/templates/emails');

// Template definitions
const templates = {
  'user-welcome.hbs': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to {{organizationName}}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      background: white;
      padding: 40px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .welcome-text {
      font-size: 18px;
      color: #4a5568;
      margin-bottom: 30px;
    }
    .highlight {
      background: #f0f4ff;
      border-left: 4px solid #4f46e5;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .cta-button {
      display: inline-block;
      background: #4f46e5;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
      text-align: center;
      margin: 20px 0;
    }
    .cta-button:hover {
      background: #4338ca;
    }
    .features {
      margin: 40px 0;
    }
    .feature {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .feature-icon {
      color: #4f46e5;
      margin-right: 15px;
      font-size: 20px;
    }
    .footer {
      text-align: center;
      color: #718096;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 20px;
      }
      .header {
        padding: 30px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{organizationName}}!</h1>
      <p style="opacity: 0.9; margin-top: 10px;">Your assessment platform is ready</p>
    </div>
    
    <div class="content">
      <div class="welcome-text">
        <p>Hello <strong>{{name}}</strong>,</p>
        <p>Welcome to {{organizationName}}! Your account has been successfully created.</p>
        <p>Your role: <strong>{{role}}</strong></p>
      </div>
      
      <div class="highlight">
        <p style="margin: 0; font-weight: 600; color: #2d3748;">
          Your account is now active and ready to use.
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="cta-button">Access Your Dashboard</a>
      </div>
      
      <div class="features">
        <p style="font-weight: 600; color: #2d3748; margin-bottom: 20px;">What you can do:</p>
        
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Create and manage assessments</span>
        </div>
        
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Invite candidates and track progress</span>
        </div>
        
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Access detailed analytics and reports</span>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          Need help? Contact support: <a href="mailto:support@assessly.com" style="color: #4f46e5;">support@assessly.com</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
      <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
        This email was sent to {{email}}
      </p>
    </div>
  </div>
</body>
</html>`,

  'organization-invitation.hbs': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join {{organizationName}}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      background: white;
      padding: 40px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .inviter-info {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .role-badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .cta-button {
      display: inline-block;
      background: #059669;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
      text-align: center;
      margin: 20px 0;
    }
    .cta-button:hover {
      background: #047857;
    }
    .expiry-notice {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 15px;
      border-radius: 6px;
      margin: 25px 0;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      color: #718096;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 20px;
      }
      .header {
        padding: 30px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
      <p style="opacity: 0.9; margin-top: 10px;">Join {{organizationName}}</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      <p>You've been invited by <strong>{{inviterName}}</strong> to join <strong>{{organizationName}}</strong>.</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <div class="role-badge">{{role}}</div>
      </div>
      
      <div class="inviter-info">
        <p style="margin: 0;">
          <strong>Organization:</strong> {{organizationName}}<br>
          <strong>Invited by:</strong> {{inviterName}} ({{inviterEmail}})<br>
          <strong>Role:</strong> {{role}}
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{invitationUrl}}" class="cta-button">Accept Invitation</a>
      </div>
      
      <div class="expiry-notice">
        ⏰ This invitation expires in <strong>{{expiresIn}}</strong>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        If you didn't expect this invitation, please ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,

  'password-reset.hbs': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      background: white;
      padding: 40px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .security-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .cta-button {
      display: inline-block;
      background: #dc2626;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
      text-align: center;
      margin: 20px 0;
    }
    .cta-button:hover {
      background: #b91c1c;
    }
    .footer {
      text-align: center;
      color: #718096;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 20px;
      }
      .header {
        padding: 30px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
      <p style="opacity: 0.9; margin-top: 10px;">Secure your account</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center;">
        <a href="{{resetUrl}}" class="cta-button">Reset Password</a>
      </div>
      
      <div class="security-alert">
        <p style="margin: 0; font-size: 14px;">
          <strong>Security Notice:</strong><br>
          This link expires in <strong>{{expiresIn}}</strong>.<br>
          If you didn't request this, please ignore this email.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        Or copy this link:<br>
        <span style="word-break: break-all;">{{resetUrl}}</span>
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; {{currentYear}} Assessly Platform. All rights reserved.</p>
      <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
        This is an automated security email.
      </p>
    </div>
  </div>
</body>
</html>`
};

async function setupEmailTemplates() {
  try {
    // Create templates directory
    await fs.mkdir(templatesDir, { recursive: true });
    console.log('✅ Created directory:', templatesDir);

    // Create each template file
    for (const [filename, content] of Object.entries(templates)) {
      const filePath = path.join(templatesDir, filename);
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Created: ${filename}`);
    }

    console.log('\n🎉 Email templates setup complete!');
    console.log('\n📁 Location: src/api/templates/emails/');
    console.log('\n📄 Templates created:');
    Object.keys(templates).forEach(template => {
      console.log(`  • ${template}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up email templates:', error);
  }
}

// Run setup
setupEmailTemplates();

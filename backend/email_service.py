import os
import logging
from typing import Optional, List
import resend

logger = logging.getLogger(__name__)

# ---------------------------
# Configuration
# ---------------------------
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("EMAIL_FROM_ADDRESS", "Assessly Platform <noreply@assesslyplatform.com>")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@assesslyplatform.com")
INFO_EMAIL = os.getenv("INFO_EMAIL", "info@assesslyplatform.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://assesslyplatform.com")

EMAIL_ENABLED = bool(RESEND_API_KEY)

if not EMAIL_ENABLED:
    logger.warning("RESEND_API_KEY is not set - Email service will be disabled")


def _init_resend():
    """Initialize Resend API."""
    if not EMAIL_ENABLED:
        return False
    
    try:
        resend.api_key = RESEND_API_KEY
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Resend: {e}")
        return False


# ---------------------------
# Internal Helper
# ---------------------------
def _send_email(to: List[str], subject: str, html_content: str, from_email: Optional[str] = None) -> bool:
    """Send an email using Resend."""
    if not EMAIL_ENABLED:
        logger.warning("Email service is disabled, skipping email send")
        return False
    
    try:
        if not _init_resend():
            return False
        
        params = {
            "from": from_email or FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html_content
        }
        
        result = resend.Emails.send(params)
        logger.info(f"Email sent successfully: {subject} to {to}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


# ---------------------------
# Contact & Demo Emails
# ---------------------------
async def send_contact_notification(
    name: str,
    email: str,
    company: Optional[str],
    message: str
) -> bool:
    """Send notification for contact form submission."""
    subject = f"New Contact Form Submission from {name}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .field {{ margin-bottom: 15px; }}
            .field-label {{ font-weight: 600; color: #555; }}
            .field-value {{ color: #333; }}
            .message-box {{ background: white; border: 1px solid #e1e4e8; border-radius: 6px; padding: 15px; margin-top: 10px; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Contact Form Submission</h1>
            </div>
            <div class="content">
                <div class="field">
                    <div class="field-label">Name:</div>
                    <div class="field-value">{name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Email:</div>
                    <div class="field-value"><a href="mailto:{email}">{email}</a></div>
                </div>
                <div class="field">
                    <div class="field-label">Company:</div>
                    <div class="field-value">{company or 'Not provided'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Message:</div>
                    <div class="message-box">{message.replace('\n', '<br>')}</div>
                </div>
                
                <div class="footer">
                    <p>This email was sent from the contact form on Assessly Platform.</p>
                    <p>Timestamp: {os.getenv('TIMESTAMP', '')}</p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([INFO_EMAIL], subject, html)


async def send_demo_request_notification(
    name: str,
    email: str,
    company: str,
    size: Optional[str],
    notes: Optional[str]
) -> bool:
    """Send notification for demo request."""
    subject = f"New Demo Request: {company}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .field {{ margin-bottom: 15px; }}
            .field-label {{ font-weight: 600; color: #555; }}
            .field-value {{ color: #333; }}
            .notes-box {{ background: white; border: 1px solid #e1e4e8; border-radius: 6px; padding: 15px; margin-top: 10px; }}
            .priority {{ background: #ffeb3b; color: #333; padding: 5px 10px; border-radius: 4px; font-weight: 600; display: inline-block; margin: 10px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
            .action-button {{ display: inline-block; background: #4facfe; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Demo Request</h1>
                <p>Enterprise plan inquiry</p>
            </div>
            <div class="content">
                <div class="priority">🚀 PRIORITY: Follow up within 24 hours</div>
                
                <div class="field">
                    <div class="field-label">Contact Name:</div>
                    <div class="field-value">{name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Email:</div>
                    <div class="field-value"><a href="mailto:{email}">{email}</a></div>
                </div>
                <div class="field">
                    <div class="field-label">Company:</div>
                    <div class="field-value"><strong>{company}</strong></div>
                </div>
                <div class="field">
                    <div class="field-label">Company Size:</div>
                    <div class="field-value">{size or 'Not specified'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Notes:</div>
                    <div class="notes-box">{notes or 'No additional notes provided.'}</div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="mailto:{email}?subject=Assessly%20Platform%20Demo%20Request&body=Hi%20{name}%2C%0A%0AThank%20you%20for%20your%20interest%20in%20Assessly%20Platform!%20We'd%20love%20to%20schedule%20a%20demo%20for%20you.%0A%0ABest%20regards%2C%0AAssessly%20Team" 
                       class="action-button">
                        ✉️ Reply to {name}
                    </a>
                </div>
                
                <div class="footer">
                    <p>This demo request was submitted via Assessly Platform website.</p>
                    <p>Automated notification - please follow up promptly.</p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([INFO_EMAIL, SUPPORT_EMAIL], subject, html)


# ---------------------------
# User Registration & Onboarding
# ---------------------------
async def send_welcome_email(
    name: str,
    email: str,
    organization: str
) -> bool:
    """Send welcome email to new users."""
    subject = f"Welcome to Assessly Platform, {name}!"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 40px; border-radius: 0 0 8px 8px; }}
            .welcome-text {{ font-size: 18px; margin-bottom: 30px; }}
            .feature {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin-bottom: 15px; display: flex; align-items: center; }}
            .feature-icon {{ font-size: 24px; margin-right: 15px; }}
            .action-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }}
            .dashboard-link {{ text-align: center; margin: 30px 0; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Assessly Platform!</h1>
                <p>We're excited to have you on board</p>
            </div>
            <div class="content">
                <div class="welcome-text">
                    <p>Hi <strong>{name}</strong>,</p>
                    <p>Your organization <strong>{organization}</strong> is now set up and ready to use!</p>
                    <p>Here's what you can do right away:</p>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">📝</div>
                    <div>
                        <h3 style="margin: 0 0 5px 0;">Create Your First Assessment</h3>
                        <p style="margin: 0;">Design custom assessments with various question types</p>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">👥</div>
                    <div>
                        <h3 style="margin: 0 0 5px 0;">Invite Candidates</h3>
                        <p style="margin: 0;">Share assessment links with candidates via email or direct link</p>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <div>
                        <h3 style="margin: 0 0 5px 0;">Track Progress</h3>
                        <p style="margin: 0;">Monitor candidate performance with real-time analytics</p>
                    </div>
                </div>
                
                <div class="dashboard-link">
                    <a href="{FRONTEND_URL}/dashboard" class="action-button">
                        Go to Your Dashboard →
                    </a>
                </div>
                
                <div style="margin: 30px 0; padding: 20px; background: #e8f4fd; border-radius: 8px;">
                    <h3 style="margin-top: 0;">Need Help?</h3>
                    <p>Check out our <a href="{FRONTEND_URL}/docs">documentation</a> or contact our support team:</p>
                    <ul>
                        <li>📧 Email: <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></li>
                        <li>💬 Chat: Available in your dashboard</li>
                        <li>📚 Guides: <a href="{FRONTEND_URL}/guides">Getting Started Guide</a></li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p><a href="{FRONTEND_URL}/unsubscribe?email={email}">Unsubscribe</a> | <a href="{FRONTEND_URL}/privacy">Privacy Policy</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([email], subject, html)


# ---------------------------
# Email Verification
# ---------------------------
async def send_email_verification(
    name: str,
    email: str,
    user_id: str
) -> bool:
    """Send email verification link."""
    from datetime import datetime, timedelta
    import secrets
    
    # Generate verification token (in production, this would come from the database)
    token = secrets.token_urlsafe(32)
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}&user_id={user_id}"
    
    subject = "Verify Your Email Address - Assessly Platform"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .verify-button {{ display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }}
            .center {{ text-align: center; }}
            .expiry {{ color: #666; font-size: 14px; margin-top: 20px; }}
            .code-box {{ background: #f5f5f5; border: 1px dashed #ccc; padding: 15px; margin: 20px 0; font-family: monospace; word-break: break-all; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email Address</h1>
                <p>One last step to activate your account</p>
            </div>
            <div class="content">
                <p>Hi <strong>{name}</strong>,</p>
                <p>Thank you for signing up for Assessly Platform! Please verify your email address to complete your registration.</p>
                
                <div class="center">
                    <a href="{verification_link}" class="verify-button">
                        Verify Email Address
                    </a>
                </div>
                
                <p class="expiry">
                    <strong>⚠️ Important:</strong> This verification link will expire in 24 hours.
                </p>
                
                <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
                <div class="code-box">
                    {verification_link}
                </div>
                
                <p>If you didn't create an account with Assessly Platform, you can safely ignore this email.</p>
                
                <div class="footer">
                    <p>This verification email was sent to {email}</p>
                    <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([email], subject, html)


# ---------------------------
# Password Reset
# ---------------------------
async def send_password_reset_email(
    name: str,
    email: str,
    reset_token: str
) -> bool:
    """Send password reset email."""
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    subject = "Reset Your Password - Assessly Platform"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .reset-button {{ display: inline-block; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }}
            .center {{ text-align: center; }}
            .expiry {{ color: #666; font-size: 14px; margin-top: 20px; }}
            .code-box {{ background: #f5f5f5; border: 1px dashed #ccc; padding: 15px; margin: 20px 0; font-family: monospace; word-break: break-all; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Reset Your Password</h1>
                <p>Secure your account</p>
            </div>
            <div class="content">
                <p>Hi <strong>{name}</strong>,</p>
                <p>We received a request to reset the password for your Assessly Platform account.</p>
                
                <div class="center">
                    <a href="{reset_link}" class="reset-button">
                        Reset Password
                    </a>
                </div>
                
                <div class="warning">
                    <p><strong>⚠️ Security Notice:</strong></p>
                    <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
                </div>
                
                <p class="expiry">
                    <strong>Link expires in:</strong> 1 hour
                </p>
                
                <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
                <div class="code-box">
                    {reset_link}
                </div>
                
                <div class="footer">
                    <p>This password reset request was initiated for {email}</p>
                    <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                    <p><a href="{FRONTEND_URL}/security">Learn about our security practices</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([email], subject, html)


async def send_password_reset_confirmation(
    name: str,
    email: str
) -> bool:
    """Send confirmation email after password reset."""
    subject = "Password Updated Successfully - Assessly Platform"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
            .check {{ color: #00b09b; }}
            .security-tips {{ background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Updated Successfully</h1>
                <p>Your account is now more secure</p>
            </div>
            <div class="content">
                <div class="success-icon">
                    <span class="check">✅</span>
                </div>
                
                <p>Hi <strong>{name}</strong>,</p>
                <p>Your Assessly Platform password has been successfully updated.</p>
                
                <div class="security-tips">
                    <h3 style="margin-top: 0; color: #2e7d32;">Security Tips</h3>
                    <ul>
                        <li>Use a strong, unique password for your account</li>
                        <li>Enable two-factor authentication for extra security</li>
                        <li>Never share your password with anyone</li>
                        <li>Regularly update your password</li>
                    </ul>
                </div>
                
                <p>If you did not make this change, please contact our support team immediately:</p>
                <p><a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></p>
                
                <div class="footer">
                    <p>This is a security notification for your account {email}</p>
                    <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                    <p><a href="{FRONTEND_URL}/security">View our security practices</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([email], subject, html)


# ---------------------------
# Additional Email Services
# ---------------------------
async def send_assessment_invitation(
    candidate_name: str,
    candidate_email: str,
    assessment_title: str,
    invitation_link: str,
    expiry_days: int = 7
) -> bool:
    """Send assessment invitation to candidate."""
    subject = f"You're Invited to Take: {assessment_title}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .invite-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }}
            .center {{ text-align: center; }}
            .instructions {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .expiry {{ color: #666; font-size: 14px; margin-top: 20px; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Assessment Invitation</h1>
                <p>{assessment_title}</p>
            </div>
            <div class="content">
                <p>Hi <strong>{candidate_name}</strong>,</p>
                <p>You've been invited to take the following assessment:</p>
                
                <div class="center">
                    <h2 style="margin: 20px 0;">{assessment_title}</h2>
                    <a href="{invitation_link}" class="invite-button">
                        Start Assessment
                    </a>
                </div>
                
                <div class="instructions">
                    <h3 style="margin-top: 0;">Instructions:</h3>
                    <ul>
                        <li>Click the "Start Assessment" button above</li>
                        <li>Complete all questions in the assessment</li>
                        <li>You cannot pause once started</li>
                        <li>Ensure stable internet connection</li>
                    </ul>
                </div>
                
                <p class="expiry">
                    <strong>⏰ Invitation expires in:</strong> {expiry_days} days
                </p>
                
                <div class="footer">
                    <p>This invitation was sent by Assessly Platform</p>
                    <p>If you have any questions, please contact the assessment administrator</p>
                    <p><a href="{FRONTEND_URL}">Learn more about Assessly Platform</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([candidate_email], subject, html)


async def send_admin_notification(
    subject: str,
    message: str,
    level: str = "info"
) -> bool:
    """Send notification to admin/support team."""
    level_colors = {
        "info": "#4facfe",
        "warning": "#ffa726",
        "error": "#ff5252",
        "success": "#00b09b"
    }
    
    color = level_colors.get(level, "#4facfe")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Notification: {subject}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, {color} 0%, #{color}99 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }}
            .level-badge {{ display: inline-block; background: {color}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }}
            .message-box {{ background: white; border: 1px solid #e1e4e8; border-radius: 6px; padding: 15px; margin: 10px 0; }}
            .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 11px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">{subject}</h2>
                <div class="level-badge">{level.upper()}</div>
            </div>
            <div class="content">
                <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
                <p><strong>Environment:</strong> {os.getenv('ENVIRONMENT', 'development')}</p>
                
                <div class="message-box">
                    {message.replace('\n', '<br>')}
                </div>
                
                <div class="footer">
                    <p>Automated notification from Assessly Platform</p>
                </div>
            </div>
        </div>
    </body>
    </html>"""
    
    return _send_email([SUPPORT_EMAIL, INFO_EMAIL], f"[{level.upper()}] {subject}", html)

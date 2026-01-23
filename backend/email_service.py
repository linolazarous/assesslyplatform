# backend/email_service.py
import os
import logging
import secrets
from typing import Optional, List, Dict, Any, Tuple
import resend
from datetime import datetime, timedelta
import jwt
import hashlib
from urllib.parse import quote

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
def _send_email(
    to: List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[Dict]] = None
) -> bool:
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
        
        if reply_to:
            params["reply_to"] = reply_to
        if cc:
            params["cc"] = cc
        if bcc:
            params["bcc"] = bcc
        if attachments:
            params["attachments"] = attachments
        
        result = resend.Emails.send(params)
        logger.info(f"Email sent successfully: {subject} to {to}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def _generate_email_token(data: Dict[str, Any], expires_hours: int = 24) -> str:
    """Generate a secure email token."""
    try:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
        payload["iat"] = datetime.utcnow()
        
        # Use a secret key for email tokens
        secret_key = os.getenv("EMAIL_SECRET_KEY", "email-secret-key-change-in-production")
        
        return jwt.encode(payload, secret_key, algorithm="HS256")
    except Exception as e:
        logger.error(f"Failed to generate email token: {e}")
        raise


def _verify_email_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify an email token."""
    try:
        secret_key = os.getenv("EMAIL_SECRET_KEY", "email-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Email token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid email token: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to verify email token: {e}")
        return None


def _get_email_template(template_name: str, **kwargs) -> str:
    """Get email template with variables replaced."""
    templates = {
        "contact_notification": """<!DOCTYPE html>
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
                <div class="field-value">{company}</div>
            </div>
            <div class="field">
                <div class="field-label">Message:</div>
                <div class="message-box">{message}</div>
            </div>
            <div class="footer">
                <p>This email was sent from the contact form on Assessly Platform.</p>
                <p>Timestamp: {timestamp}</p>
            </div>
        </div>
    </div>
</body>
</html>""",
        # Add more templates here...
    }
    
    template = templates.get(template_name, "")
    if template:
        return template.format(**kwargs)
    return ""


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
    current_year = datetime.now().year
    
    html = f"""<!DOCTYPE html>
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
                <div class="message-box">{message.replace(chr(10), '<br>')}</div>
            </div>
            
            <div class="footer">
                <p>This email was sent from the contact form on Assessly Platform.</p>
                <p>Timestamp: {datetime.now().isoformat()}</p>
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
    
    html = f"""<!DOCTYPE html>
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
                <a href="mailto:{email}?subject=Assessly Platform Demo Request&body=Hi {name}, Thank you for your interest in Assessly Platform! We'd love to schedule a demo for you. Best regards, Assessly Team" 
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


async def send_demo_confirmation(
    name: str,
    email: str,
    company: str,
    scheduled_time: Optional[str] = None
) -> bool:
    """Send confirmation email for demo request."""
    subject = f"Demo Request Confirmation - Assessly Platform"
    
    html = f"""<!DOCTYPE html>
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
        .next-steps {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .contact-info {{ background: #e8f4fd; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Demo Request Received!</h1>
            <p>We'll be in touch shortly</p>
        </div>
        <div class="content">
            <div class="success-icon">
                ✅
            </div>
            
            <p>Hi <strong>{name}</strong>,</p>
            <p>Thank you for your interest in Assessly Platform! We've received your demo request for <strong>{company}</strong>.</p>
            
            {f'<p><strong>Scheduled Time:</strong> {scheduled_time}</p>' if scheduled_time else ''}
            
            <div class="next-steps">
                <h3 style="margin-top: 0;">What happens next:</h3>
                <ol>
                    <li>Our sales team will contact you within 24 hours</li>
                    <li>We'll schedule a personalized demo at your convenience</li>
                    <li>During the demo, we'll show you how Assessly Platform can solve your specific needs</li>
                    <li>You'll get a chance to ask questions and see the platform in action</li>
                </ol>
            </div>
            
            <div class="contact-info">
                <h3 style="margin-top: 0;">Need immediate assistance?</h3>
                <p>Email: <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></p>
                <p>Phone: (555) 123-4567 (Mon-Fri, 9AM-5PM EST)</p>
                <p>Chat: Available on our website</p>
            </div>
            
            <p>In the meantime, you can:</p>
            <ul>
                <li><a href="{FRONTEND_URL}/features">Explore our features</a></li>
                <li><a href="{FRONTEND_URL}/pricing">Check out our pricing plans</a></li>
                <li><a href="{FRONTEND_URL}/docs">Read our documentation</a></li>
            </ul>
            
            <div class="footer">
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                <p>This is an automated confirmation email.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html, reply_to=SUPPORT_EMAIL)


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
    current_year = datetime.now().year
    
    html = f"""<!DOCTYPE html>
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
                <p>© {current_year} Assessly Platform. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
                <p><a href="{FRONTEND_URL}/unsubscribe?email={email}">Unsubscribe</a> | <a href="{FRONTEND_URL}/privacy">Privacy Policy</a></p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html)


async def send_onboarding_series(
    email: str,
    name: str,
    step: int = 1
) -> bool:
    """Send onboarding series emails."""
    subjects = {
        1: "Getting Started with Assessly Platform",
        2: "Create Your First Assessment",
        3: "Invite Candidates and Track Results",
        4: "Advanced Features and Tips"
    }
    
    if step not in subjects:
        return False
    
    subject = subjects[step]
    
    # Different content for each step
    if step == 1:
        html = f"""<!DOCTYPE html>
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
        .step {{ background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .step-number {{ background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Assessly Platform!</h1>
            <p>Day {step} of your onboarding journey</p>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Welcome to Assessly Platform! We're excited to help you get started. Here's your first step:</p>
            
            <div class="step" style="display: flex; align-items: center;">
                <div class="step-number">1</div>
                <div>
                    <h3 style="margin: 0;">Complete Your Profile</h3>
                    <p style="margin: 5px 0 0 0;">Add your organization details and preferences.</p>
                    <a href="{FRONTEND_URL}/profile">Update Profile →</a>
                </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Explore the dashboard</li>
                <li>Check out the template library</li>
                <li>Watch our tutorial videos</li>
            </ul>
            
            <div class="footer">
                <p>This is part of your onboarding series. You'll receive more tips in the coming days.</p>
                <p><a href="{FRONTEND_URL}/unsubscribe/onboarding?email={email}">Unsubscribe from onboarding emails</a></p>
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
) -> Tuple[bool, Optional[str]]:
    """Send email verification link."""
    try:
        # Generate verification token
        token = _generate_email_token({"user_id": user_id, "email": email, "type": "verify"})
        verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
        
        subject = "Verify Your Email Address - Assessly Platform"
        current_year = datetime.now().year
        
        html = f"""<!DOCTYPE html>
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
                <p>© {current_year} Assessly Platform. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
        
        success = _send_email([email], subject, html)
        return success, token if success else None
        
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return False, None


async def verify_email_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify an email verification token."""
    payload = _verify_email_token(token)
    if payload and payload.get("type") == "verify":
        return payload
    return None


async def send_email_verified_confirmation(
    name: str,
    email: str
) -> bool:
    """Send confirmation email after successful verification."""
    subject = "Email Verified Successfully - Assessly Platform"
    
    html = f"""<!DOCTYPE html>
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
        .next-steps {{ background: #e8f4fd; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verified Successfully!</h1>
            <p>Your account is now fully activated</p>
        </div>
        <div class="content">
            <div class="success-icon">
                ✅
            </div>
            
            <p>Hi <strong>{name}</strong>,</p>
            <p>Your email address <strong>{email}</strong> has been successfully verified!</p>
            
            <div class="next-steps">
                <h3 style="margin-top: 0;">Ready to get started?</h3>
                <ul>
                    <li><a href="{FRONTEND_URL}/dashboard">Go to your dashboard</a></li>
                    <li><a href="{FRONTEND_URL}/assessments/new">Create your first assessment</a></li>
                    <li><a href="{FRONTEND_URL}/templates">Browse assessment templates</a></li>
                    <li><a href="{FRONTEND_URL}/docs">Read the documentation</a></li>
                </ul>
            </div>
            
            <p><strong>Need help?</strong> Our support team is here for you:</p>
            <ul>
                <li>📧 Email: <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></li>
                <li>📚 Docs: <a href="{FRONTEND_URL}/docs">Assessly Platform Documentation</a></li>
                <li>🎥 Videos: <a href="{FRONTEND_URL}/tutorials">Tutorial Videos</a></li>
            </ul>
            
            <div class="footer">
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
                <p>This is an automated confirmation email.</p>
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
    email: str
) -> Tuple[bool, Optional[str]]:
    """Send password reset email."""
    try:
        # Generate reset token
        token = _generate_email_token({"email": email, "type": "reset"}, expires_hours=1)
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        
        subject = "Reset Your Password - Assessly Platform"
        current_year = datetime.now().year
        
        html = f"""<!DOCTYPE html>
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
                <p>© {current_year} Assessly Platform. All rights reserved.</p>
                <p><a href="{FRONTEND_URL}/security">Learn about our security practices</a></p>
            </div>
        </div>
    </div>
</body>
</html>"""
        
        success = _send_email([email], subject, html)
        return success, token if success else None
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False, None


async def verify_password_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a password reset token."""
    payload = _verify_email_token(token)
    if payload and payload.get("type") == "reset":
        return payload
    return None


async def send_password_reset_confirmation(
    name: str,
    email: str
) -> bool:
    """Send confirmation email after password reset."""
    subject = "Password Updated Successfully - Assessly Platform"
    current_year = datetime.now().year
    
    html = f"""<!DOCTYPE html>
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
                ✅
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
                <p>© {current_year} Assessly Platform. All rights reserved.</p>
                <p><a href="{FRONTEND_URL}/security">View our security practices</a></p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html)


# ---------------------------
# Assessment & Candidate Emails
# ---------------------------
async def send_assessment_invitation(
    candidate_name: str,
    candidate_email: str,
    assessment_title: str,
    invitation_link: str,
    expiry_days: int = 7,
    instructions: Optional[str] = None,
    duration_minutes: Optional[int] = None
) -> bool:
    """Send assessment invitation to candidate."""
    subject = f"You're Invited to Take: {assessment_title}"
    
    html = f"""<!DOCTYPE html>
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
        .requirements {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }}
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
            
            <div class="requirements">
                <p><strong>Requirements:</strong></p>
                <ul>
                    <li>Stable internet connection</li>
                    <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                    {f'<li>Approximately {duration_minutes} minutes to complete</li>' if duration_minutes else ''}
                    <li>No external help or resources</li>
                </ul>
            </div>
            
            <div class="instructions">
                <h3 style="margin-top: 0;">Instructions:</h3>
                <ul>
                    <li>Click the "Start Assessment" button above</li>
                    <li>Complete all questions in the assessment</li>
                    <li>You cannot pause once started</li>
                    <li>Ensure you have enough time to complete</li>
                    {f'<li>{instructions}</li>' if instructions else ''}
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


async def send_assessment_reminder(
    candidate_name: str,
    candidate_email: str,
    assessment_title: str,
    invitation_link: str,
    days_remaining: int
) -> bool:
    """Send assessment reminder to candidate."""
    subject = f"Reminder: Complete Your Assessment - {assessment_title}"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .reminder-button {{ display: inline-block; background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }}
        .center {{ text-align: center; }}
        .urgency {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Assessment Reminder</h1>
            <p>Don't miss your opportunity</p>
        </div>
        <div class="content">
            <p>Hi <strong>{candidate_name}</strong>,</p>
            <p>This is a friendly reminder that you have an outstanding assessment to complete:</p>
            
            <div class="center">
                <h2 style="margin: 20px 0;">{assessment_title}</h2>
                <a href="{invitation_link}" class="reminder-button">
                    Complete Assessment Now
                </a>
            </div>
            
            <div class="urgency">
                <p><strong>⏰ Time is running out!</strong></p>
                <p>You have <strong>{days_remaining} day{'s' if days_remaining != 1 else ''}</strong> remaining to complete this assessment.</p>
                <p>After this period, the invitation will expire and you won't be able to take the assessment.</p>
            </div>
            
            <p><strong>Need help or have questions?</strong></p>
            <p>If you encounter any issues or have questions about the assessment, please contact the administrator who sent you this invitation.</p>
            
            <div class="footer">
                <p>This is an automated reminder from Assessly Platform</p>
                <p>Assessment link: <a href="{invitation_link}">{invitation_link}</a></p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([candidate_email], subject, html)


async def send_assessment_completed_notification(
    admin_email: str,
    candidate_name: str,
    assessment_title: str,
    score: Optional[float] = None,
    time_taken: Optional[str] = None
) -> bool:
    """Send notification to admin when candidate completes assessment."""
    subject = f"Assessment Completed: {candidate_name} - {assessment_title}"
    
    html = f"""<!DOCTYPE html>
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
        .result-box {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .metric {{ display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }}
        .view-button {{ display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Assessment Completed</h1>
            <p>New results available</p>
        </div>
        <div class="content">
            <p><strong>Candidate:</strong> {candidate_name}</p>
            <p><strong>Assessment:</strong> {assessment_title}</p>
            <p><strong>Completed at:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <div class="result-box">
                <h3 style="margin-top: 0;">Assessment Results</h3>
                
                {f'<div class="metric"><span>Score:</span><strong>{score}%</strong></div>' if score is not None else ''}
                {f'<div class="metric"><span>Time Taken:</span><strong>{time_taken}</strong></div>' if time_taken else ''}
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{FRONTEND_URL}/dashboard/results" class="view-button">
                        View Detailed Results
                    </a>
                </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Review the candidate's answers</li>
                <li>Compare with other candidates</li>
                <li>Download the assessment report</li>
                <li>Provide feedback to the candidate</li>
            </ul>
            
            <div class="footer">
                <p>This is an automated notification from Assessly Platform</p>
                <p>You can adjust notification settings in your dashboard</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([admin_email], subject, html)


async def send_assessment_results_to_candidate(
    candidate_name: str,
    candidate_email: str,
    assessment_title: str,
    score: float,
    feedback: Optional[str] = None,
    next_steps: Optional[str] = None
) -> bool:
    """Send assessment results to candidate."""
    subject = f"Your Assessment Results: {assessment_title}"
    
    html = f"""<!DOCTYPE html>
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
        .score-circle {{ width: 120px; height: 120px; border-radius: 50%; background: {'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)' if score >= 70 else 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)' if score >= 50 else 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'}; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 20px auto; }}
        .score-number {{ font-size: 36px; font-weight: bold; }}
        .score-label {{ font-size: 14px; }}
        .feedback {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Assessment Results</h1>
            <p>{assessment_title}</p>
        </div>
        <div class="content">
            <p>Hi <strong>{candidate_name}</strong>,</p>
            <p>Thank you for completing the assessment. Here are your results:</p>
            
            <div class="score-circle">
                <div class="score-number">{score}%</div>
                <div class="score-label">Score</div>
            </div>
            
            {f'<div class="feedback"><h3 style="margin-top: 0;">Feedback:</h3><p>{feedback}</p></div>' if feedback else ''}
            
            {f'<div class="feedback"><h3 style="margin-top: 0;">Next Steps:</h3><p>{next_steps}</p></div>' if next_steps else ''}
            
            <p><strong>What does this mean?</strong></p>
            <ul>
                {'<li>🎉 <strong>Excellent work!</strong> Your score is well above average.</li>' if score >= 85 else ''}
                {'<li>👍 <strong>Good job!</strong> Your performance meets expectations.</li>' if 70 <= score < 85 else ''}
                {'<li>📚 <strong>Room for improvement.</strong> Consider reviewing the material.</li>' if score < 70 else ''}
                <li>The assessment administrator may contact you with further information.</li>
            </ul>
            
            <div class="footer">
                <p>This is an automated results email from Assessly Platform</p>
                <p>If you have any questions about your results, please contact the assessment administrator.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([candidate_email], subject, html)


# ---------------------------
# Billing & Subscription Emails
# ---------------------------
async def send_subscription_confirmation(
    name: str,
    email: str,
    plan_name: str,
    amount: float,
    interval: str,
    next_billing_date: str
) -> bool:
    """Send subscription confirmation email."""
    subject = f"Subscription Confirmation - {plan_name}"
    
    html = f"""<!DOCTYPE html>
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
        .receipt {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .receipt-item {{ display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e1e4e8; }}
        .total {{ font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Confirmed!</h1>
            <p>Thank you for upgrading your plan</p>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Your subscription to <strong>{plan_name}</strong> has been confirmed. Welcome to the next level of assessment management!</p>
            
            <div class="receipt">
                <h3 style="margin-top: 0;">Order Details</h3>
                
                <div class="receipt-item">
                    <span>Plan:</span>
                    <span>{plan_name}</span>
                </div>
                
                <div class="receipt-item">
                    <span>Billing Cycle:</span>
                    <span>{interval.capitalize()}ly</span>
                </div>
                
                <div class="receipt-item">
                    <span>Amount:</span>
                    <span>${amount:.2f}</span>
                </div>
                
                <div class="receipt-item">
                    <span>Next Billing Date:</span>
                    <span>{next_billing_date}</span>
                </div>
                
                <div class="receipt-item total">
                    <span>Total:</span>
                    <span>${amount:.2f}</span>
                </div>
            </div>
            
            <p><strong>What's next?</strong></p>
            <ul>
                <li>Access all premium features immediately</li>
                <li>Explore advanced assessment options</li>
                <li>Invite more candidates</li>
                <li>Use custom branding and analytics</li>
            </ul>
            
            <p>You can manage your subscription, update payment method, or view invoices in your <a href="{FRONTEND_URL}/dashboard/billing">Billing Settings</a>.</p>
            
            <div class="footer">
                <p>This is an automated confirmation email from Assessly Platform</p>
                <p>If you have any questions about your subscription, please contact <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></p>
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html)


async def send_payment_receipt(
    name: str,
    email: str,
    amount: float,
    currency: str,
    invoice_id: str,
    date: str,
    items: List[Dict[str, Any]]
) -> bool:
    """Send payment receipt email."""
    subject = f"Payment Receipt - Invoice #{invoice_id}"
    
    items_html = ""
    for item in items:
        items_html += f"""
                <div class="receipt-item">
                    <span>{item.get('description', 'Item')}</span>
                    <span>${item.get('amount', 0):.2f}</span>
                </div>"""
    
    html = f"""<!DOCTYPE html>
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
        .receipt {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .receipt-item {{ display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e1e4e8; }}
        .total {{ font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Received</h1>
            <p>Thank you for your payment</p>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>We've received your payment. Here's your receipt:</p>
            
            <div class="receipt">
                <h3 style="margin-top: 0;">Invoice #{invoice_id}</h3>
                <p><strong>Date:</strong> {date}</p>
                
                {items_html}
                
                <div class="receipt-item total">
                    <span>Total Paid:</span>
                    <span>${amount:.2f} {currency.upper()}</span>
                </div>
            </div>
            
            <p><strong>Payment Status:</strong> ✅ Paid</p>
            
            <p>You can download a PDF version of this invoice from your <a href="{FRONTEND_URL}/dashboard/billing">Billing Dashboard</a>.</p>
            
            <p><strong>Need help?</strong> Contact our support team:</p>
            <ul>
                <li>Email: <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></li>
                <li>Phone: (555) 123-4567</li>
                <li>Hours: Mon-Fri, 9AM-5PM EST</li>
            </ul>
            
            <div class="footer">
                <p>This is an automated receipt from Assessly Platform</p>
                <p>Please keep this email for your records.</p>
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html)


async def send_subscription_cancelled(
    name: str,
    email: str,
    plan_name: str,
    cancellation_date: str,
    access_until: str
) -> bool:
    """Send subscription cancellation confirmation."""
    subject = f"Subscription Cancelled - {plan_name}"
    
    html = f"""<!DOCTYPE html>
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
        .info-box {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Cancelled</h1>
            <p>We're sorry to see you go</p>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Your subscription to <strong>{plan_name}</strong> has been cancelled as requested.</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                
                <p><strong>Cancellation Date:</strong> {cancellation_date}</p>
                <p><strong>Access Until:</strong> {access_until}</p>
                <p><strong>Plan:</strong> {plan_name}</p>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>You will retain access to all features until <strong>{access_until}</strong></li>
                <li>After this date, you will be downgraded to the Free plan</li>
                <li>Your data will be preserved, but some features will be limited</li>
                <li>No further charges will be made to your account</li>
            </ul>
            
            <p><strong>Changed your mind?</strong> You can reactivate your subscription anytime before {access_until} from your <a href="{FRONTEND_URL}/dashboard/billing">Billing Settings</a>.</p>
            
            <p>We'd love to hear your feedback on how we can improve. Please take a moment to <a href="{FRONTEND_URL}/feedback">share your thoughts</a>.</p>
            
            <div class="footer">
                <p>This is an automated cancellation confirmation from Assessly Platform</p>
                <p>If you have any questions, please contact <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></p>
                <p>We hope to see you again soon!</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html)


# ---------------------------
# Admin & System Emails
# ---------------------------
async def send_admin_notification(
    subject: str,
    message: str,
    level: str = "info",
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """Send notification to admin/support team."""
    level_colors = {
        "info": "#4facfe",
        "warning": "#ffa726",
        "error": "#ff5252",
        "success": "#00b09b"
    }
    
    color = level_colors.get(level, "#4facfe")
    
    metadata_html = ""
    if metadata:
        metadata_html = "<h3>Metadata:</h3><ul>"
        for key, value in metadata.items():
            metadata_html += f"<li><strong>{key}:</strong> {value}</li>"
        metadata_html += "</ul>"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Notification: {subject}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, {color} 0%, {color}99 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
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
                {message.replace(chr(10), '<br>')}
            </div>
            
            {metadata_html}
            
            <div class="footer">
                <p>Automated notification from Assessly Platform</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([SUPPORT_EMAIL, INFO_EMAIL], f"[{level.upper()}] {subject}", html)


async def send_system_alert(
    alert_type: str,
    component: str,
    message: str,
    severity: str = "medium"
) -> bool:
    """Send system alert to admin team."""
    severity_colors = {
        "critical": "#ff5252",
        "high": "#ff9800",
        "medium": "#ffa726",
        "low": "#4caf50"
    }
    
    color = severity_colors.get(severity, "#ffa726")
    
    subject = f"[{severity.upper()}] System Alert: {alert_type} - {component}"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, {color} 0%, {color}99 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }}
        .alert-box {{ background: white; border-left: 4px solid {color}; padding: 15px; margin: 10px 0; }}
        .severity {{ display: inline-block; background: {color}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }}
        .system-info {{ background: #f5f5f5; border: 1px solid #e1e4e8; border-radius: 6px; padding: 15px; margin: 10px 0; }}
        .actions {{ margin-top: 20px; }}
        .action-button {{ display: inline-block; background: {color}; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-size: 14px; }}
        .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 11px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">SYSTEM ALERT</h2>
            <div class="severity">{severity.upper()}</div>
        </div>
        <div class="content">
            <div class="alert-box">
                <h3 style="margin-top: 0;">{alert_type}</h3>
                <p><strong>Component:</strong> {component}</p>
                <p><strong>Message:</strong> {message}</p>
            </div>
            
            <div class="system-info">
                <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
                <p><strong>Environment:</strong> {os.getenv('ENVIRONMENT', 'development')}</p>
                <p><strong>Host:</strong> {os.getenv('HOSTNAME', 'unknown')}</p>
            </div>
            
            <div class="actions">
                <a href="{FRONTEND_URL}/admin/monitoring" class="action-button">View Monitoring</a>
                <a href="{FRONTEND_URL}/admin/logs" class="action-button">Check Logs</a>
                <a href="mailto:{SUPPORT_EMAIL}?subject={quote(subject)}" class="action-button">Contact Team</a>
            </div>
            
            <div class="footer">
                <p>Automated system alert from Assessly Platform Monitoring</p>
                <p>This alert requires attention from the operations team.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([SUPPORT_EMAIL], subject, html)


# ---------------------------
# Newsletter & Marketing
# ---------------------------
async def send_newsletter_subscription(
    name: str,
    email: str
) -> bool:
    """Send welcome email for newsletter subscription."""
    subject = "Welcome to Our Newsletter!"
    
    html = f"""<!DOCTYPE html>
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
        .welcome {{ text-align: center; margin: 20px 0; }}
        .whats-next {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Our Newsletter!</h1>
            <p>Stay updated with the latest from Assessly Platform</p>
        </div>
        <div class="content">
            <div class="welcome">
                <p>Hi <strong>{name}</strong>,</p>
                <p>Thank you for subscribing to our newsletter! We're excited to share the latest updates, tips, and insights with you.</p>
            </div>
            
            <div class="whats-next">
                <h3 style="margin-top: 0;">What to expect:</h3>
                <ul>
                    <li>📈 Monthly product updates and new features</li>
                    <li>💡 Best practices for assessment creation</li>
                    <li>🎯 Tips for improving candidate experience</li>
                    <li>📊 Industry insights and trends</li>
                    <li>🎁 Exclusive offers and early access</li>
                </ul>
            </div>
            
            <p><strong>In the meantime:</strong></p>
            <ul>
                <li><a href="{FRONTEND_URL}/blog">Read our latest blog posts</a></li>
                <li><a href="{FRONTEND_URL}/webinars">Join upcoming webinars</a></li>
                <li><a href="{FRONTEND_URL}/community">Join our community forum</a></li>
                <li><a href="{FRONTEND_URL}/docs">Explore our documentation</a></li>
            </ul>
            
            <div class="footer">
                <p>This newsletter subscription was created for {email}</p>
                <p><a href="{FRONTEND_URL}/unsubscribe/newsletter?email={email}">Unsubscribe</a> | <a href="{FRONTEND_URL}/preferences">Update Preferences</a></p>
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([email], subject, html, from_email=INFO_EMAIL)


# ---------------------------
# Utility Functions
# ---------------------------
def is_email_service_enabled() -> bool:
    """Check if email service is enabled."""
    return EMAIL_ENABLED


async def send_test_email(to_email: str) -> bool:
    """Send a test email to verify email service configuration."""
    subject = "Test Email - Assessly Platform"
    
    html = f"""<!DOCTYPE html>
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
        .success {{ text-align: center; margin: 20px 0; font-size: 48px; }}
        .details {{ background: white; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email Successful!</h1>
            <p>Assessly Platform Email Service</p>
        </div>
        <div class="content">
            <div class="success">
                ✅
            </div>
            
            <p>This is a test email to verify that the Assessly Platform email service is configured correctly.</p>
            
            <div class="details">
                <h3 style="margin-top: 0;">Email Details:</h3>
                <p><strong>Recipient:</strong> {to_email}</p>
                <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
                <p><strong>Environment:</strong> {os.getenv('ENVIRONMENT', 'development')}</p>
                <p><strong>Service:</strong> Resend</p>
                <p><strong>Status:</strong> Sent successfully</p>
            </div>
            
            <p>If you're receiving this email, it means:</p>
            <ol>
                <li>✅ Email service is properly configured</li>
                <li>✅ Resend API key is valid</li>
                <li>✅ SMTP settings are correct</li>
                <li>✅ Email templates are working</li>
            </ol>
            
            <div class="footer">
                <p>This is an automated test email from Assessly Platform</p>
                <p>© {datetime.now().year} Assessly Platform. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    return _send_email([to_email], subject, html)


async def validate_email_address(email: str) -> bool:
    """Simple email validation (basic format check)."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def get_email_stats() -> Dict[str, Any]:
    """Get email service statistics (placeholder for actual implementation)."""
    return {
        "enabled": EMAIL_ENABLED,
        "provider": "Resend",
        "from_email": FROM_EMAIL,
        "support_email": SUPPORT_EMAIL,
        "info_email": INFO_EMAIL
    }


# ---------------------------
# Batch Email Functions
# ---------------------------
async def send_bulk_emails(
    emails: List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
    batch_size: int = 50
) -> Dict[str, Any]:
    """Send emails in batches to avoid rate limits."""
    if not EMAIL_ENABLED:
        return {"success": False, "message": "Email service is disabled", "sent": 0, "failed": len(emails)}
    
    results = {
        "total": len(emails),
        "sent": 0,
        "failed": 0,
        "failed_emails": []
    }
    
    for i in range(0, len(emails), batch_size):
        batch = emails[i:i + batch_size]
        for email in batch:
            try:
                success = _send_email([email], subject, html_content, from_email)
                if success:
                    results["sent"] += 1
                else:
                    results["failed"] += 1
                    results["failed_emails"].append(email)
            except Exception as e:
                logger.error(f"Failed to send email to {email}: {e}")
                results["failed"] += 1
                results["failed_emails"].append(email)
        
        # Small delay between batches to avoid rate limiting
        import asyncio
        await asyncio.sleep(1)
    
    return results


# ---------------------------
# Export
# ---------------------------

__all__ = [
    # Configuration & Utility
    "is_email_service_enabled",
    "send_test_email",
    "validate_email_address",
    "get_email_stats",
    "send_bulk_emails",
    
    # Contact & Demo
    "send_contact_notification",
    "send_demo_request_notification",
    "send_demo_confirmation",
    
    # User Registration & Onboarding
    "send_welcome_email",
    "send_onboarding_series",
    
    # Email Verification
    "send_email_verification",
    "verify_email_token",
    "send_email_verified_confirmation",
    
    # Password Reset
    "send_password_reset_email",
    "verify_password_reset_token",
    "send_password_reset_confirmation",
    
    # Assessment & Candidate
    "send_assessment_invitation",
    "send_assessment_reminder",
    "send_assessment_completed_notification",
    "send_assessment_results_to_candidate",
    
    # Billing & Subscription
    "send_subscription_confirmation",
    "send_payment_receipt",
    "send_subscription_cancelled",
    
    # Admin & System
    "send_admin_notification",
    "send_system_alert",
    
    # Newsletter & Marketing
    "send_newsletter_subscription",
    
    # Constants
    "EMAIL_ENABLED",
    "FROM_EMAIL",
    "SUPPORT_EMAIL",
    "INFO_EMAIL",
    "FRONTEND_URL",
]

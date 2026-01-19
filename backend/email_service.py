import os
from typing import Optional
import resend

# ---------------------------
# Configuration
# ---------------------------
FROM_EMAIL = "Assessly Platform <noreply@assesslyplatform.com>"
SUPPORT_EMAIL = "support@assesslyplatform.com"
INFO_EMAIL = "info@assesslyplatform.com"


def _init_resend():
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not set in environment variables")
    resend.api_key = api_key


# ---------------------------
# Internal Helper
# ---------------------------
def _send_email(params: dict) -> bool:
    try:
        _init_resend()
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


# ---------------------------
# Email Services (Public API)
# ---------------------------
async def send_contact_notification(
    name: str,
    email: str,
    company: Optional[str],
    message: str
) -> bool:
    return _send_email({
        "from": FROM_EMAIL,
        "to": [INFO_EMAIL],
        "subject": f"New Contact Form Submission from {name}",
        "html": f"""
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Company:</strong> {company or 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>{message}</p>
            <hr>
            <p><small>Sent from Assessly Platform</small></p>
        """
    })


async def send_demo_request_notification(
    name: str,
    email: str,
    company: str,
    size: Optional[str],
    notes: Optional[str]
) -> bool:
    return _send_email({
        "from": FROM_EMAIL,
        "to": [INFO_EMAIL, SUPPORT_EMAIL],
        "subject": f"New Demo Request from {company}",
        "html": f"""
            <h2>New Enterprise Demo Request</h2>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Company:</strong> {company}</p>
            <p><strong>Company Size:</strong> {size or 'Not provided'}</p>
            <p><strong>Additional Notes:</strong></p>
            <p>{notes or 'None'}</p>
            <hr>
            <p><small>Sent from Assessly Platform</small></p>
        """
    })


async def send_welcome_email(
    name: str,
    email: str,
    organization: str
) -> bool:
    return _send_email({
        "from": FROM_EMAIL,
        "to": [email],
        "subject": "Welcome to Assessly Platform!",
        "html": f"""
            <h2>Welcome to Assessly, {name}!</h2>
            <p>Your organization <strong>{organization}</strong> is ready.</p>
            <ul>
                <li>Create assessments</li>
                <li>Invite candidates</li>
                <li>View analytics</li>
            </ul>
            <p>
              Support:
              <a href="mailto:{SUPPORT_EMAIL}">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>— The Assessly Team</p>
        """
    })


# ---------------------------
# AUTH EMAILS (🔥 MISSING → FIXED)
# ---------------------------
async def send_email_verification(
    email: str,
    verification_link: str
) -> bool:
    return _send_email({
        "from": FROM_EMAIL,
        "to": [email],
        "subject": "Verify Your Email Address",
        "html": f"""
            <h2>Email Verification</h2>
            <p>Thank you for signing up to Assessly Platform.</p>
            <p>Please verify your email address by clicking the link below:</p>
            <p>
                <a href="{verification_link}">
                    Verify Email
                </a>
            </p>
            <p>If you did not create this account, please ignore this email.</p>
            <hr>
            <p><small>Assessly Platform</small></p>
        """
    })


async def send_password_reset_email(
    email: str,
    reset_link: str
) -> bool:
    return _send_email({
        "from": FROM_EMAIL,
        "to": [email],
        "subject": "Reset Your Password",
        "html": f"""
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password.</p>
            <p>Click the link below to proceed:</p>
            <p>
                <a href="{reset_link}">
                    Reset Password
                </a>
            </p>
            <p>If you did not request this, you can safely ignore this email.</p>
            <hr>
            <p><small>Assessly Platform</small></p>
        """
    })

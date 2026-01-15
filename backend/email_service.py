import resend
import os
from typing import Optional

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY", "")

async def send_contact_notification(name: str, email: str, company: Optional[str], message: str) -> bool:
    """Send notification email for contact form submission"""
    try:
        params = {
            "from": "Assessly Platform <noreply@assesslyplatform.com>",
            "to": ["info@assesslyplatform.com"],
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
        }
        
        if resend.api_key:
            email_response = resend.Emails.send(params)
            return True
        else:
            print("Resend API key not configured. Email not sent.")
            return False
            
    except Exception as e:
        print(f"Error sending contact notification: {str(e)}")
        return False

async def send_demo_request_notification(name: str, email: str, company: str, size: Optional[str], notes: Optional[str]) -> bool:
    """Send notification email for demo request"""
    try:
        params = {
            "from": "Assessly Platform <noreply@assesslyplatform.com>",
            "to": ["info@assesslyplatform.com", "support@assesslyplatform.com"],
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
        }
        
        if resend.api_key:
            email_response = resend.Emails.send(params)
            return True
        else:
            print("Resend API key not configured. Email not sent.")
            return False
            
    except Exception as e:
        print(f"Error sending demo request notification: {str(e)}")
        return False

async def send_welcome_email(name: str, email: str, organization: str) -> bool:
    """Send welcome email to new user"""
    try:
        params = {
            "from": "Assessly Platform <noreply@assesslyplatform.com>",
            "to": [email],
            "subject": "Welcome to Assessly Platform!",
            "html": f"""
                <h2>Welcome to Assessly, {name}!</h2>
                <p>Thank you for creating an account with Assessly Platform.</p>
                <p>Your organization <strong>{organization}</strong> has been successfully set up.</p>
                <p>You can now start creating assessments, inviting candidates, and analyzing results.</p>
                <h3>What's Next?</h3>
                <ul>
                    <li>Create your first assessment</li>
                    <li>Invite team members</li>
                    <li>Explore our analytics dashboard</li>
                    <li>Check out our documentation</li>
                </ul>
                <p>If you have any questions, feel free to reach out to our support team at <a href="mailto:support@assesslyplatform.com">support@assesslyplatform.com</a>.</p>
                <p>Best regards,<br>The Assessly Team</p>
            """
        }
        
        if resend.api_key:
            email_response = resend.Emails.send(params)
            return True
        else:
            print("Resend API key not configured. Email not sent.")
            return False
            
    except Exception as e:
        print(f"Error sending welcome email: {str(e)}")
        return False

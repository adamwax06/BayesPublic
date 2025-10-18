import os
import resend
import logging
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails using Resend API."""

    def __init__(self, api_key: str):
        """Initialize the Email service with Resend API key.

        Args:
            api_key: Resend API key
        """
        self.api_key = api_key
        resend.api_key = api_key

    async def send_welcome_email(
        self, user_email: str, user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a welcome email to a new user.

        Args:
            user_email: The recipient's email address
            user_name: The recipient's name (optional)

        Returns:
            Dict containing the email sending results
        """
        try:
            # Default name if not provided
            display_name = user_name if user_name else "there"

            # Email content
            subject = "Welcome to Bayes - Your AI Math Tutor!"

            # Plain text version
            text_content = f"""Hi {display_name},

Welcome to Bayes, your AI-powered math tutor! We're excited to help you master calculus and build your mathematical confidence.

Get Started with Bayes:
• Upload homework photos to instantly get learning content
• Practice with AI-generated problems tailored to your level
• Get step-by-step explanations for complex concepts
• Check your handwritten work with our OCR technology

Start Learning Now: https://trybayes.com/learn

Have questions? Just reply to this email - we're here to help!

Happy learning,
Adam and Nanda from Bayes

--
This email was sent to {user_email}
trybayes.com"""

            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://trybayes.com/logo.webp" alt="Bayes Logo" style="height: 60px;">
                </div>
                
                <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin-bottom: 20px; text-align: center;">
                    Welcome to Bayes!
                </h1>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hi {display_name},
                </p>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Welcome to Bayes, your AI-powered math tutor! We're excited to help you master calculus and build your mathematical confidence.
                </p>
                
                <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10B981;">
                    <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
                        Get Started with Bayes
                    </h3>
                    <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Upload homework photos to instantly get learning content</li>
                        <li style="margin-bottom: 8px;">Practice with AI-generated problems tailored to your level</li>
                        <li style="margin-bottom: 8px;">Get step-by-step explanations for complex concepts</li>
                        <li style="margin-bottom: 8px;">Check your handwritten work with our OCR technology</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://trybayes.com/learn" 
                       style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                        Start Learning Now
                    </a>
                </div>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Have questions? Just reply to this email - we're here to help!
                </p>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Happy learning,<br>
                    <strong>Adam and Nanda from Bayes</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <div style="text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; margin-bottom: 10px;">
                        This email was sent to {user_email}
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; margin: 0;">
                        <a href="https://trybayes.com" style="color: #10B981; text-decoration: none;">trybayes.com</a>
                    </p>
                </div>
            </div>
            """

            # Send email using Resend with both HTML and text
            email_result = resend.Emails.send(
                {
                    "from": "Bayes <onboarding@onboarding.trybayes.com>",
                    "to": [user_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                }
            )

            logger.info(f"Welcome email sent successfully to {user_email}")

            return {
                "success": True,
                "email_id": email_result.get("id"),
                "recipient": user_email,
                "message": "Welcome email sent successfully",
            }

        except Exception as e:
            logger.error(f"Failed to send welcome email to {user_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "recipient": user_email,
                "message": "Failed to send welcome email",
            }

    async def send_custom_email(
        self,
        user_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a custom email to a user.

        Args:
            user_email: The recipient's email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content of the email (optional, will be auto-generated if not provided)
            user_name: The recipient's name (optional)

        Returns:
            Dict containing the email sending results
        """
        try:
            # Generate plain text from HTML if not provided
            if text_content is None:
                # Simple HTML to text conversion (strips HTML tags)
                import re

                text_content = re.sub("<[^<]+?>", "", html_content)
                text_content = re.sub(r"\s+", " ", text_content).strip()

            # Send email using Resend with both HTML and text
            email_result = resend.Emails.send(
                {
                    "from": "Bayes <onboarding@onboarding.trybayes.com>",
                    "to": [user_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                }
            )

            logger.info(f"Custom email sent successfully to {user_email}")

            return {
                "success": True,
                "email_id": email_result.get("id"),
                "recipient": user_email,
                "subject": subject,
                "message": "Email sent successfully",
            }

        except Exception as e:
            logger.error(f"Failed to send email to {user_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "recipient": user_email,
                "message": "Failed to send email",
            }


# Initialize the email service
def create_email_service() -> Optional[EmailService]:
    """Create and return an EmailService instance if API key is available."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.warning(
            "RESEND_API_KEY not found in environment variables. Email features will be disabled."
        )
        return None

    try:
        return EmailService(api_key)
    except Exception as e:
        logger.error(f"Failed to initialize EmailService: {str(e)}")
        return None


# Global email service instance
email_service = create_email_service()

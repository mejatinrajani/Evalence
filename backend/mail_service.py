import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "mejatinrajani@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "xdwi vbiw ckzq akzi")
SENDER_NAME = "Evalence"

class EmailService:
    """Email service for sending transactional emails via Gmail SMTP."""
    
    @staticmethod
    def send_email(
        recipient_emails: List[str],
        subject: str,
        html_content: str,
        plain_text: Optional[str] = None
    ) -> bool:
        """
        Send an email to one or more recipients.
        
        Args:
            recipient_emails: List of email addresses
            subject: Email subject
            html_content: HTML content of the email
            plain_text: Plain text fallback (optional)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
            msg["To"] = ", ".join(recipient_emails)
            
            # Attach plain text version
            if plain_text:
                part1 = MIMEText(plain_text, "plain")
                msg.attach(part1)
            
            # Attach HTML version
            part2 = MIMEText(html_content, "html")
            msg.attach(part2)
            
            # Connect to Gmail SMTP and send
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, recipient_emails, msg.as_string())
            
            return True
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False
    
    @staticmethod
    def welcome_email(recipient_email: str, full_name: str, role: str) -> bool:
        """Send welcome email to new user."""
        subject = "Welcome to Evalence - Professional Hackathon Management"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <div style="background-color: #4f46e5; padding: 40px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800;">Evalence</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Professional Hackathon Management Platform</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0;">Welcome, {full_name}!</h2>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                            Your account has been successfully created on Evalence. As a <strong>{role}</strong>, you now have access to our comprehensive hackathon management platform.
                        </p>
                        
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #1e293b; margin: 0 0 10px 0;">What you can do:</h3>
                            <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Access your personalized dashboard</li>
                                <li>Manage and participate in hackathons</li>
                                <li>Submit and review projects</li>
                                <li>Track your performance on leaderboards</li>
                            </ul>
                        </div>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 20px 0;">
                            Ready to get started? Sign in to your account now:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/auth/login" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; border-radius: 0; text-decoration: none; font-weight: 600; transition: background-color 0.3s;">Sign In</a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            Questions? Our support team is here to help. Reply to this email or visit our documentation.
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved. | <a href="#" style="color: #4f46e5; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #4f46e5; text-decoration: none;">Terms of Service</a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        plain_text = f"""
Welcome to Evalence, {full_name}!

Your account has been successfully created. You are registered as a {role}.

Sign in here: http://localhost:5173/auth/login

Questions? Reply to this email for support.

Evalence Team
        """
        
        return EmailService.send_email([recipient_email], subject, html_content, plain_text)
    
    @staticmethod
    def hackathon_created_notification(
        mentor_email: str,
        mentor_name: str,
        hackathon_name: str,
        hackathon_id: int
    ) -> bool:
        """Send notification when organizer creates a hackathon."""
        subject = f"Hackathon Created: {hackathon_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Hackathon Created</h1>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px 0;">Great job, {mentor_name}!</h2>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">
                            Your hackathon "<strong>{hackathon_name}</strong>" has been successfully created on Evalence.
                        </p>
                        
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">Next Steps:</h3>
                            <ol style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Add teams and participants</li>
                                <li>Set up evaluation rounds and criteria</li>
                                <li>Invite judges to your hackathon</li>
                                <li>Monitor registrations and submissions</li>
                            </ol>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/dashboard/mentor" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; border-radius: 0; text-decoration: none; font-weight: 600;">Manage Hackathon</a>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        plain_text = f"""
Great job, {mentor_name}!

Your hackathon "{hackathon_name}" has been successfully created on Evalence.

Next Steps:
1. Add teams and participants
2. Set up evaluation rounds and criteria
3. Invite judges to your hackathon
4. Monitor registrations and submissions

Manage your hackathon: http://localhost:5173/dashboard/mentor

Evalence Team
        """
        
        return EmailService.send_email([mentor_email], subject, html_content, plain_text)
    
    @staticmethod
    def score_submitted_notification(
        judge_email: str,
        judge_name: str,
        team_name: str,
        hackathon_name: str,
        score: int,
        max_points: int
    ) -> bool:
        """Send confirmation when judge submits a score."""
        subject = f"Score Submitted for {team_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Score Recorded</h1>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px 0;">Thank you, {judge_name}!</h2>
                        
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="color: #475569; margin: 0 0 10px 0;"><strong>Team:</strong> {team_name}</p>
                            <p style="color: #475569; margin: 0 0 10px 0;"><strong>Event:</strong> {hackathon_name}</p>
                            <p style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Score: {score}/{max_points}</p>
                        </div>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 20px 0;">
                            Your evaluation has been recorded. Keep up the great work!
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/dashboard/judge" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; border-radius: 0; text-decoration: none; font-weight: 600;">Continue Scoring</a>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        plain_text = f"""
Thank you, {judge_name}!

Your evaluation has been recorded.

Team: {team_name}
Event: {hackathon_name}
Score: {score}/{max_points}

Continue scoring: http://localhost:5173/dashboard/judge

Evalence Team
        """
        
        return EmailService.send_email([judge_email], subject, html_content, plain_text)
    
    @staticmethod
    def announcement_notification(
        participant_emails: List[str],
        hackathon_name: str,
        announcement_title: str,
        announcement_body: str
    ) -> bool:
        """Send announcement notification to participants."""
        subject = f"Announcement: {announcement_title} ({hackathon_name})"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">New Announcement</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">{hackathon_name}</p>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px 0; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">{announcement_title}</h2>
                        
                        <div style="color: #475569; line-height: 1.8; margin: 20px 0; background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
                            {announcement_body.replace(chr(10), '<br>')}
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            For more details, check your hackathon dashboard.
                        </p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        plain_text = f"""
New Announcement for {hackathon_name}

{announcement_title}

{announcement_body}

Check your dashboard for more details.

Evalence Team
        """
        
        return EmailService.send_email(participant_emails, subject, html_content, plain_text)
    
    @staticmethod
    def leaderboard_update_notification(
        participant_email: str,
        participant_name: str,
        team_name: str,
        hackathon_name: str,
        rank: int,
        z_score: float
    ) -> bool:
        """Send leaderboard update notification."""
        subject = f"Leaderboard Updated - {team_name} is ranked #{rank}"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Leaderboard Update</h1>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px 0;">Congratulations, {participant_name}!</h2>
                        
                        <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0; color: white;">
                            <p style="font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">CURRENT RANK</p>
                            <p style="font-size: 48px; font-weight: 800; margin: 0 0 10px 0;">#{rank}</p>
                            <p style="font-size: 13px; margin: 10px 0 0 0; opacity: 0.9;">{team_name} • {hackathon_name}</p>
                        </div>
                        
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="color: #475569; margin: 0;"><strong>Z-Score:</strong> <span style="color: #4f46e5; font-weight: 800;">{z_score:.2f}</span></p>
                        </div>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 20px 0;">
                            Keep pushing! Every evaluation brings your team closer to the top. Check the live leaderboard for the latest standings.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/leaderboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; border-radius: 0; text-decoration: none; font-weight: 600;">View Leaderboard</a>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        plain_text = f"""
Congratulations, {participant_name}!

Your team "{team_name}" is now ranked #{rank} in {hackathon_name}!

Z-Score: {z_score:.2f}

View the live leaderboard: http://localhost:5173/leaderboard

Evalence Team
        """
        
        return EmailService.send_email([participant_email], subject, html_content, plain_text)
    
    @staticmethod
    def send_bulk_email(
        recipient_emails: List[str],
        subject: str,
        body: str
    ) -> bool:
        """Send bulk email to multiple recipients."""
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Evalence</h1>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <div style="color: #475569; line-height: 1.8; margin: 20px 0; background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
                            {body.replace(chr(10), '<br>')}
                        </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            © 2026 Evalence. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(recipient_emails, subject, html_content, body)

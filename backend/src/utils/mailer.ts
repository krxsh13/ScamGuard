import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Send a password reset email
 * @param to - Recipient email address
 * @param resetUrl - Password reset URL to include in email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-wrapper {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .header {
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #1f2937;
    }
    .content {
      margin-bottom: 30px;
      color: #4b5563;
      font-size: 16px;
    }
    .reset-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .reset-button:hover {
      background-color: #1d4ed8;
    }
    .reset-link {
      word-break: break-all;
      color: #2563eb;
      text-decoration: underline;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="logo">🛡️ ScamGuard</div>
      
      <div class="header">
        <h1>Reset Your Password</h1>
        <p>We received a request to reset your ScamGuard password.</p>
      </div>

      <div class="content">
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        
        <a href="${resetUrl}" class="reset-button">Reset Password</a>
        
        <div class="warning">
          <strong>If you didn't request this,</strong> please ignore this email or contact support. Your password remains unchanged.
        </div>

        <p>Or copy and paste this link in your browser:</p>
        <div class="reset-link">${resetUrl}</div>
      </div>

      <div class="footer">
        <p>For security reasons, this link expires in 1 hour.</p>
        <p>If you need further assistance, please contact our support team.</p>
        <p>&copy; 2026 ScamGuard. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Password Reset Request

We received a request to reset your ScamGuard password.

Click the link below to reset your password (expires in 1 hour):
${resetUrl}

If you didn't request this, please ignore this email.

For security reasons, this link expires in 1 hour.
    `.trim();

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Reset Your ScamGuard Password',
      html: htmlContent,
      text: textContent,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send a welcome email to new users
 * @param to - Recipient email address
 * @param firstName - User's first name
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-wrapper {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #1f2937;
    }
    .content {
      margin-bottom: 30px;
      color: #4b5563;
      font-size: 16px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="logo">🛡️ ScamGuard</div>
      
      <div class="header">
        <h1>Welcome to ScamGuard, ${firstName}!</h1>
      </div>

      <div class="content">
        <p>Thank you for creating a ScamGuard account. You're now equipped with powerful tools to detect and prevent scams.</p>
        
        <h3>Get Started:</h3>
        <ul>
          <li>Check emails and messages for scam patterns</li>
          <li>Verify suspicious URLs before clicking</li>
          <li>Analyze images for fake or manipulated content</li>
          <li>View your scan history and statistics</li>
        </ul>

        <p>Stay safe and always be cautious of unsolicited messages!</p>
      </div>

      <div class="footer">
        <p>&copy; 2026 ScamGuard. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Welcome to ScamGuard!',
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - welcome email is not critical
  }
}

/**
 * Send an email verification email
 * @param to - Recipient email address
 * @param verificationUrl - Email verification URL to include in email
 * @param firstName - User's first name (optional)
 */
export async function sendVerificationEmail(to: string, verificationUrl: string, firstName: string = 'User'): Promise<void> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-wrapper {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .header {
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #1f2937;
    }
    .content {
      margin-bottom: 30px;
      color: #4b5563;
      font-size: 16px;
    }
    .verify-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #10b981;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .verify-button:hover {
      background-color: #059669;
    }
    .verify-link {
      word-break: break-all;
      color: #10b981;
      text-decoration: underline;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .warning {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="logo">🛡️ ScamGuard</div>
      
      <div class="header">
        <h1>Verify Your Email Address</h1>
        <p>Hi ${firstName}, please verify your email to activate your ScamGuard account.</p>
      </div>

      <div class="content">
        <p>Click the button below to verify your email address and start using all ScamGuard features.</p>
        
        <a href="${verificationUrl}" class="verify-button">Verify Email</a>
        
        <div class="warning">
          <strong>This link expires in 24 hours.</strong> If you didn't create this account, you can safely ignore this email.
        </div>

        <p>Or copy and paste this link in your browser:</p>
        <div class="verify-link">${verificationUrl}</div>
      </div>

      <div class="footer">
        <p>This verification link expires in 24 hours.</p>
        <p>If you need further assistance, please contact our support team.</p>
        <p>&copy; 2026 ScamGuard. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Verify Your Email Address

Hi ${firstName}, please verify your email to activate your ScamGuard account.

Click the link below to verify your email (expires in 24 hours):
${verificationUrl}

If you didn't create this account, you can safely ignore this email.

For security reasons, this link expires in 24 hours.
    `.trim();

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Verify Your ScamGuard Email Address',
      html: htmlContent,
      text: textContent,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

const nodemailer = require('nodemailer');

/**
 * Creates and configures Nodemailer transport based on environment variables
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    if (host) {
      return nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
    // Default to Gmail service if user/pass provided without custom host
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Sends a password reset email to the user
 * @param {string} email - Destination email address
 * @param {string} resetUrl - Complete reset URL including token
 * @param {string} userName - User full name
 */
async function sendPasswordResetEmail(email, resetUrl, userName = 'Campus User') {
  const transporter = createTransporter();

  const subject = 'LabPulse Campus Ops — Password Reset Instructions';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #1e40af; padding: 24px; text-align: center; color: white; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .btn { display: inline-block; background: #1d4ed8; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">LabPulse Campus Operations</h2>
          <p style="margin:4px 0 0; font-size: 13px; opacity: 0.9;">MLRIT Laboratory Management Console</p>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>We received an authorized request to reset the password associated with your institutional account (<code>${email}</code>).</p>
          <p>Click the secure link below to establish a new password. This single-use link is valid for <strong>15 minutes</strong>.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Institutional Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Or copy and paste this URL into your browser:</p>
          <p style="font-size: 12px; word-break: break-all; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${resetUrl}
          </p>
          <p style="font-size: 13px; color: #dc2626;">If you did not request this password reset, please contact the campus network administrator immediately.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} LabPulse Operations Grid &bull; Automated Security Dispatcher
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@labpulse.campus';
      const info = await transporter.sendMail({
        from: `"LabPulse Security" <${fromAddress}>`,
        to: email,
        subject,
        html,
      });
      console.log(`[Email Dispatcher] Password reset email sent to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Dispatcher Error] Failed to send email via SMTP to ${email}:`, err.message);
      // Fallback logging in console
      console.log(`[Simulated Reset Link for ${email}]: ${resetUrl}`);
      return { success: false, error: err.message, fallbackUrl: resetUrl };
    }
  } else {
    // Development fallback simulation
    console.log(`\n======================================================`);
    console.log(`[LabPulse SMTP Simulation] (SMTP credentials not set in .env)`);
    console.log(`Password reset link generated for: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true, fallbackUrl: resetUrl };
  }
}

module.exports = {
  sendPasswordResetEmail,
};

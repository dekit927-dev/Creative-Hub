const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter = null;
let lastSentEmail = null;

function getAppUrl() {
  return process.env.APP_URL || 'http://localhost:3000';
}

function initTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isSecure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
    transporter = null;
  }
  return transporter;
}

initTransporter();

const EmailService = {
  getTransporter() {
    return transporter || initTransporter();
  },

  getLastSentEmail() {
    return lastSentEmail;
  },

  clearLastSentEmail() {
    lastSentEmail = null;
  },

  async sendMail({ to, subject, html, text }) {
    const fromAddress = process.env.EMAIL_FROM || '"CreativeHub Sherubtse" <noreply@sherubtse.edu.bt>';
    const emailData = {
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ')
    };

    lastSentEmail = {
      ...emailData,
      sentAt: new Date().toISOString()
    };

    const activeTransporter = EmailService.getTransporter();

    if (activeTransporter) {
      try {
        const info = await activeTransporter.sendMail(emailData);
        console.log(`[EmailService] Live email dispatched to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId, previewOnly: false };
      } catch (err) {
        console.warn(`[EmailService Warning] Failed to deliver email via SMTP to ${to}:`, err.message);
        // Fall back gracefully so user operations are not blocked
        return { success: false, error: err.message, previewOnly: true };
      }
    } else {
      // Development / test fallback logging
      console.log(`[EmailService Dev/Test] To: ${to} | Subject: "${subject}"`);
      return { success: true, previewOnly: true };
    }
  },

  async sendVerificationEmail(email, fullName, token) {
    const appUrl = getAppUrl();
    const verifyLink = `${appUrl}/verify-email.html?token=${token}`;

    const html = `
      <div style="font-family:'DM Sans', Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; border:1px solid #E2E8F0; border-radius:12px; background:#FFFFFF;">
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #E2E8F0;">
          <h2 style="color:#1E3A8A; margin:0 0 6px;">CreativeHub Sherubtse</h2>
          <span style="color:#64748B; font-size:14px;">Campus Creative Community</span>
        </div>
        <div style="padding:24px 0;">
          <h3 style="color:#0F172A; margin-top:0;">Verify your email address</h3>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Kuzuzangpo la, <strong>${fullName || 'Creator'}</strong>!<br><br>
            Thank you for registering on CreativeHub. To activate your account and start sharing creative artwork, joining challenges, and collaborating with fellow Sherubtse creators, please verify your email address.
          </p>
          <div style="text-align:center; margin:32px 0;">
            <a href="${verifyLink}" style="background:#2563EB; color:#FFFFFF; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:15px; display:inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color:#64748B; font-size:13px; line-height:1.5;">
            Or copy and paste this verification URL into your browser:<br>
            <a href="${verifyLink}" style="color:#2563EB; word-break:break-all;">${verifyLink}</a>
          </p>
          <p style="color:#94A3B8; font-size:12px; margin-top:24px;">
            This link is secure and time-limited (expires in 24 hours). If you did not create an account on CreativeHub, you can safely ignore this email.
          </p>
        </div>
        <div style="border-top:1px solid #E2E8F0; padding-top:16px; text-align:center; font-size:12px; color:#94A3B8;">
          &copy; 2026 CreativeHub &middot; Sherubtse College, Royal University of Bhutan, Kanglung.
        </div>
      </div>
    `;

    return EmailService.sendMail({
      to: email,
      subject: 'Verify your CreativeHub account — Sherubtse College',
      html
    });
  },

  async sendPasswordResetEmail(email, fullName, token) {
    const appUrl = getAppUrl();
    const resetLink = `${appUrl}/reset-password.html?token=${token}`;

    const html = `
      <div style="font-family:'DM Sans', Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; border:1px solid #E2E8F0; border-radius:12px; background:#FFFFFF;">
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #E2E8F0;">
          <h2 style="color:#1E3A8A; margin:0 0 6px;">CreativeHub Sherubtse</h2>
          <span style="color:#64748B; font-size:14px;">Account Security</span>
        </div>
        <div style="padding:24px 0;">
          <h3 style="color:#0F172A; margin-top:0;">Reset your CreativeHub password</h3>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Hello <strong>${fullName || 'User'}</strong>,<br><br>
            We received a request to reset the password for your CreativeHub account associated with <strong>${email}</strong>.
          </p>
          <div style="text-align:center; margin:32px 0;">
            <a href="${resetLink}" style="background:#2563EB; color:#FFFFFF; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:15px; display:inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color:#64748B; font-size:13px; line-height:1.5;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color:#2563EB; word-break:break-all;">${resetLink}</a>
          </p>
          <p style="color:#94A3B8; font-size:12px; margin-top:24px;">
            This link is secure, single-use, and valid for 1 hour. If you did not request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        <div style="border-top:1px solid #E2E8F0; padding-top:16px; text-align:center; font-size:12px; color:#94A3B8;">
          &copy; 2026 CreativeHub &middot; Sherubtse College, Royal University of Bhutan.
        </div>
      </div>
    `;

    return EmailService.sendMail({
      to: email,
      subject: 'Reset your CreativeHub password',
      html
    });
  },

  async sendApplicationSubmittedEmail(email, fullName, opportunityTitle, opportunityType = 'Challenge') {
    const appUrl = getAppUrl();
    const html = `
      <div style="font-family:'DM Sans', Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; border:1px solid #E2E8F0; border-radius:12px; background:#FFFFFF;">
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #E2E8F0;">
          <h2 style="color:#1E3A8A; margin:0 0 6px;">CreativeHub Sherubtse</h2>
          <span style="color:#64748B; font-size:14px;">Application Confirmation</span>
        </div>
        <div style="padding:24px 0;">
          <h3 style="color:#0F172A; margin-top:0;">Application Received!</h3>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Kuzuzangpo la, <strong>${fullName || 'Creator'}</strong>!<br><br>
            Your application for the ${opportunityType.toLowerCase()} <strong>"${opportunityTitle}"</strong> has been successfully submitted and recorded.
          </p>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Current Status: <span style="display:inline-block; background:#FEF3C7; color:#B45309; padding:4px 10px; border-radius:999px; font-weight:700; font-size:13px;">Pending Review</span>
          </p>
          <div style="text-align:center; margin:28px 0;">
            <a href="${appUrl}/applications.html" style="background:#2563EB; color:#FFFFFF; text-decoration:none; padding:11px 24px; border-radius:8px; font-weight:700; font-size:14px; display:inline-block;">
              View My Applications
            </a>
          </div>
          <p style="color:#64748B; font-size:13px;">
            You will receive a notification and update as soon as the reviewers evaluate your submission.
          </p>
        </div>
        <div style="border-top:1px solid #E2E8F0; padding-top:16px; text-align:center; font-size:12px; color:#94A3B8;">
          &copy; 2026 CreativeHub &middot; Sherubtse College, Royal University of Bhutan.
        </div>
      </div>
    `;

    return EmailService.sendMail({
      to: email,
      subject: `Application Submitted: "${opportunityTitle}" — CreativeHub`,
      html
    });
  },

  async sendApplicationDecisionEmail(email, fullName, opportunityTitle, opportunityType = 'Challenge', status = 'Accepted', feedback = '') {
    const appUrl = getAppUrl();
    const isAccepted = status.toLowerCase() === 'accepted';
    const isUnderReview = status.toLowerCase() === 'under review';

    const badgeColor = isAccepted ? '#10B981' : (isUnderReview ? '#3B82F6' : '#EF4444');
    const badgeBg = isAccepted ? '#ECFDF5' : (isUnderReview ? '#EFF6FF' : '#FEF2F2');

    const html = `
      <div style="font-family:'DM Sans', Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; border:1px solid #E2E8F0; border-radius:12px; background:#FFFFFF;">
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #E2E8F0;">
          <h2 style="color:#1E3A8A; margin:0 0 6px;">CreativeHub Sherubtse</h2>
          <span style="color:#64748B; font-size:14px;">Application Status Update</span>
        </div>
        <div style="padding:24px 0;">
          <h3 style="color:#0F172A; margin-top:0;">Update on "${opportunityTitle}"</h3>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Hello <strong>${fullName || 'Applicant'}</strong>,<br><br>
            The status of your application for <strong>"${opportunityTitle}"</strong> has been updated:
          </p>
          <div style="text-align:center; margin:20px 0;">
            <span style="display:inline-block; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}; padding:6px 16px; border-radius:999px; font-weight:800; font-size:15px;">
              ${status}
            </span>
          </div>
          ${feedback ? `
          <div style="background:#F8FAFC; border-left:4px solid #2563EB; padding:12px 16px; margin:20px 0; border-radius:0 8px 8px 0;">
            <strong style="color:#1E293B; font-size:13px; display:block; margin-bottom:4px;">Feedback / Decision Note:</strong>
            <p style="color:#334155; font-size:14px; margin:0; line-height:1.5;">${feedback}</p>
          </div>` : ''}
          <div style="text-align:center; margin:28px 0;">
            <a href="${appUrl}/applications.html" style="background:#2563EB; color:#FFFFFF; text-decoration:none; padding:11px 24px; border-radius:8px; font-weight:700; font-size:14px; display:inline-block;">
              View Application Details
            </a>
          </div>
        </div>
        <div style="border-top:1px solid #E2E8F0; padding-top:16px; text-align:center; font-size:12px; color:#94A3B8;">
          &copy; 2026 CreativeHub &middot; Sherubtse College, Royal University of Bhutan.
        </div>
      </div>
    `;

    return EmailService.sendMail({
      to: email,
      subject: `Application ${status}: "${opportunityTitle}" — CreativeHub`,
      html
    });
  }
};

module.exports = EmailService;

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter = null;
let lastSentEmail = null;

function getAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://creative-hub-e2eh.onrender.com';
  }
  return 'http://localhost:3000';
}

function initTransporter() {
  const rawUser = (process.env.SMTP_USER || '').trim();
  // Strip all whitespace and dashes from password - common when copying Gmail App Passwords (e.g. "abcd efgh ijkl mnop")
  const rawPass = (process.env.SMTP_PASS || '').replace(/[\s-]+/g, '');
  const explicitService = (process.env.SMTP_SERVICE || '').trim().toLowerCase();
  const host = (process.env.SMTP_HOST || '').trim();

  const isGmail = explicitService === 'gmail' ||
                  rawUser.toLowerCase().includes('@gmail.com') ||
                  host.toLowerCase().includes('gmail');

  if (rawUser && rawPass) {
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: rawUser,
          pass: rawPass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000
      });
    } else if (host) {
      const isSecure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || (isSecure ? '465' : '587'), 10),
        secure: isSecure,
        auth: {
          user: rawUser,
          pass: rawPass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        tls: {
          rejectUnauthorized: false
        }
      });
    } else if (explicitService) {
      transporter = nodemailer.createTransport({
        service: explicitService,
        auth: {
          user: rawUser,
          pass: rawPass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000
      });
    }
  } else {
    transporter = null;
  }
  return transporter;
}

initTransporter();

const EmailService = {
  getAppUrl,
  initTransporter,
  isConfigured() {
    const rawUser = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || '').replace(/[\s-]+/g, '');
    const hasHostOrService = Boolean(
      process.env.SMTP_SERVICE ||
      process.env.SMTP_HOST ||
      rawUser.toLowerCase().includes('@gmail.com')
    );
    return Boolean(hasHostOrService && rawUser && rawPass);
  },
  getTransporter() {
    return transporter || initTransporter();
  },

  async verifyTransporter() {
    const trans = EmailService.getTransporter();
    if (!trans) {
      return {
        configured: false,
        connected: false,
        message: 'SMTP credentials not configured in .env (SMTP_USER / SMTP_PASS).'
      };
    }
    try {
      await trans.verify();
      console.log('[EmailService] SMTP Server connection verified and ready to send emails.');
      return { configured: true, connected: true };
    } catch (err) {
      console.error('[EmailService Error] SMTP verification failed:', err.message);
      if (err.message && err.message.includes('Username and Password not accepted')) {
        console.error('[EmailService Hint] Gmail requires a 16-character App Password, NOT your regular Google password.');
        console.error('[EmailService Hint] Generate one at: https://myaccount.google.com/apppasswords');
      }
      return { configured: true, connected: false, error: err.message };
    }
  },

  getLastSentEmail() {
    return lastSentEmail;
  },

  clearLastSentEmail() {
    lastSentEmail = null;
  },

  async sendMail({ to, subject, html, text }) {
    const rawUser = (process.env.SMTP_USER || '').trim();
    // Default From to the authenticated user so Gmail does not reject it as spoofing
    const defaultFrom = rawUser ? `"CreativeHub Sherubtse" <${rawUser}>` : '"CreativeHub Sherubtse" <noreply@sherubtse.edu.bt>';
    const fromAddress = process.env.EMAIL_FROM || defaultFrom;

    const emailData = {
      from: fromAddress,
      to,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')
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
        console.error(`[EmailService Error] Failed to deliver email via SMTP to ${to}:`, err.message);
        if (err.message && err.message.includes('Username and Password not accepted')) {
          console.error('[EmailService Hint] Gmail rejected credentials. Make sure you use a 16-character Google App Password (https://myaccount.google.com/apppasswords).');
        }
        // Return clear failure detail
        return { success: false, error: err.message, previewOnly: false };
      }
    } else {
      // Fallback logging when SMTP is not configured
      console.log(`[EmailService Dev/Test] To: ${to} | Subject: "${subject}" (SMTP credentials not set)`);
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

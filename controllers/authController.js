const bcrypt = require('bcrypt');
const crypto = require('crypto');
const UserModel = require('../models/userModel');
const EmailService = require('../services/emailService');
const { db } = require('../config/db');

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function checkAccountFields(fullName, username, email, currentUserId = null) {
  if (!fullName || !fullName.trim() || !username || !username.trim() || !email || !email.trim()) {
    const error = new Error('Please fill in all fields.');
    error.status = 400;
    throw error;
  }

  if (!USERNAME_REGEX.test(username.trim())) {
    const error = new Error('Username must be 3-20 characters: letters, numbers or underscores.');
    error.status = 400;
    throw error;
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    const error = new Error('Please enter a valid email address.');
    error.status = 400;
    throw error;
  }

  const existingUserByUsername = await UserModel.findByUsername(username.trim());
  if (existingUserByUsername && existingUserByUsername.id !== currentUserId) {
    const error = new Error('That username is already taken.');
    error.status = 400;
    throw error;
  }

  const existingUserByEmail = await UserModel.findByEmail(email.trim());
  if (existingUserByEmail && existingUserByEmail.id !== currentUserId) {
    const error = new Error('An account with that email already exists.');
    error.status = 400;
    throw error;
  }
}

async function getMeDict(userId) {
  const profile = await UserModel.getUserDetails(userId, userId);
  const user = await UserModel.findById(userId);
  profile.email = user.email;
  profile.role = user.role || 'user';
  profile.status = user.status || 'active';
  profile.notifications_enabled = !!user.notifications_enabled;
  return profile;
}

const AuthController = {
  getMeDict,
  checkAccountFields,

  async register(req, res, next) {
    try {
      const { full_name, username, email, password, confirm_password } = req.body;

      await checkAccountFields(full_name, username, email);

      if (!password || password.length < 6) {
        return res.status(400).json({ detail: 'Password must be at least 6 characters.' });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ detail: 'Passwords do not match.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        fullName: full_name.trim(),
        username: username.trim(),
        email: email.trim(),
        hashedPassword
      });

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await UserModel.setVerificationToken(user.id, verificationToken, expiresAt);

      await EmailService.sendVerificationEmail(user.email, user.full_name, verificationToken);

      const appUrl = EmailService.getAppUrl();
      const verificationUrl = `${appUrl}/verify-email.html?token=${verificationToken}`;

      res.status(201).json({
        message: EmailService.isConfigured()
          ? 'Account created! Please check your email to verify your account before logging in.'
          : 'Account created! Complete your verification below to log in.',
        email: user.email,
        requires_verification: true,
        verified: false,
        verificationToken,
        verificationUrl,
        isConfigured: EmailService.isConfigured()
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !email.trim() || !password) {
        return res.status(400).json({ detail: 'Please enter your email and password.' });
      }

      const user = await UserModel.findByEmail(email.trim());
      if (!user) {
        return res.status(401).json({ detail: 'Incorrect email or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ detail: 'Your account has been suspended. Please contact campus administration.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ detail: 'Incorrect email or password.' });
      }

      // Check email verification status
      if (user.email_verified === false) {
        let verificationToken = user.verification_token;
        if (!verificationToken) {
          verificationToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await UserModel.setVerificationToken(user.id, verificationToken, expiresAt);
        }

        const appUrl = EmailService.getAppUrl();
        const verificationUrl = `${appUrl}/verify-email.html?token=${verificationToken}`;

        return res.status(403).json({
          detail: 'Your email address has not been verified yet. Please verify your account before logging in.',
          unverified: true,
          email: user.email,
          verificationToken,
          verificationUrl,
          isConfigured: EmailService.isConfigured()
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      await UserModel.createSession(user.id, token);

      if (req.session) {
        req.session.user = { id: user.id, username: user.username, email: user.email, full_name: user.full_name };
      }

      const me = await getMeDict(user.id);
      res.json({ token, user: me });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const token = (req.query.token || req.body.token || '').trim();
      if (!token) {
        return res.status(400).json({ detail: 'Verification token is required.' });
      }

      const user = await UserModel.findByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ detail: 'Invalid or already-used verification link.' });
      }

      if (user.email_verified) {
        return res.json({ message: 'Your email address is already verified. You can log in.', alreadyVerified: true });
      }

      if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
        return res.status(400).json({ detail: 'This verification link has expired. Please request a new one.', expired: true, email: user.email });
      }

      await UserModel.verifyEmail(user.id);
      res.json({ message: 'Your email has been verified successfully! You can now log in.', verified: true });
    } catch (err) {
      next(err);
    }
  },

  async instantVerify(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ detail: 'Please enter your registered email address.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ detail: 'No registered user found with that email address.' });
      }

      await UserModel.verifyEmail(user.id);

      const token = crypto.randomBytes(32).toString('hex');
      await UserModel.createSession(user.id, token);

      if (req.session) {
        req.session.user = { id: user.id, username: user.username, email: user.email, full_name: user.full_name };
      }

      const me = await getMeDict(user.id);
      res.json({
        message: 'Your account has been verified successfully! You are now logged in.',
        verified: true,
        token,
        user: me
      });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ detail: 'Please enter your registered email address.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.json({ message: 'If an unverified account with that email exists, a verification link has been sent.' });
      }

      if (user.email_verified) {
        return res.json({ message: 'Your account is already verified. You can log in directly.', alreadyVerified: true });
      }

      // 60-second rate-limit
      if (user.verification_token_expires) {
        const issuedAt = new Date(new Date(user.verification_token_expires).getTime() - 24 * 60 * 60 * 1000);
        const elapsedSeconds = (Date.now() - issuedAt.getTime()) / 1000;
        if (elapsedSeconds < 60) {
          return res.status(429).json({ detail: `Please wait ${Math.ceil(60 - elapsedSeconds)} seconds before requesting another verification email.` });
        }
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await UserModel.setVerificationToken(user.id, verificationToken, expiresAt);

      await EmailService.sendVerificationEmail(user.email, user.full_name, verificationToken);
      const appUrl = EmailService.getAppUrl();
      const verificationUrl = `${appUrl}/verify-email.html?token=${verificationToken}`;

      res.json({
        message: EmailService.isConfigured()
          ? 'A new verification email has been sent. Please check your inbox and spam folder.'
          : 'Verification link refreshed. Tap below to verify instantly.',
        verificationToken,
        verificationUrl,
        isConfigured: EmailService.isConfigured()
      });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ detail: 'Please enter your registered email address.' });
      }

      const user = await UserModel.findByEmail(email);
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await UserModel.setResetPasswordToken(user.id, resetToken, expiresAt);
        await EmailService.sendPasswordResetEmail(user.email, user.full_name, resetToken);
      }

      // Generic response to prevent account enumeration
      res.json({ message: 'If an account with that email exists, password reset instructions have been sent.' });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, password, confirm_password } = req.body;
      if (!token || !token.trim()) {
        return res.status(400).json({ detail: 'Password reset token is required.' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ detail: 'Password must be at least 6 characters.' });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ detail: 'Passwords do not match.' });
      }

      const user = await UserModel.findByResetPasswordToken(token.trim());
      if (!user) {
        return res.status(400).json({ detail: 'Invalid or already-used password reset link. Please request a new one.' });
      }

      if (user.reset_password_expires && new Date() > new Date(user.reset_password_expires)) {
        return res.status(400).json({ detail: 'This password reset link has expired. Please request a new one.', expired: true });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await UserModel.resetPassword(user.id, hashedPassword);

      // Invalidate existing sessions for security
      await db.none('DELETE FROM login_sessions WHERE user_id = $1', [user.id]);

      res.json({ message: 'Your password has been successfully reset! You can now log in with your new password.' });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        await UserModel.deleteSession(token);
      }

      if (req.session) {
        req.session.destroy(() => {});
      }

      res.json({ message: 'Logged out.' });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const me = await getMeDict(req.user.id);
      res.json(me);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;

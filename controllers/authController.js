const bcrypt = require('bcrypt');
const crypto = require('crypto');
const UserModel = require('../models/userModel');

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

      const token = crypto.randomBytes(32).toString('hex');
      await UserModel.createSession(user.id, token);

      if (req.session) {
        req.session.user = { id: user.id, username: user.username, email: user.email, full_name: user.full_name };
      }

      res.json({
        message: 'Account created. You can log in now.',
        token,
        user: UserModel.formatSmallUser(user)
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

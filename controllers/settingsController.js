const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');
const AuthController = require('./authController');

const SettingsController = {
  async updateAccount(req, res, next) {
    try {
      const { full_name, username, email } = req.body;

      await AuthController.checkAccountFields(full_name, username, email, req.user.id);

      await UserModel.updateAccount(req.user.id, {
        fullName: full_name.trim(),
        username: username.trim(),
        email: email.trim()
      });

      const me = await AuthController.getMeDict(req.user.id);
      res.json(me);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { current_password, new_password, confirm_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({ detail: 'Please provide current and new passwords.' });
      }

      const user = await UserModel.findById(req.user.id);
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(400).json({ detail: 'Your current password is incorrect.' });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ detail: 'New password must be at least 6 characters.' });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ detail: 'New passwords do not match.' });
      }

      const hashed = await bcrypt.hash(new_password, 10);
      await UserModel.updatePassword(req.user.id, hashed);

      res.json({ message: 'Password changed.' });
    } catch (err) {
      next(err);
    }
  },

  async toggleNotifications(req, res, next) {
    try {
      const enabled = !!req.body.enabled;
      await UserModel.updateNotificationsEnabled(req.user.id, enabled);
      res.json({ enabled });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = SettingsController;

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');
const AuthController = require('./authController');

const UserController = {
  async listUsers(req, res, next) {
    try {
      const q = req.query.q || '';
      const users = await UserModel.listUsers(q, req.user ? req.user.id : null);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await UserModel.getUserDetails(userId, req.user ? req.user.id : null);
      if (!user) {
        return res.status(404).json({ detail: 'This user does not exist.' });
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (req.user.id !== userId) {
        return res.status(403).json({ detail: 'You can only edit your own profile.' });
      }

      const fullName = (req.body.full_name || '').trim();
      const bio = (req.body.bio || '').trim();

      if (!fullName) {
        return res.status(400).json({ detail: 'Name cannot be empty.' });
      }

      const updateData = { fullName, bio };
      if (req.file) {
        updateData.profilePicture = req.file.filename;
        if (req.body.profile_picture_data && req.body.profile_picture_data.startsWith('data:image/')) {
          updateData.profilePictureData = req.body.profile_picture_data;
        } else {
          try {
            const buf = fs.readFileSync(req.file.path);
            const mime = req.file.mimetype || 'image/jpeg';
            updateData.profilePictureData = `data:${mime};base64,${buf.toString('base64')}`;
          } catch (e) {
            console.warn('[ProfilePic] Error reading file for DB backup:', e.message);
          }
        }
      } else if (req.body.profile_picture_data && req.body.profile_picture_data.startsWith('data:image/')) {
        const dataUri = req.body.profile_picture_data;
        const ext = dataUri.includes('png') ? '.png' : (dataUri.includes('webp') ? '.webp' : '.jpg');
        const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
        const filePath = path.join(__dirname, '../public/uploads', filename);
        const base64Data = dataUri.replace(/^data:[^;]+;base64,/, '');
        try {
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        } catch (e) {}
        updateData.profilePicture = filename;
        updateData.profilePictureData = dataUri;
      }

      await UserModel.updateProfile(userId, updateData);
      const me = await AuthController.getMeDict(userId);
      res.json(me);
    } catch (err) {
      next(err);
    }
  },

  async toggleFollow(req, res, next) {
    try {
      const targetId = parseInt(req.params.id, 10);
      const target = await UserModel.findById(targetId);
      if (!target) {
        return res.status(404).json({ detail: 'This user does not exist.' });
      }

      if (targetId === req.user.id) {
        return res.status(400).json({ detail: 'You cannot follow yourself.' });
      }

      const result = await UserModel.toggleFollow(req.user.id, targetId);

      if (result.following) {
        await NotificationModel.notify(
          targetId,
          `${req.user.full_name} started following you`,
          'follow',
          `profile.html?id=${req.user.id}`
        );
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;

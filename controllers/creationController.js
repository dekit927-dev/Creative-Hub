const path = require('path');
const fs = require('fs');
const CreationModel = require('../models/creationModel');
const CategoryModel = require('../models/categoryModel');
const NotificationModel = require('../models/notificationModel');

const CreationController = {
  async listCreations(req, res, next) {
    try {
      const category = req.query.category || '';
      const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
      const currentUserId = req.user ? req.user.id : null;

      const creations = await CreationModel.list({ category, userId, currentUserId });
      res.json(creations);
    } catch (err) {
      next(err);
    }
  },

  async createCreation(req, res, next) {
    try {
      const title = (req.body.title || '').trim();
      const description = (req.body.description || '').trim();
      const category = req.body.category;

      if (!title) {
        return res.status(400).json({ detail: 'Please enter a title.' });
      }

      const isKnownCategory = CreationModel.CATEGORIES.includes(category) || (await CategoryModel.getByName(category));
      if (!isKnownCategory) {
        return res.status(400).json({ detail: 'Please choose a valid category.' });
      }

      if (!req.file) {
        return res.status(400).json({ detail: 'Please upload a photo, video, or audio file for your creation.' });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const isVideo = req.file.mimetype.startsWith('video/') || ['.mp4', '.webm', '.mov', '.mkv', '.ogv', '.avi'].includes(ext);
      const isAudio = req.file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext);

      if (isVideo && req.file.size > 100 * 1024 * 1024) {
        return res.status(400).json({ detail: 'Video size cannot exceed 100 MB.' });
      }
      if (isAudio && req.file.size > 30 * 1024 * 1024) {
        return res.status(400).json({ detail: 'Audio size cannot exceed 30 MB.' });
      }
      if (!isVideo && !isAudio && req.file.size > 15 * 1024 * 1024) {
        return res.status(400).json({ detail: 'Photo size cannot exceed 15 MB.' });
      }

      let imageData = null;
      if (req.file && req.file.size <= 50 * 1024 * 1024) {
        try {
          const buf = fs.readFileSync(req.file.path);
          let mime = req.file.mimetype;
          if (isVideo && (!mime || mime === 'application/octet-stream')) {
            mime = 'video/mp4';
          } else if (isAudio && (!mime || mime === 'application/octet-stream')) {
            mime = 'audio/mpeg';
          } else if (!mime) {
            mime = 'image/jpeg';
          }
          imageData = `data:${mime};base64,${buf.toString('base64')}`;
        } catch (e) {
          console.warn('[Creation] Error reading media for DB backup:', e.message);
        }
      }

      const creation = await CreationModel.create({
        userId: req.user.id,
        title,
        description,
        category,
        image: req.file.filename,
        imageData
      });

      const fullCreation = await CreationModel.getById(creation.id, req.user.id);
      res.json(fullCreation);
    } catch (err) {
      next(err);
    }
  },

  async getCreation(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const currentUserId = req.user ? req.user.id : null;

      const creation = await CreationModel.getById(creationId, currentUserId);
      if (!creation) {
        return res.status(404).json({ detail: 'This creation does not exist (it may have been deleted).' });
      }

      const comments = await CreationModel.getComments(creationId);
      creation.comment_list = comments;

      res.json(creation);
    } catch (err) {
      next(err);
    }
  },

  async deleteCreation(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const existing = await CreationModel.getById(creationId);

      if (!existing) {
        return res.status(404).json({ detail: 'This creation does not exist (it may have been deleted).' });
      }

      const isOwner = existing.user && existing.user.id === req.user.id;
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ detail: 'You can only delete your own creations.' });
      }

      const deleted = await CreationModel.delete(creationId, req.user.id, isAdmin);
      if (!deleted) {
        return res.status(403).json({ detail: 'You can only delete your own creations.' });
      }

      if (existing.image) {
        try {
          const filePath = path.join(__dirname, '../public/uploads', existing.image);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn('Could not remove file for deleted creation:', e.message);
        }
      }

      res.json({ message: 'Creation deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async toggleLike(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const creation = await CreationModel.getById(creationId);

      if (!creation) {
        return res.status(404).json({ detail: 'This creation does not exist (it may have been deleted).' });
      }

      const result = await CreationModel.toggleLike(creationId, req.user.id);

      if (result.liked && creation.user.id !== req.user.id) {
        await NotificationModel.notify(
          creation.user.id,
          `${req.user.full_name} liked your creation "${creation.title}"`,
          'like',
          `creation-details.html?id=${creation.id}`
        );
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async addComment(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const creation = await CreationModel.getById(creationId);

      if (!creation) {
        return res.status(404).json({ detail: 'This creation does not exist (it may have been deleted).' });
      }

      const commentText = (req.body.comment || '').trim();
      if (!commentText) {
        return res.status(400).json({ detail: 'Comment cannot be empty.' });
      }

      const comment = await CreationModel.addComment(creationId, req.user.id, commentText);

      if (creation.user.id !== req.user.id) {
        await NotificationModel.notify(
          creation.user.id,
          `${req.user.full_name} commented on "${creation.title}"`,
          'comment',
          `creation-details.html?id=${creation.id}`
        );
      }

      res.json(comment);
    } catch (err) {
      next(err);
    }
  },

  async shareCreation(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const creation = await CreationModel.getById(creationId);
      if (!creation) {
        return res.status(404).json({ detail: 'This creation does not exist.' });
      }

      const ShareModel = require('../models/shareModel');
      const userId = req.user ? req.user.id : null;
      const shareMethod = req.body.method || 'link_copy';

      await ShareModel.recordShare({ userId, creationId, shareMethod });
      const shares = await ShareModel.getShareCount(creationId);

      res.json({ shared: true, shares });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = CreationController;

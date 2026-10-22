const CreationModel = require('../models/creationModel');
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

      if (!CreationModel.CATEGORIES.includes(category)) {
        return res.status(400).json({ detail: 'Please choose a valid category.' });
      }

      if (!req.file) {
        return res.status(400).json({ detail: 'Please upload an image for your creation.' });
      }

      const creation = await CreationModel.create({
        userId: req.user.id,
        title,
        description,
        category,
        image: req.file.filename
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

      if (existing.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'You can only delete your own creations.' });
      }

      await CreationModel.delete(creationId, req.user.id);
      res.json({ message: 'Creation deleted.' });
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

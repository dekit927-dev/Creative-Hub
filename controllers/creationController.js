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

      let mediaType = (req.body.media_type || '').toLowerCase();
      let linkUrl = (req.body.link_url || req.body.link || '').trim();

      if (mediaType === 'link' || (!mediaType && linkUrl)) {
        if (!linkUrl) {
          return res.status(400).json({ detail: 'Please enter a valid resource or website link URL.' });
        }
        if (!/^https?:\/\//i.test(linkUrl)) {
          linkUrl = 'https://' + linkUrl;
        }
        try {
          new URL(linkUrl);
        } catch (e) {
          return res.status(400).json({ detail: 'Please enter a valid link URL (e.g. https://example.com).' });
        }
        mediaType = 'link';
      }

      if (!req.file && mediaType !== 'link') {
        return res.status(400).json({ detail: 'Please upload a photo, video, audio, or document file for your creation.' });
      }

      let isVideo = false;
      let isAudio = false;
      let isDoc = false;
      let ext = '';

      if (req.file) {
        ext = path.extname(req.file.originalname).toLowerCase();
        isVideo = req.file.mimetype.startsWith('video/') || ['.mp4', '.webm', '.mov', '.mkv', '.ogv', '.avi'].includes(ext);
        isAudio = req.file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext);
        isDoc = req.file.mimetype.startsWith('application/') || req.file.mimetype.startsWith('text/') || ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.zip', '.ppt', '.pptx', '.xls', '.xlsx', '.csv'].includes(ext);

        if (isVideo && req.file.size > 100 * 1024 * 1024) {
          return res.status(400).json({ detail: 'Video size cannot exceed 100 MB.' });
        }
        if (isAudio && req.file.size > 30 * 1024 * 1024) {
          return res.status(400).json({ detail: 'Audio size cannot exceed 30 MB.' });
        }
        if (isDoc && req.file.size > 25 * 1024 * 1024) {
          return res.status(400).json({ detail: 'Document size cannot exceed 25 MB.' });
        }
        if (!isVideo && !isAudio && !isDoc && req.file.size > 15 * 1024 * 1024) {
          return res.status(400).json({ detail: 'Photo size cannot exceed 15 MB.' });
        }

        if (mediaType !== 'link') {
          if (isVideo) mediaType = 'video';
          else if (isAudio) mediaType = 'audio';
          else if (isDoc) mediaType = 'document';
          else mediaType = 'image';
        }
      }

      let imageData = null;
      if (req.file && req.file.size <= 100 * 1024 * 1024) {
        try {
          const buf = fs.readFileSync(req.file.path);
          let mime = req.file.mimetype;
          if (!mime || mime === 'application/octet-stream') {
            if (isVideo) mime = 'video/mp4';
            else if (isAudio) mime = 'audio/mpeg';
            else if (ext === '.pdf') mime = 'application/pdf';
            else if (ext === '.doc') mime = 'application/msword';
            else if (ext === '.docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (ext === '.txt') mime = 'text/plain';
            else mime = 'image/jpeg';
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
        image: req.file ? req.file.filename : null,
        imageData,
        mediaType: mediaType || 'image',
        linkUrl: linkUrl || null,
        fileName: req.file ? req.file.originalname : null,
        fileSize: req.file ? req.file.size : null
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

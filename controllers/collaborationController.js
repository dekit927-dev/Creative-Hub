const CollaborationModel = require('../models/collaborationModel');
const NotificationModel = require('../models/notificationModel');

const CollaborationController = {
  async listCollaborations(req, res, next) {
    try {
      const currentUserId = req.user ? req.user.id : null;
      const collabs = await CollaborationModel.list(currentUserId);
      res.json(collabs);
    } catch (err) {
      next(err);
    }
  },

  async createCollaboration(req, res, next) {
    try {
      const { title, description, skills } = req.body;

      if (!title || !title.trim() || !description || !description.trim() || !skills || !skills.trim()) {
        return res.status(400).json({ detail: 'Please fill in the title, description and required skills.' });
      }

      const collab = await CollaborationModel.create({
        userId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        skills: skills.trim()
      });

      const formatted = await CollaborationModel.getById(collab.id, req.user.id);
      res.json(formatted);
    } catch (err) {
      next(err);
    }
  },

  async requestJoin(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const collab = await CollaborationModel.getById(collabId, req.user.id);

      if (!collab) {
        return res.status(404).json({ detail: 'This collaboration does not exist.' });
      }

      if (collab.user.id === req.user.id) {
        return res.status(400).json({ detail: 'You cannot join your own collaboration.' });
      }

      if (collab.status !== 'Open') {
        return res.status(400).json({ detail: 'This collaboration is closed.' });
      }

      if (collab.requested_by_me) {
        return res.status(400).json({ detail: 'You already sent a request.' });
      }

      const updated = await CollaborationModel.requestJoin(collabId, req.user.id);

      await NotificationModel.notify(
        collab.user.id,
        `${req.user.full_name} wants to join "${collab.title}"`,
        'collaboration',
        'collaboration.html'
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async cancelRequest(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const collab = await CollaborationModel.getById(collabId, req.user.id);

      if (!collab) {
        return res.status(404).json({ detail: 'This collaboration does not exist.' });
      }

      const updated = await CollaborationModel.cancelRequest(collabId, req.user.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const collab = await CollaborationModel.getById(collabId, req.user.id);

      if (!collab) {
        return res.status(404).json({ detail: 'This collaboration does not exist.' });
      }

      if (collab.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'Only the creator can change the status.' });
      }

      const updated = await CollaborationModel.toggleStatus(collabId, req.user.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = CollaborationController;

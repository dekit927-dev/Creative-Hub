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

  async getCollaboration(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const currentUserId = req.user ? req.user.id : null;
      const collab = await CollaborationModel.getById(collabId, currentUserId);

      if (!collab) {
        return res.status(404).json({ detail: 'Collaboration opportunity not found.' });
      }

      // If user is owner or admin, include requesters list
      let requesters = [];
      if (req.user && (req.user.id === collab.user.id || req.user.role === 'admin')) {
        requesters = await CollaborationModel.getRequesters(collabId);
      }

      res.json({ ...collab, requesters_list: requesters });
    } catch (err) {
      next(err);
    }
  },

  async createCollaboration(req, res, next) {
    try {
      const {
        title,
        description,
        skills,
        short_summary,
        category,
        roles,
        positions,
        experience,
        participation_type,
        location,
        mode,
        start_date,
        deadline,
        duration,
        deliverables,
        tools,
        compensation,
        application_instructions,
        status
      } = req.body;

      if (!title || !title.trim() || !description || !description.trim()) {
        return res.status(400).json({ detail: 'Please fill in the project title and description.' });
      }

      const collab = await CollaborationModel.create({
        userId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        skills: (skills || roles || '').trim(),
        short_summary: short_summary ? short_summary.trim() : null,
        category: category || 'Multidisciplinary',
        roles: (roles || skills || 'Creative Contributor').trim(),
        positions: positions || '1 - 2 members',
        experience: experience || 'Beginner to Intermediate',
        participation_type: participation_type || 'Team Collaboration',
        location: location || 'Kanglung Campus',
        mode: mode || 'Hybrid',
        start_date: start_date ? new Date(start_date) : null,
        deadline: deadline ? new Date(deadline) : null,
        duration: duration || '2 - 4 weeks',
        deliverables: deliverables ? deliverables.trim() : null,
        tools: tools ? tools.trim() : null,
        compensation: compensation || 'Academic / Portfolio Credit & Joint Authorship',
        application_instructions: application_instructions ? application_instructions.trim() : null,
        status: status || 'Open'
      });

      const formatted = await CollaborationModel.getById(collab.id, req.user.id);
      res.status(201).json(formatted);
    } catch (err) {
      next(err);
    }
  },

  async updateCollaboration(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const existing = await CollaborationModel.getById(collabId);
      if (!existing) {
        return res.status(404).json({ detail: 'Collaboration not found.' });
      }

      if (req.user.role !== 'admin' && existing.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'You are not authorized to edit this collaboration.' });
      }

      const updated = await CollaborationModel.update(collabId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async deleteCollaboration(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const existing = await CollaborationModel.getById(collabId);
      if (!existing) {
        return res.status(404).json({ detail: 'Collaboration not found.' });
      }

      if (req.user.role !== 'admin' && existing.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'You are not authorized to delete this collaboration.' });
      }

      await CollaborationModel.delete(collabId);
      res.json({ message: 'Collaboration deleted successfully.' });
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

      const { message } = req.body;
      const updated = await CollaborationModel.apply(collabId, req.user.id, { message: message || '' });
      res.json({ message: 'Request submitted! Your application is now Pending Review.', collaboration: updated });
    } catch (err) {
      next(err);
    }
  },

  async cancelRequest(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const updated = await CollaborationModel.withdraw(collabId, req.user.id);
      res.json({ message: 'Your application has been withdrawn.', collaboration: updated });
    } catch (err) {
      next(err);
    }
  },

  async updateRequestStatus(req, res, next) {
    try {
      const collabId = parseInt(req.params.id, 10);
      const requestId = parseInt(req.params.reqId, 10);
      const { status, decision_message } = req.body;

      const collab = await CollaborationModel.getById(collabId, req.user.id);
      if (!collab) {
        return res.status(404).json({ detail: 'Collaboration not found.' });
      }

      if (req.user.role !== 'admin' && collab.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'Only the project lead or platform administrator can review applications.' });
      }

      const updated = await CollaborationModel.updateRequestStatus(
        requestId,
        status,
        decision_message || '',
        req.user.id
      );

      res.json({ message: `Applicant status updated to "${status}".`, request: updated });
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

      if (req.user.role !== 'admin' && collab.user.id !== req.user.id) {
        return res.status(403).json({ detail: 'Only the creator or administrator can change the status.' });
      }

      const updated = await CollaborationModel.toggleStatus(collabId, req.user.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async getMyRequests(req, res, next) {
    try {
      const requests = await CollaborationModel.getUserRequests(req.user.id);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = CollaborationController;

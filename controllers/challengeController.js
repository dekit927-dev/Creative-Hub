const ChallengeModel = require('../models/challengeModel');
const CreationModel = require('../models/creationModel');
const NotificationModel = require('../models/notificationModel');

const ChallengeController = {
  async listChallenges(req, res, next) {
    try {
      const currentUserId = req.user ? req.user.id : null;
      const challenges = await ChallengeModel.list(currentUserId);
      res.json(challenges);
    } catch (err) {
      next(err);
    }
  },

  async getChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const currentUserId = req.user ? req.user.id : null;
      const challenge = await ChallengeModel.getById(challengeId, currentUserId);

      if (!challenge) {
        return res.status(404).json({ detail: 'Challenge not found.' });
      }

      // If user is admin or challenge organizer, include participants list
      let participants = [];
      if (req.user && (req.user.role === 'admin' || challenge.organizer === req.user.full_name)) {
        participants = await ChallengeModel.getParticipants(challengeId);
      }

      res.json({ ...challenge, participants_list: participants });
    } catch (err) {
      next(err);
    }
  },

  async createChallenge(req, res, next) {
    try {
      const {
        title,
        description,
        category,
        deadline,
        short_summary,
        organizer,
        skills,
        eligibility,
        participation_type,
        team_size,
        location,
        mode,
        start_date,
        event_date,
        submission_instructions,
        deliverables,
        evaluation_criteria,
        prizes,
        resources,
        contact_info,
        status
      } = req.body;

      if (!title || !title.trim() || !description || !description.trim()) {
        return res.status(400).json({ detail: 'Please enter a title and description.' });
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ detail: 'Please choose a valid deadline date.' });
      }

      const challenge = await ChallengeModel.create({
        userId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        category: category || 'Creative Arts',
        deadline: deadlineDate,
        short_summary: short_summary ? short_summary.trim() : null,
        organizer: organizer ? organizer.trim() : 'Sherubtse Creative Club',
        skills: skills ? skills.trim() : null,
        eligibility: eligibility ? eligibility.trim() : null,
        participation_type: participation_type || 'Individual',
        team_size: team_size || '1 - 4 members',
        location: location || 'Kanglung Campus',
        mode: mode || 'Hybrid',
        start_date: start_date ? new Date(start_date) : null,
        event_date: event_date ? new Date(event_date) : null,
        submission_instructions: submission_instructions ? submission_instructions.trim() : null,
        deliverables: deliverables ? deliverables.trim() : null,
        evaluation_criteria: evaluation_criteria ? evaluation_criteria.trim() : null,
        prizes: prizes ? prizes.trim() : null,
        resources: resources ? resources.trim() : null,
        contact_info: contact_info ? contact_info.trim() : 'creatives@sherubtse.edu.bt',
        status: status || 'Active'
      });

      const formatted = await ChallengeModel.getById(challenge.id, req.user.id);
      res.status(201).json(formatted);
    } catch (err) {
      next(err);
    }
  },

  async updateChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const existing = await ChallengeModel.getById(challengeId);
      if (!existing) {
        return res.status(404).json({ detail: 'Challenge not found.' });
      }

      const updated = await ChallengeModel.update(challengeId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async deleteChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      await ChallengeModel.delete(challengeId);
      res.json({ message: 'Challenge deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async applyChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const challenge = await ChallengeModel.getById(challengeId, req.user.id);

      if (!challenge) {
        return res.status(404).json({ detail: 'This challenge does not exist.' });
      }

      if (challenge.deadline && new Date(challenge.deadline) < new Date()) {
        return res.status(400).json({ detail: 'The submission deadline for this challenge has passed.' });
      }

      const { message } = req.body;
      const updated = await ChallengeModel.apply(challengeId, req.user.id, { message: message || '' });
      res.json({ message: 'Application submitted successfully! Your submission is now Pending Review.', challenge: updated });
    } catch (err) {
      next(err);
    }
  },

  // Backwards compatible joinChallenge
  async joinChallenge(req, res, next) {
    return ChallengeController.applyChallenge(req, res, next);
  },

  async withdrawChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const updated = await ChallengeModel.withdraw(challengeId, req.user.id);
      res.json({ message: 'Your application has been withdrawn.', challenge: updated });
    } catch (err) {
      next(err);
    }
  },

  // Backwards compatible leaveChallenge
  async leaveChallenge(req, res, next) {
    return ChallengeController.withdrawChallenge(req, res, next);
  },

  async updateApplicationStatus(req, res, next) {
    try {
      const participantId = parseInt(req.params.appId, 10);
      const { status, decision_message } = req.body;

      if (!status) {
        return res.status(400).json({ detail: 'Please specify the new application status.' });
      }

      const updated = await ChallengeModel.updateApplicationStatus(
        participantId,
        status,
        decision_message || '',
        req.user.id
      );

      res.json({ message: `Application status updated to "${status}".`, application: updated });
    } catch (err) {
      next(err);
    }
  },

  async getParticipants(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const challenge = await ChallengeModel.getById(challengeId);

      if (!challenge) {
        return res.status(404).json({ detail: 'This challenge does not exist.' });
      }

      const participants = await ChallengeModel.getParticipants(challengeId);
      res.json(participants);
    } catch (err) {
      next(err);
    }
  },

  async getMyApplications(req, res, next) {
    try {
      const applications = await ChallengeModel.getUserApplications(req.user.id);
      res.json(applications);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = ChallengeController;

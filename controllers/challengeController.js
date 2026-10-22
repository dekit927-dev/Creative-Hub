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

  async createChallenge(req, res, next) {
    try {
      const { title, description, category, deadline } = req.body;

      if (!title || !title.trim() || !description || !description.trim()) {
        return res.status(400).json({ detail: 'Please enter a title and description.' });
      }

      if (!CreationModel.CATEGORIES.includes(category)) {
        return res.status(400).json({ detail: 'Please choose a valid category.' });
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ detail: 'Please choose a valid deadline date.' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        return res.status(400).json({ detail: 'The deadline cannot be in the past.' });
      }

      const challenge = await ChallengeModel.create({
        userId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        deadline: deadlineDate
      });

      const formatted = await ChallengeModel.getById(challenge.id, req.user.id);
      res.json(formatted);
    } catch (err) {
      next(err);
    }
  },

  async joinChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const challenge = await ChallengeModel.getById(challengeId, req.user.id);

      if (!challenge) {
        return res.status(404).json({ detail: 'This challenge does not exist.' });
      }

      const deadlineDate = new Date(challenge.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        return res.status(400).json({ detail: 'This challenge has ended.' });
      }

      if (challenge.joined) {
        return res.status(400).json({ detail: 'You already joined this challenge.' });
      }

      const updated = await ChallengeModel.join(challengeId, req.user.id);

      const chRow = await require('../config/db').db.oneOrNone('SELECT user_id, title FROM challenges WHERE id = $1', [challengeId]);
      if (chRow && chRow.user_id && chRow.user_id !== req.user.id) {
        await NotificationModel.notify(
          chRow.user_id,
          `${req.user.full_name} joined your challenge "${chRow.title}"`,
          'challenge',
          'challenges.html'
        );
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async leaveChallenge(req, res, next) {
    try {
      const challengeId = parseInt(req.params.id, 10);
      const challenge = await ChallengeModel.getById(challengeId, req.user.id);

      if (!challenge) {
        return res.status(404).json({ detail: 'This challenge does not exist.' });
      }

      const updated = await ChallengeModel.leave(challengeId, req.user.id);
      res.json(updated);
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
  }
};

module.exports = ChallengeController;

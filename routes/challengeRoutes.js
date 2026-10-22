const express = require('express');
const router = express.Router();
const ChallengeController = require('../controllers/challengeController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ChallengeController.listChallenges);
router.post('/', requireAuth, ChallengeController.createChallenge);
router.post('/:id/join', requireAuth, ChallengeController.joinChallenge);
router.delete('/:id/join', requireAuth, ChallengeController.leaveChallenge);
router.get('/:id/participants', optionalAuth, ChallengeController.getParticipants);

module.exports = router;

const express = require('express');
const router = express.Router();
const ChallengeController = require('../controllers/challengeController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ChallengeController.listChallenges);
router.get('/my/applications', requireAuth, ChallengeController.getMyApplications);
router.get('/:id', optionalAuth, ChallengeController.getChallenge);
router.post('/', requireAuth, ChallengeController.createChallenge);
router.put('/:id', requireAuth, ChallengeController.updateChallenge);
router.patch('/:id', requireAuth, ChallengeController.updateChallenge);
router.delete('/:id', requireAuth, ChallengeController.deleteChallenge);

router.post('/:id/apply', requireAuth, ChallengeController.applyChallenge);
router.post('/:id/join', requireAuth, ChallengeController.joinChallenge);
router.post('/:id/withdraw', requireAuth, ChallengeController.withdrawChallenge);
router.delete('/:id/join', requireAuth, ChallengeController.leaveChallenge);

router.patch('/:id/applications/:appId/status', requireAuth, ChallengeController.updateApplicationStatus);
router.get('/:id/participants', optionalAuth, ChallengeController.getParticipants);

module.exports = router;

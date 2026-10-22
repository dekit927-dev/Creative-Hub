const express = require('express');
const router = express.Router();
const CollaborationController = require('../controllers/collaborationController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, CollaborationController.listCollaborations);
router.post('/', requireAuth, CollaborationController.createCollaboration);
router.post('/:id/join', requireAuth, CollaborationController.requestJoin);
router.delete('/:id/join', requireAuth, CollaborationController.cancelRequest);
router.put('/:id/status', requireAuth, CollaborationController.toggleStatus);

module.exports = router;

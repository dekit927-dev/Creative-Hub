const express = require('express');
const router = express.Router();
const CollaborationController = require('../controllers/collaborationController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, CollaborationController.listCollaborations);
router.get('/my/requests', requireAuth, CollaborationController.getMyRequests);
router.get('/:id', optionalAuth, CollaborationController.getCollaboration);
router.post('/', requireAuth, CollaborationController.createCollaboration);
router.put('/:id', requireAuth, CollaborationController.updateCollaboration);
router.patch('/:id', requireAuth, CollaborationController.updateCollaboration);
router.delete('/:id', requireAuth, CollaborationController.deleteCollaboration);

router.post('/:id/apply', requireAuth, CollaborationController.requestJoin);
router.post('/:id/join', requireAuth, CollaborationController.requestJoin);
router.post('/:id/withdraw', requireAuth, CollaborationController.cancelRequest);
router.delete('/:id/join', requireAuth, CollaborationController.cancelRequest);

router.patch('/:id/requests/:reqId/status', requireAuth, CollaborationController.updateRequestStatus);
router.put('/:id/status', requireAuth, CollaborationController.toggleStatus);

module.exports = router;

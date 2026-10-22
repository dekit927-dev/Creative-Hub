const express = require('express');
const router = express.Router();
const CollaborationController = require('../controllers/collaborationController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', optionalAuth, CollaborationController.listCollaborations);
router.get('/my/requests', requireAuth, CollaborationController.getMyRequests);
router.get('/:id', optionalAuth, CollaborationController.getCollaboration);
router.post('/', requireAuth, CollaborationController.createCollaboration);
router.put('/:id', requireAuth, CollaborationController.updateCollaboration);
router.patch('/:id', requireAuth, CollaborationController.updateCollaboration);
router.delete('/:id', requireAuth, CollaborationController.deleteCollaboration);

router.post('/:id/apply', requireAuth, upload.single('attachment'), CollaborationController.requestJoin);
router.post('/:id/join', requireAuth, upload.single('attachment'), CollaborationController.requestJoin);
router.post('/:id/withdraw', requireAuth, CollaborationController.cancelRequest);
router.delete('/:id/join', requireAuth, CollaborationController.cancelRequest);

router.patch('/:id/requests/:reqId/status', requireAuth, CollaborationController.updateRequestStatus);
router.put('/:id/status', requireAuth, CollaborationController.toggleStatus);

module.exports = router;

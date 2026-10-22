const express = require('express');
const router = express.Router();
const CreationController = require('../controllers/creationController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', optionalAuth, CreationController.listCreations);
router.post('/', requireAuth, upload.single('image'), CreationController.createCreation);
router.get('/:id', optionalAuth, CreationController.getCreation);
router.delete('/:id', requireAuth, CreationController.deleteCreation);
router.post('/:id/like', requireAuth, CreationController.toggleLike);
router.post('/:id/comments', requireAuth, CreationController.addComment);
router.post('/:id/share', optionalAuth, CreationController.shareCreation);

module.exports = router;

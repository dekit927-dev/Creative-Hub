const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', optionalAuth, UserController.listUsers);
router.get('/:id', optionalAuth, UserController.getUser);
router.put('/:id', requireAuth, upload.single('profile_picture'), UserController.updateProfile);
router.post('/:id/follow', requireAuth, UserController.toggleFollow);

module.exports = router;

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, NotificationController.listNotifications);
router.put('/read-all', requireAuth, NotificationController.markAllRead);
router.put('/:id/read', requireAuth, NotificationController.markRead);

module.exports = router;

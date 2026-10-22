const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/conversations', requireAuth, MessageController.listConversations);
router.get('/messages', requireAuth, MessageController.getMessages);
router.post('/messages', requireAuth, MessageController.sendMessage);

module.exports = router;

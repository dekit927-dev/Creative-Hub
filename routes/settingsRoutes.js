const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.put('/account', requireAuth, SettingsController.updateAccount);
router.put('/password', requireAuth, SettingsController.changePassword);
router.put('/notifications', requireAuth, SettingsController.toggleNotifications);

module.exports = router;

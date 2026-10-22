const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const creationRoutes = require('./creationRoutes');
const challengeRoutes = require('./challengeRoutes');
const collaborationRoutes = require('./collaborationRoutes');
const messageRoutes = require('./messageRoutes');
const notificationRoutes = require('./notificationRoutes');
const settingsRoutes = require('./settingsRoutes');
const searchRoutes = require('./searchRoutes');
const adminRoutes = require('./adminRoutes');

const { requireAuth } = require('../middleware/authMiddleware');
const ChallengeModel = require('../models/challengeModel');
const CollaborationModel = require('../models/collaborationModel');

router.use('/', authRoutes);
router.use('/users', userRoutes);
router.use('/creations', creationRoutes);
router.use('/challenges', challengeRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/', searchRoutes);
router.use('/admin', adminRoutes);

// Unified user applications endpoint
router.get('/my-applications', requireAuth, async (req, res, next) => {
  try {
    const [challenges, collaborations] = await Promise.all([
      ChallengeModel.getUserApplications(req.user.id),
      CollaborationModel.getUserRequests(req.user.id)
    ]);
    res.json({ challenges, collaborations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

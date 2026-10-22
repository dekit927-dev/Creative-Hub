const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public student reporting endpoint (requires normal login)
router.post('/report', requireAuth, AdminController.submitReport);

// All routes below require administrator role
router.use(requireAdmin);

// 1. Dashboard Overview & Charts
router.get('/dashboard/overview', AdminController.getOverview);
router.get('/dashboard/user-growth', AdminController.getUserGrowth);
router.get('/dashboard/activity', AdminController.getPlatformActivity);
router.get('/dashboard/categories', AdminController.getCategoryPopularity);
router.get('/dashboard/engagement', AdminController.getEngagementDistribution);

// 2. Creator Rankings & Analytics
router.get('/analytics/rankings', AdminController.getCreatorRankings);
router.get('/analytics/top-creators', (req, res, next) => { req.query.type = 'highest_engagement'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-posters', (req, res, next) => { req.query.type = 'most_posts'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-liked-creators', (req, res, next) => { req.query.type = 'most_likes'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-commented-creators', (req, res, next) => { req.query.type = 'most_comments'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-shared-creators', (req, res, next) => { req.query.type = 'most_shares'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-followed-creators', (req, res, next) => { req.query.type = 'most_followers'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/top-engaged-creators', (req, res, next) => { req.query.type = 'highest_engagement'; return AdminController.getCreatorRankings(req, res, next); });
router.get('/analytics/compare', AdminController.compareCreators);
router.get('/analytics/creator/:id', AdminController.getCreatorAnalytics);
router.get('/analytics/content', AdminController.getContentAnalytics);
router.get('/analytics/top-creations', AdminController.getContentAnalytics);
router.get('/analytics/categories', AdminController.getCategoryPopularity);
router.get('/analytics/engagement', AdminController.getEngagementDistribution);
router.get('/analytics/content-performance', AdminController.getContentAnalytics);

// 3. User Management
router.get('/users', AdminController.listUsers);
router.post('/users', AdminController.createUser);
router.get('/users/:id', AdminController.getUser);
router.patch('/users/:id/status', AdminController.setUserStatus);

// 4. Moderation & Content Management
router.get('/reports', AdminController.listReports);
router.post('/reports/:id/resolve', AdminController.resolveReport);
router.patch('/reports/:id', AdminController.resolveReport);
router.delete('/creations/:id', AdminController.deleteCreation);
router.delete('/comments/:id', AdminController.deleteComment);

// 5. Category Management
router.get('/categories', AdminController.listCategories);
router.post('/categories', AdminController.createCategory);
router.put('/categories/:id', AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

module.exports = router;

const bcrypt = require('bcrypt');
const AdminModel = require('../models/adminModel');
const UserModel = require('../models/userModel');
const CategoryModel = require('../models/categoryModel');
const ReportModel = require('../models/reportModel');
const CreationModel = require('../models/creationModel');
const { db } = require('../config/db');

const AdminController = {
  // 1. Dashboard Overview Stats
  async getOverview(req, res, next) {
    try {
      const period = req.query.period || '30d';
      const customStart = req.query.start_date || null;
      const customEnd = req.query.end_date || null;

      const stats = await AdminModel.getOverviewStats(period, customStart, customEnd);
      const recentUsers = await AdminModel.getRecentRegistrations(6);
      const recentActivity = await AdminModel.getRecentContentActivity(6);

      res.json({
        ...stats,
        recent_users: recentUsers,
        recent_activity: recentActivity
      });
    } catch (err) {
      next(err);
    }
  },

  // 2. Time-series User Growth
  async getUserGrowth(req, res, next) {
    try {
      const period = req.query.period || '30d';
      const customStart = req.query.start_date || null;
      const customEnd = req.query.end_date || null;

      const data = await AdminModel.getUserGrowth(period, customStart, customEnd);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // 3. Platform Activity
  async getPlatformActivity(req, res, next) {
    try {
      const period = req.query.period || '30d';
      const customStart = req.query.start_date || null;
      const customEnd = req.query.end_date || null;

      const data = await AdminModel.getPlatformActivity(period, customStart, customEnd);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // 4. Category Popularity
  async getCategoryPopularity(req, res, next) {
    try {
      const data = await AdminModel.getCategoryPopularity();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // 5. Engagement Distribution
  async getEngagementDistribution(req, res, next) {
    try {
      const data = await AdminModel.getEngagementDistribution();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // 6. Creator Rankings (5 Essential views)
  async getCreatorRankings(req, res, next) {
    try {
      const type = req.query.type || 'highest_engagement';
      const limit = parseInt(req.query.limit || '10', 10);
      const period = req.query.period || 'all';
      const customStart = req.query.start_date || null;
      const customEnd = req.query.end_date || null;

      const rankings = await AdminModel.getCreatorRankings({
        type,
        limit,
        period,
        customStart,
        customEnd
      });

      res.json({
        type,
        period,
        limit,
        formula: 'Total Engagement = Likes Received + Comments Received + Tracked Shares Received',
        rankings
      });
    } catch (err) {
      next(err);
    }
  },

  // 7. Creator Comparison
  async compareCreators(req, res, next) {
    try {
      let ids = req.query.ids;
      if (typeof ids === 'string') {
        ids = ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ detail: 'Please specify creator IDs to compare.' });
      }

      const comparison = await AdminModel.compareCreators(ids);
      res.json(comparison);
    } catch (err) {
      next(err);
    }
  },

  // 8. Individual Creator Analytics
  async getCreatorAnalytics(req, res, next) {
    try {
      const creatorId = parseInt(req.params.id, 10);
      const analytics = await AdminModel.getIndividualCreatorAnalytics(creatorId);

      if (!analytics) {
        return res.status(404).json({ detail: 'Creator not found.' });
      }

      res.json(analytics);
    } catch (err) {
      next(err);
    }
  },

  // 9. Content Performance Analytics
  async getContentAnalytics(req, res, next) {
    try {
      const category = req.query.category || '';
      const creatorId = req.query.creator_id ? parseInt(req.query.creator_id, 10) : null;
      const sortBy = req.query.sort_by || 'engagement';
      const order = req.query.order && req.query.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const limit = parseInt(req.query.limit || '20', 10);
      const page = parseInt(req.query.page || '1', 10);
      const period = req.query.period || 'all';

      const data = await AdminModel.getContentAnalytics({
        category,
        creatorId,
        sortBy,
        order,
        limit,
        page,
        period
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // 10. User Management
  async listUsers(req, res, next) {
    try {
      const search = req.query.search || '';
      const status = req.query.status || '';
      const role = req.query.role || '';
      const limit = parseInt(req.query.limit || '20', 10);
      const page = parseInt(req.query.page || '1', 10);

      const users = await AdminModel.getUsersList({ search, status, role, limit, page });
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await AdminModel.getIndividualCreatorAnalytics(userId);
      if (!user) {
        return res.status(404).json({ detail: 'User not found.' });
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async setUserStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { status, reason } = req.body;

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ detail: "Status must be 'active' or 'suspended'." });
      }

      const updated = await AdminModel.setUserStatus(userId, status, req.user.id, reason || '');
      res.json({ message: `User status updated to ${status}.`, user: updated });
    } catch (err) {
      next(err);
    }
  },

  async createUser(req, res, next) {
    try {
      const { full_name, username, email, password, role = 'user', status = 'active', bio = '' } = req.body;

      if (!full_name || !full_name.trim() || !username || !username.trim() || !email || !email.trim() || !password) {
        return res.status(400).json({ detail: 'Please fill in all required fields (full name, username, email, password).' });
      }

      const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
      const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

      if (!USERNAME_REGEX.test(username.trim())) {
        return res.status(400).json({ detail: 'Username must be 3-20 characters: letters, numbers or underscores.' });
      }

      if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ detail: 'Please enter a valid email address.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ detail: 'Password must be at least 6 characters.' });
      }

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ detail: "Role must be 'user' or 'admin'." });
      }

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ detail: "Status must be 'active' or 'suspended'." });
      }

      const existingUser = await UserModel.findByUsername(username.trim());
      if (existingUser) {
        return res.status(400).json({ detail: 'That username is already taken.' });
      }

      const existingEmail = await UserModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(400).json({ detail: 'An account with that email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await db.tx(async t => {
        const created = await t.one(
          `INSERT INTO users (full_name, username, email, password, role, status, bio)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, full_name, username, email, role, status, bio, created_at`,
          [full_name.trim(), username.trim(), email.trim().toLowerCase(), hashedPassword, role, status, bio ? bio.trim() : '']
        );

        await t.none(
          `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
           VALUES ($1, 'create_user', 'user', $2, $3)`,
          [req.user.id, created.id, `Manual user registration by admin: ${created.username}`]
        );

        return created;
      });

      res.status(201).json({
        message: 'User created successfully.',
        user: {
          id: newUser.id,
          full_name: newUser.full_name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          bio: newUser.bio,
          created_at: newUser.created_at.toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // 11. Content & Comment Moderation
  async deleteCreation(req, res, next) {
    try {
      const creationId = parseInt(req.params.id, 10);
      const reason = req.body.reason || 'Content removed by administrator.';

      await db.tx(async t => {
        const creation = await t.oneOrNone('SELECT * FROM creations WHERE id = $1', [creationId]);
        if (!creation) {
          const err = new Error('Creation not found.');
          err.status = 404;
          throw err;
        }

        await t.none('DELETE FROM likes WHERE creation_id = $1', [creationId]);
        await t.none('DELETE FROM comments WHERE creation_id = $1', [creationId]);
        await t.none('DELETE FROM share_events WHERE creation_id = $1', [creationId]);
        await t.none('DELETE FROM creations WHERE id = $1', [creationId]);

        await t.none(
          `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
           VALUES ($1, 'delete_creation', 'creation', $2, $3)`,
          [req.user.id, creationId, reason]
        );
      });

      res.json({ message: 'Creation removed successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async deleteComment(req, res, next) {
    try {
      const commentId = parseInt(req.params.id, 10);
      const reason = req.body.reason || 'Comment removed by administrator.';

      await db.tx(async t => {
        const comment = await t.oneOrNone('SELECT * FROM comments WHERE id = $1', [commentId]);
        if (!comment) {
          const err = new Error('Comment not found.');
          err.status = 404;
          throw err;
        }

        await t.none('DELETE FROM comments WHERE id = $1', [commentId]);
        await t.none(
          `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
           VALUES ($1, 'delete_comment', 'comment', $2, $3)`,
          [req.user.id, commentId, reason]
        );
      });

      res.json({ message: 'Comment removed successfully.' });
    } catch (err) {
      next(err);
    }
  },

  // 12. Category Management
  async listCategories(req, res, next) {
    try {
      const categories = await CategoryModel.listAll();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ detail: 'Category name is required.' });
      }

      const existing = await CategoryModel.getByName(name.trim());
      if (existing) {
        return res.status(400).json({ detail: 'Category already exists.' });
      }

      const category = await CategoryModel.create(name, description);
      res.json(category);
    } catch (err) {
      next(err);
    }
  },

  async updateCategory(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ detail: 'Category name is required.' });
      }

      const updated = await CategoryModel.update(id, name, description);
      if (!updated) {
        return res.status(404).json({ detail: 'Category not found.' });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async deleteCategory(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await CategoryModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ detail: 'Category not found.' });
      }

      res.json({ message: 'Category deleted and related creations reassigned to Other.' });
    } catch (err) {
      next(err);
    }
  },

  // 13. Reports and Moderation Queue
  async listReports(req, res, next) {
    try {
      const status = req.query.status || 'pending';
      const reports = await ReportModel.listReports({ status });
      res.json(reports);
    } catch (err) {
      next(err);
    }
  },

  async resolveReport(req, res, next) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const { decision, resolution_note, delete_content } = req.body;

      if (!['resolved', 'dismissed'].includes(decision)) {
        return res.status(400).json({ detail: "Decision must be 'resolved' or 'dismissed'." });
      }

      const result = await ReportModel.resolveReport({
        reportId,
        adminId: req.user.id,
        decision,
        resolutionNote: resolution_note || '',
        deleteContent: !!delete_content
      });

      res.json({ message: 'Report resolved successfully.', report: result });
    } catch (err) {
      next(err);
    }
  },

  // 14. Public User Report Submission
  async submitReport(req, res, next) {
    try {
      const { content_type, content_id, reason } = req.body;

      if (!['creation', 'comment'].includes(content_type)) {
        return res.status(400).json({ detail: 'Invalid content type.' });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ detail: 'Please provide a reason for the report.' });
      }

      const report = await ReportModel.createReport({
        reporterId: req.user.id,
        contentType: content_type,
        contentId: parseInt(content_id, 10),
        reason
      });

      res.json({ message: 'Report submitted for administrator review.', report });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AdminController;

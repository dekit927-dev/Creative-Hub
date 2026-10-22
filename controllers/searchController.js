const { db } = require('../config/db');
const UserModel = require('../models/userModel');
const CreationModel = require('../models/creationModel');

const SearchController = {
  async search(req, res, next) {
    try {
      const q = (req.query.q || '').trim();
      if (!q) {
        return res.json({ users: [], creations: [], categories: [] });
      }

      const currentUserId = req.user ? req.user.id : null;
      const likePattern = `%${q}%`;

      // 1. Search Users
      const userRows = await db.any(`
        SELECT id FROM users
        WHERE full_name ILIKE $1 OR username ILIKE $1 OR bio ILIKE $1
        ORDER BY full_name ASC
        LIMIT 20
      `, [likePattern]);

      const users = await Promise.all(
        userRows.map(u => UserModel.getUserDetails(u.id, currentUserId))
      );

      // 2. Search Creations
      const creationRows = await db.any(`
        SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
        FROM creations c
        JOIN users u ON u.id = c.user_id
        WHERE c.title ILIKE $1 OR c.description ILIKE $1 OR c.category ILIKE $1
        ORDER BY c.created_at DESC
        LIMIT 30
      `, [likePattern]);

      const creations = await Promise.all(
        creationRows.map(c => CreationModel.formatCreation(c, currentUserId))
      );

      // 3. Search Categories
      const categories = [];
      for (const name of CreationModel.CATEGORIES) {
        if (name.toLowerCase().includes(q.toLowerCase())) {
          const count = await db.one('SELECT COUNT(*) FROM creations WHERE category = $1', [name]);
          categories.push({
            name,
            count: parseInt(count.count, 10)
          });
        }
      }

      res.json({ users, creations, categories });
    } catch (err) {
      next(err);
    }
  },

  listCategories(req, res) {
    res.json(CreationModel.CATEGORIES);
  }
};

module.exports = SearchController;

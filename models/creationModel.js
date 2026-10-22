const { db } = require('../config/db');
const UserModel = require('./userModel');

const CATEGORIES = [
  'Digital Art',
  'Photography',
  'Graphic Design',
  'Illustration',
  'Music',
  'Writing',
  'Video',
  'Other'
];

const CreationModel = {
  CATEGORIES,

  async list({ category = '', userId = null, currentUserId = null } = {}) {
    let sql = `
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM creations c
      JOIN users u ON u.id = c.user_id
    `;
    const conditions = [];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`c.category = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`c.user_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.created_at DESC';

    const rows = await db.any(sql, params);
    return Promise.all(rows.map(row => CreationModel.formatCreation(row, currentUserId)));
  },

  async getById(id, currentUserId = null) {
    const row = await db.oneOrNone(`
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM creations c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
    `, [id]);

    if (!row) return null;
    return CreationModel.formatCreation(row, currentUserId);
  },

  async formatCreation(row, currentUserId = null) {
    const [likesCount, commentsCount, sharesCount, likedByMe] = await Promise.all([
      db.one('SELECT COUNT(*) FROM likes WHERE creation_id = $1', [row.id]),
      db.one('SELECT COUNT(*) FROM comments WHERE creation_id = $1', [row.id]),
      db.one('SELECT COUNT(*) FROM share_events WHERE creation_id = $1', [row.id]),
      currentUserId
        ? db.oneOrNone('SELECT 1 FROM likes WHERE creation_id = $1 AND user_id = $2', [row.id, currentUserId])
        : Promise.resolve(false)
    ]);

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      category: row.category,
      image: UserModel.fileUrl(row.image),
      created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      user: {
        id: row.user_id,
        full_name: row.user_full_name,
        username: row.user_username,
        profile_picture: UserModel.fileUrl(row.user_profile_picture)
      },
      likes: parseInt(likesCount.count, 10),
      comments: parseInt(commentsCount.count, 10),
      shares: parseInt(sharesCount.count, 10),
      liked_by_me: !!likedByMe
    };
  },

  async create({ userId, title, description, category, image }) {
    return db.one(
      `INSERT INTO creations (user_id, title, description, category, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, description, category, image]
    );
  },

  async delete(id, userId) {
    return db.tx(async t => {
      const creation = await t.oneOrNone('SELECT * FROM creations WHERE id = $1', [id]);
      if (!creation) return null;
      if (creation.user_id !== userId) return false;

      await t.none('DELETE FROM likes WHERE creation_id = $1', [id]);
      await t.none('DELETE FROM comments WHERE creation_id = $1', [id]);
      await t.none('DELETE FROM creations WHERE id = $1', [id]);

      return creation;
    });
  },

  async toggleLike(creationId, userId) {
    const existing = await db.oneOrNone(
      'SELECT id FROM likes WHERE creation_id = $1 AND user_id = $2',
      [creationId, userId]
    );

    let liked = false;
    if (existing) {
      await db.none('DELETE FROM likes WHERE id = $1', [existing.id]);
    } else {
      await db.none('INSERT INTO likes (creation_id, user_id) VALUES ($1, $2)', [creationId, userId]);
      liked = true;
    }

    const likesCount = await db.one('SELECT COUNT(*) FROM likes WHERE creation_id = $1', [creationId]);
    return {
      liked,
      likes: parseInt(likesCount.count, 10)
    };
  },

  async addComment(creationId, userId, commentText) {
    const comment = await db.one(
      `INSERT INTO comments (creation_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [creationId, userId, commentText]
    );

    const user = await db.one('SELECT id, full_name, username, profile_picture FROM users WHERE id = $1', [userId]);

    return {
      id: comment.id,
      comment: comment.comment,
      created_at: comment.created_at ? comment.created_at.toISOString() : new Date().toISOString(),
      user: UserModel.formatSmallUser(user)
    };
  },

  async getComments(creationId) {
    const comments = await db.any(`
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.creation_id = $1
      ORDER BY c.created_at ASC
    `, [creationId]);

    return comments.map(c => ({
      id: c.id,
      comment: c.comment,
      created_at: c.created_at ? c.created_at.toISOString() : new Date().toISOString(),
      user: {
        id: c.user_id,
        full_name: c.user_full_name,
        username: c.user_username,
        profile_picture: UserModel.fileUrl(c.user_profile_picture)
      }
    }));
  }
};

module.exports = CreationModel;

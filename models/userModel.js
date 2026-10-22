const { db } = require('../config/db');

function fileUrl(filename) {
  return filename ? `/uploads/${filename}` : null;
}

function formatSmallUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    profile_picture: fileUrl(u.profile_picture)
  };
}

const UserModel = {
  formatSmallUser,
  fileUrl,

  async findById(id) {
    return db.oneOrNone('SELECT * FROM users WHERE id = $1', [id]);
  },

  async findByUsername(username) {
    return db.oneOrNone('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  },

  async findByEmail(email) {
    return db.oneOrNone('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  },

  async create({ fullName, username, email, hashedPassword, bio = '' }) {
    return db.one(
      `INSERT INTO users (full_name, username, email, password, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fullName, username, email.toLowerCase(), hashedPassword, bio]
    );
  },

  async createSession(userId, token) {
    return db.none(
      'INSERT INTO login_sessions (token, user_id) VALUES ($1, $2)',
      [token, userId]
    );
  },

  async deleteSession(token) {
    return db.none('DELETE FROM login_sessions WHERE token = $1', [token]);
  },

  async getUserDetails(userId, currentUserId = null) {
    const user = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) return null;

    const [followersCount, followingCount, creationsCount, isFollowing] = await Promise.all([
      db.one('SELECT COUNT(*) FROM follows WHERE following_id = $1', [userId]),
      db.one('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [userId]),
      db.one('SELECT COUNT(*) FROM creations WHERE user_id = $1', [userId]),
      currentUserId
        ? db.oneOrNone('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUserId, userId])
        : Promise.resolve(false)
    ]);

    return {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      profile_picture: fileUrl(user.profile_picture),
      bio: user.bio || '',
      created_at: user.created_at ? user.created_at.toISOString() : new Date().toISOString(),
      followers: parseInt(followersCount.count, 10),
      following: parseInt(followingCount.count, 10),
      creations: parseInt(creationsCount.count, 10),
      is_following: !!isFollowing,
      role: user.role || 'user',
      status: user.status || 'active'
    };
  },

  async listUsers(query = '', currentUserId = null) {
    let sql = 'SELECT * FROM users';
    const params = [];

    if (query && query.trim()) {
      sql += ' WHERE full_name ILIKE $1 OR username ILIKE $1 OR bio ILIKE $1';
      params.push(`%${query.trim()}%`);
    }

    sql += ' ORDER BY full_name ASC';
    const users = await db.any(sql, params);

    return Promise.all(users.map(u => UserModel.getUserDetails(u.id, currentUserId)));
  },

  async updateProfile(userId, { fullName, bio, profilePicture }) {
    let sql = 'UPDATE users SET full_name = $1, bio = $2';
    const params = [fullName, bio];

    if (profilePicture !== undefined) {
      params.push(profilePicture);
      sql += `, profile_picture = $${params.length}`;
    }

    params.push(userId);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    return db.one(sql, params);
  },

  async updateAccount(userId, { fullName, username, email }) {
    return db.one(
      `UPDATE users
       SET full_name = $1, username = $2, email = $3
       WHERE id = $4
       RETURNING *`,
      [fullName, username, email.toLowerCase(), userId]
    );
  },

  async updatePassword(userId, hashedPassword) {
    return db.none('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
  },

  async updateNotificationsEnabled(userId, enabled) {
    return db.none('UPDATE users SET notifications_enabled = $1 WHERE id = $2', [enabled, userId]);
  },

  async toggleFollow(followerId, followingId) {
    const existing = await db.oneOrNone(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    let following = false;
    if (existing) {
      await db.none('DELETE FROM follows WHERE id = $1', [existing.id]);
    } else {
      await db.none('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);
      following = true;
    }

    const followers = await db.one('SELECT COUNT(*) FROM follows WHERE following_id = $1', [followingId]);
    return {
      following,
      followers: parseInt(followers.count, 10)
    };
  },

  async updateUserStatus(userId, status) {
    return db.one(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, full_name, username, email, role, status',
      [status, userId]
    );
  },

  async updateUserRole(userId, role) {
    return db.one(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, username, email, role, status',
      [role, userId]
    );
  }
};

module.exports = UserModel;

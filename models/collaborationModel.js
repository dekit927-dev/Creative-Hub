const { db } = require('../config/db');
const UserModel = require('./userModel');

const CollaborationModel = {
  async list(currentUserId = null) {
    const rows = await db.any(`
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM collaborations c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
    `);

    return Promise.all(rows.map(row => CollaborationModel.formatCollaboration(row, currentUserId)));
  },

  async getById(id, currentUserId = null) {
    const row = await db.oneOrNone(`
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM collaborations c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
    `, [id]);

    if (!row) return null;
    return CollaborationModel.formatCollaboration(row, currentUserId);
  },

  async formatCollaboration(row, currentUserId = null) {
    const requests = await db.any(`
      SELECT cr.user_id, u.full_name, u.username, u.profile_picture
      FROM collaboration_requests cr
      JOIN users u ON u.id = cr.user_id
      WHERE cr.collaboration_id = $1
    `, [row.id]);

    const requestedByMe = currentUserId ? requests.some(r => r.user_id === currentUserId) : false;

    const requesters = (currentUserId && currentUserId === row.user_id)
      ? requests.map(r => UserModel.formatSmallUser(r))
      : [];

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      skills: row.skills || '',
      status: row.status,
      created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      user: {
        id: row.user_id,
        full_name: row.user_full_name,
        username: row.user_username,
        profile_picture: UserModel.fileUrl(row.user_profile_picture)
      },
      request_count: requests.length,
      requested_by_me: requestedByMe,
      requesters
    };
  },

  async create({ userId, title, description, skills }) {
    return db.one(
      `INSERT INTO collaborations (user_id, title, description, skills, status)
       VALUES ($1, $2, $3, $4, 'Open')
       RETURNING *`,
      [userId, title, description, skills]
    );
  },

  async requestJoin(collaborationId, userId) {
    await db.none(
      'INSERT INTO collaboration_requests (collaboration_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [collaborationId, userId]
    );
    return CollaborationModel.getById(collaborationId, userId);
  },

  async cancelRequest(collaborationId, userId) {
    await db.none(
      'DELETE FROM collaboration_requests WHERE collaboration_id = $1 AND user_id = $2',
      [collaborationId, userId]
    );
    return CollaborationModel.getById(collaborationId, userId);
  },

  async toggleStatus(collaborationId, userId) {
    const collab = await db.oneOrNone('SELECT * FROM collaborations WHERE id = $1', [collaborationId]);
    if (!collab) return null;
    if (collab.user_id !== userId) return false;

    const newStatus = collab.status === 'Open' ? 'Closed' : 'Open';
    await db.none('UPDATE collaborations SET status = $1 WHERE id = $2', [newStatus, collaborationId]);

    return CollaborationModel.getById(collaborationId, userId);
  }
};

module.exports = CollaborationModel;

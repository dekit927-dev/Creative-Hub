const { db } = require('../config/db');

const ShareModel = {
  async recordShare({ userId = null, creationId, shareMethod = 'link_copy' }) {
    return db.one(
      `INSERT INTO share_events (user_id, creation_id, share_method)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, creationId, shareMethod]
    );
  },

  async getShareCount(creationId) {
    const res = await db.one('SELECT COUNT(*) FROM share_events WHERE creation_id = $1', [creationId]);
    return parseInt(res.count, 10);
  },

  async getTotalShareCount(startDate = null, endDate = null) {
    let sql = 'SELECT COUNT(*) FROM share_events';
    const params = [];

    if (startDate && endDate) {
      sql += ' WHERE created_at >= $1 AND created_at <= $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' WHERE created_at >= $1';
      params.push(startDate);
    }

    const res = await db.one(sql, params);
    return parseInt(res.count, 10);
  }
};

module.exports = ShareModel;

const { db } = require('../config/db');

const NotificationModel = {
  async notify(userId, message, type = 'info', link = null) {
    const user = await db.oneOrNone('SELECT notifications_enabled FROM users WHERE id = $1', [userId]);
    if (user && user.notifications_enabled) {
      return db.one(
        `INSERT INTO notifications (user_id, message, type, link)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, message, type, link]
      );
    }
    return null;
  },

  async list(userId, limit = 30) {
    const items = await db.any(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [userId, limit]
    );

    const unreadCount = await db.one(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    return {
      unread: parseInt(unreadCount.count, 10),
      items: items.map(n => ({
        id: n.id,
        message: n.message,
        type: n.type,
        link: n.link,
        is_read: !!n.is_read,
        created_at: n.created_at ? n.created_at.toISOString() : new Date().toISOString()
      }))
    };
  },

  async markAsRead(notificationId, userId) {
    return db.none(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  },

  async markAllAsRead(userId) {
    return db.none(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [userId]
    );
  }
};

module.exports = NotificationModel;

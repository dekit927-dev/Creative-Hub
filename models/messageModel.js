const { db } = require('../config/db');
const UserModel = require('./userModel');

const MessageModel = {
  async listConversations(userId) {
    const messages = await db.any(`
      SELECT m.*
      FROM messages m
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.created_at DESC, m.id DESC
    `, [userId]);

    const seen = new Map();
    for (const m of messages) {
      const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!seen.has(otherId)) {
        seen.set(otherId, {
          otherId,
          last_message: m.message,
          created_at: m.created_at ? m.created_at.toISOString() : new Date().toISOString()
        });
      }
    }

    const conversations = [];
    for (const item of seen.values()) {
      const otherUser = await UserModel.findById(item.otherId);
      if (otherUser) {
        conversations.push({
          user: UserModel.formatSmallUser(otherUser),
          last_message: item.last_message,
          created_at: item.created_at
        });
      }
    }

    return conversations;
  },

  async getMessagesBetween(userId1, userId2) {
    const messages = await db.any(`
      SELECT *
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC, id ASC
    `, [userId1, userId2]);

    return messages.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      message: m.message,
      created_at: m.created_at ? m.created_at.toISOString() : new Date().toISOString()
    }));
  },

  async sendMessage(senderId, receiverId, messageText) {
    const row = await db.one(
      `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, messageText]
    );

    return {
      id: row.id,
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
      message: row.message,
      created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString()
    };
  }
};

module.exports = MessageModel;

const { db } = require('../config/db');

const ReportModel = {
  async createReport({ reporterId, contentType, contentId, reason }) {
    // Check if already reported by this user
    const existing = await db.oneOrNone(
      `SELECT id FROM reports
       WHERE reporter_id = $1 AND content_type = $2 AND content_id = $3 AND status = 'pending'`,
      [reporterId, contentType, contentId]
    );

    if (existing) {
      const err = new Error('You have already submitted a pending report for this item.');
      err.status = 400;
      throw err;
    }

    return db.one(
      `INSERT INTO reports (reporter_id, content_type, content_id, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [reporterId, contentType, contentId, reason.trim()]
    );
  },

  async listReports({ status = 'pending', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT r.*, u.full_name as reporter_name, u.username as reporter_username,
             admin.full_name as resolved_by_name
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users admin ON admin.id = r.resolved_by
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` WHERE r.status = $${params.length}`;
    }

    sql += ' ORDER BY r.created_at DESC';

    if (limit) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const rows = await db.any(sql, params);

    // Fetch details of target content for each report
    return Promise.all(rows.map(async row => {
      let contentDetail = null;
      if (row.content_type === 'creation') {
        const c = await db.oneOrNone(`
          SELECT c.id, c.title, c.category, c.image, c.user_id, u.full_name as creator_name, u.username as creator_username
          FROM creations c
          JOIN users u ON u.id = c.user_id
          WHERE c.id = $1
        `, [row.content_id]);
        contentDetail = c;
      } else if (row.content_type === 'comment') {
        const cm = await db.oneOrNone(`
          SELECT cm.id, cm.comment, cm.creation_id, cm.user_id, u.full_name as commenter_name, u.username as commenter_username
          FROM comments cm
          JOIN users u ON u.id = cm.user_id
          WHERE cm.id = $1
        `, [row.content_id]);
        contentDetail = cm;
      }

      return {
        ...row,
        content: contentDetail
      };
    }));
  },

  async resolveReport({ reportId, adminId, decision, resolutionNote = '', deleteContent = false }) {
    return db.tx(async t => {
      const report = await t.oneOrNone('SELECT * FROM reports WHERE id = $1', [reportId]);
      if (!report) {
        const err = new Error('Report not found.');
        err.status = 404;
        throw err;
      }

      const updatedReport = await t.one(
        `UPDATE reports
         SET status = $1, resolved_at = CURRENT_TIMESTAMP, resolved_by = $2, resolution_note = $3
         WHERE id = $4
         RETURNING *`,
        [decision, adminId, resolutionNote, reportId]
      );

      if (deleteContent) {
        if (report.content_type === 'creation') {
          await t.none('DELETE FROM likes WHERE creation_id = $1', [report.content_id]);
          await t.none('DELETE FROM comments WHERE creation_id = $1', [report.content_id]);
          await t.none('DELETE FROM share_events WHERE creation_id = $1', [report.content_id]);
          await t.none('DELETE FROM creations WHERE id = $1', [report.content_id]);
          await t.none(
            `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
             VALUES ($1, 'delete_creation', 'creation', $2, $3)`,
            [adminId, report.content_id, resolutionNote || 'Removed via report resolution']
          );
        } else if (report.content_type === 'comment') {
          await t.none('DELETE FROM comments WHERE id = $1', [report.content_id]);
          await t.none(
            `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
             VALUES ($1, 'delete_comment', 'comment', $2, $3)`,
            [adminId, report.content_id, resolutionNote || 'Removed via report resolution']
          );
        }
      }

      return updatedReport;
    });
  }
};

module.exports = ReportModel;

const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const UserModel = require('./userModel');
const NotificationModel = require('./notificationModel');
const EmailService = require('../services/emailService');

const CollaborationModel = {
  async list(currentUserId = null) {
    const rows = await db.any(`
      SELECT c.*, u.full_name as user_full_name, u.username as user_username, u.profile_picture as user_profile_picture
      FROM collaborations c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC, c.id DESC
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
      SELECT cr.id as request_id, cr.user_id, cr.status, cr.message, cr.decision_message, cr.created_at, cr.reviewed_at,
             cr.attachment_file, cr.attachment_name, cr.attachment_type,
             u.full_name, u.username, u.profile_picture, u.email
      FROM collaboration_requests cr
      JOIN users u ON u.id = cr.user_id
      WHERE cr.collaboration_id = $1
      ORDER BY cr.created_at DESC
    `, [row.id]);

    const activeRequests = requests.filter(r => r.status !== 'Withdrawn');
    const myRequest = currentUserId ? requests.find(r => r.user_id === currentUserId) : null;
    const requestedByMe = !!(myRequest && myRequest.status !== 'Withdrawn');

    const requesters = (currentUserId && (currentUserId === row.user_id || currentUserId === 1)) // creator or admin
      ? requests.map(r => ({
          request_id: r.request_id,
          status: r.status,
          message: r.message,
          decision_message: r.decision_message,
          attachment_file: r.attachment_file || null,
          attachment_name: r.attachment_name || null,
          attachment_type: r.attachment_type || null,
          attachment_url: r.attachment_file ? UserModel.fileUrl(r.attachment_file) : null,
          created_at: r.created_at ? r.created_at.toISOString() : null,
          reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null,
          user: UserModel.formatSmallUser(r)
        }))
      : [];

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      short_summary: row.short_summary || (row.description ? row.description.slice(0, 140) + '...' : 'Collaborate with student peers on this creative campus initiative.'),
      skills: row.skills || row.roles || 'Creativity, Collaboration',
      category: row.category || 'Multidisciplinary',
      roles: row.roles || row.skills || 'Creative Partner, Contributor',
      positions: row.positions || '1 - 2 members',
      experience: row.experience || 'Beginner to Intermediate',
      participation_type: row.participation_type || 'Team Collaboration',
      location: row.location || 'Kanglung Campus',
      mode: row.mode || 'Hybrid',
      start_date: row.start_date ? row.start_date.toISOString() : null,
      deadline: row.deadline ? row.deadline.toISOString() : null,
      duration: row.duration || '2 - 4 weeks',
      deliverables: row.deliverables || 'Collaborative project outputs, shared showcase submission, and source files.',
      tools: row.tools || 'Adobe CC, Figma, Blender, Procreate, Google Drive',
      compensation: row.compensation || 'Academic / Portfolio Credit & Joint Authorship',
      application_instructions: row.application_instructions || 'Introduce yourself briefly, state the role you are interested in, and provide links or samples of your creative work.',
      status: row.status || 'Open',
      created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      user: {
        id: row.user_id,
        full_name: row.user_full_name,
        username: row.user_username,
        profile_picture: UserModel.fileUrl(row.user_profile_picture)
      },
      request_count: activeRequests.length,
      requested_by_me: requestedByMe,
      my_request: myRequest ? {
        id: myRequest.request_id,
        status: myRequest.status,
        message: myRequest.message || '',
        decision_message: myRequest.decision_message || '',
        attachment_file: myRequest.attachment_file || null,
        attachment_name: myRequest.attachment_name || null,
        attachment_type: myRequest.attachment_type || null,
        attachment_url: myRequest.attachment_file ? UserModel.fileUrl(myRequest.attachment_file) : null,
        created_at: myRequest.created_at ? myRequest.created_at.toISOString() : null,
        reviewed_at: myRequest.reviewed_at ? myRequest.reviewed_at.toISOString() : null
      } : null,
      requesters
    };
  },

  async create(data) {
    const {
      userId,
      title,
      description,
      skills,
      short_summary,
      category,
      roles,
      positions,
      experience,
      participation_type,
      location,
      mode,
      start_date,
      deadline,
      duration,
      deliverables,
      tools,
      compensation,
      application_instructions,
      status
    } = data;

    return db.one(
      `INSERT INTO collaborations (
        user_id, title, description, skills,
        short_summary, category, roles, positions, experience,
        participation_type, location, mode, start_date, deadline,
        duration, deliverables, tools, compensation, application_instructions, status
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20
      )
      RETURNING *`,
      [
        userId,
        title,
        description || '',
        skills || '',
        short_summary || null,
        category || 'General',
        roles || skills || 'Creative Contributor',
        positions || '1 - 2 members',
        experience || 'Beginner to Intermediate',
        participation_type || 'Team Collaboration',
        location || 'Kanglung Campus',
        mode || 'Hybrid',
        start_date || null,
        deadline || null,
        duration || '2 - 4 weeks',
        deliverables || null,
        tools || null,
        compensation || 'Portfolio Credit & Joint Authorship',
        application_instructions || null,
        status || 'Open'
      ]
    );
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      'title', 'description', 'skills', 'short_summary', 'category',
      'roles', 'positions', 'experience', 'participation_type', 'location',
      'mode', 'start_date', 'deadline', 'duration', 'deliverables',
      'tools', 'compensation', 'application_instructions', 'status'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return CollaborationModel.getById(id);

    values.push(id);
    await db.none(`UPDATE collaborations SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return CollaborationModel.getById(id);
  },

  async delete(id) {
    return db.result('DELETE FROM collaborations WHERE id = $1', [id]);
  },

  // Submit request / application
  async apply(collaborationId, userId, { message = '', file = null } = {}) {
    const collab = await db.oneOrNone('SELECT * FROM collaborations WHERE id = $1', [collaborationId]);
    if (!collab) {
      const err = new Error('Collaboration opportunity not found.');
      err.status = 404;
      throw err;
    }

    if (collab.user_id === userId) {
      const err = new Error('You cannot apply to your own collaboration listing.');
      err.status = 400;
      throw err;
    }

    let attachmentFile = null;
    let attachmentName = null;
    let attachmentType = null;
    let attachmentData = null;

    if (file) {
      attachmentFile = file.filename;
      attachmentName = file.originalname;
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext)) {
        attachmentType = 'audio';
      } else if (file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        attachmentType = 'photo';
      } else {
        attachmentType = 'document';
      }

      if (file.path && fs.existsSync(file.path)) {
        try {
          const buf = fs.readFileSync(file.path);
          if (buf.length <= 25 * 1024 * 1024) {
            attachmentData = `data:${file.mimetype || 'application/octet-stream'};base64,${buf.toString('base64')}`;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const existing = await db.oneOrNone(
      'SELECT * FROM collaboration_requests WHERE collaboration_id = $1 AND user_id = $2',
      [collaborationId, userId]
    );

    if (existing) {
      if (existing.status !== 'Withdrawn') {
        const err = new Error(`You have already requested to join this collaboration (Current status: ${existing.status}).`);
        err.status = 400;
        throw err;
      }
      if (file) {
        await db.none(
          `UPDATE collaboration_requests
           SET status = 'Pending', message = $1, decision_message = NULL, reviewed_by = NULL, reviewed_at = NULL,
               attachment_file = $2, attachment_name = $3, attachment_type = $4, attachment_data = $5,
               created_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [message ? message.trim() : '', attachmentFile, attachmentName, attachmentType, attachmentData, existing.id]
        );
      } else {
        await db.none(
          `UPDATE collaboration_requests
           SET status = 'Pending', message = $1, decision_message = NULL, reviewed_by = NULL, reviewed_at = NULL, created_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [message ? message.trim() : '', existing.id]
        );
      }
    } else {
      await db.none(
        `INSERT INTO collaboration_requests (collaboration_id, user_id, status, message, attachment_file, attachment_name, attachment_type, attachment_data)
         VALUES ($1, $2, 'Pending', $3, $4, $5, $6, $7)`,
        [collaborationId, userId, message ? message.trim() : '', attachmentFile, attachmentName, attachmentType, attachmentData]
      );
    }

    // Trigger notification to initiator and confirmation to applicant
    (async () => {
      try {
        const [initiator, applicant] = await Promise.all([
          db.oneOrNone('SELECT full_name, email, notifications_enabled FROM users WHERE id = $1', [collab.user_id]),
          db.oneOrNone('SELECT full_name, email FROM users WHERE id = $1', [userId])
        ]);

        if (initiator && applicant) {
          await NotificationModel.notify(
            collab.user_id,
            `${applicant.full_name} requested to join your collaboration: "${collab.title}".`,
            'info',
            `/collaboration-details.html?id=${collaborationId}`
          );
          await NotificationModel.notify(
            userId,
            `Your request to join "${collab.title}" has been submitted and is currently Pending Review.`,
            'info',
            '/applications.html'
          );
          await EmailService.sendApplicationSubmittedEmail(applicant.email, applicant.full_name, collab.title, 'Collaboration');
        }
      } catch (e) {
        console.error('[CollaborationModel.apply] Async notification error:', e.message);
      }
    })();

    return CollaborationModel.getById(collaborationId, userId);
  },

  // Backwards compatible requestJoin
  async requestJoin(collaborationId, userId) {
    return CollaborationModel.apply(collaborationId, userId, { message: 'Request to join team' });
  },

  // Withdraw request
  async withdraw(collaborationId, userId) {
    const existing = await db.oneOrNone(
      'SELECT * FROM collaboration_requests WHERE collaboration_id = $1 AND user_id = $2',
      [collaborationId, userId]
    );

    if (!existing) {
      const err = new Error('You do not have an active request for this collaboration.');
      err.status = 404;
      throw err;
    }

    if (['Accepted', 'Rejected'].includes(existing.status)) {
      const err = new Error(`Cannot withdraw an application that has already been ${existing.status.toLowerCase()}.`);
      err.status = 400;
      throw err;
    }

    await db.none(
      `UPDATE collaboration_requests SET status = 'Withdrawn' WHERE id = $1`,
      [existing.id]
    );

    return CollaborationModel.getById(collaborationId, userId);
  },

  // Backwards compatible cancelRequest
  async cancelRequest(collaborationId, userId) {
    return CollaborationModel.withdraw(collaborationId, userId);
  },

  // Review / update application status (Collaborator Initiator or Admin)
  async updateRequestStatus(requestId, status, decisionMessage = '', reviewerId = null) {
    const validStatuses = ['Pending', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const updated = await db.oneOrNone(
      `UPDATE collaboration_requests
       SET status = $1, decision_message = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, decisionMessage ? decisionMessage.trim() : null, reviewerId, requestId]
    );

    if (!updated) {
      const err = new Error('Collaboration request not found.');
      err.status = 404;
      throw err;
    }

    // Trigger notification and email
    (async () => {
      try {
        const [collab, user] = await Promise.all([
          db.oneOrNone('SELECT title FROM collaborations WHERE id = $1', [updated.collaboration_id]),
          db.oneOrNone('SELECT full_name, email, notifications_enabled FROM users WHERE id = $1', [updated.user_id])
        ]);

        if (collab && user) {
          const noteText = decisionMessage ? ` Note: "${decisionMessage}"` : '';
          await NotificationModel.notify(
            updated.user_id,
            `Your request to join "${collab.title}" has been updated to: ${status}.${noteText}`,
            status === 'Accepted' ? 'success' : (status === 'Rejected' ? 'error' : 'info'),
            '/applications.html'
          );
          await EmailService.sendApplicationDecisionEmail(
            user.email,
            user.full_name,
            collab.title,
            'Collaboration',
            status,
            decisionMessage
          );
        }
      } catch (e) {
        console.error('[CollaborationModel.updateRequestStatus] Notification error:', e.message);
      }
    })();

    return updated;
  },

  async getRequesters(collaborationId) {
    const rows = await db.any(`
      SELECT cr.id as request_id, cr.status, cr.message, cr.decision_message, cr.reviewed_at, cr.created_at,
             cr.attachment_file, cr.attachment_name, cr.attachment_type,
             u.id, u.full_name, u.username, u.email, u.profile_picture
      FROM collaboration_requests cr
      JOIN users u ON u.id = cr.user_id
      WHERE cr.collaboration_id = $1
      ORDER BY cr.created_at DESC
    `, [collaborationId]);

    return rows.map(r => ({
      request_id: r.request_id,
      status: r.status,
      message: r.message,
      decision_message: r.decision_message,
      attachment_file: r.attachment_file || null,
      attachment_name: r.attachment_name || null,
      attachment_type: r.attachment_type || null,
      attachment_url: r.attachment_file ? UserModel.fileUrl(r.attachment_file) : null,
      created_at: r.created_at ? r.created_at.toISOString() : null,
      reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null,
      user: UserModel.formatSmallUser(r)
    }));
  },

  // Get all collaboration requests submitted by a user
  async getUserRequests(userId) {
    const rows = await db.any(`
      SELECT cr.id as request_id, cr.status, cr.message, cr.decision_message, cr.reviewed_at, cr.created_at as applied_at,
             cr.attachment_file, cr.attachment_name, cr.attachment_type,
             c.id as collaboration_id, c.title, c.category, c.roles, c.mode, c.duration, c.status as collaboration_status, c.short_summary,
             u.full_name as lead_name
      FROM collaboration_requests cr
      JOIN collaborations c ON c.id = cr.collaboration_id
      JOIN users u ON u.id = c.user_id
      WHERE cr.user_id = $1
      ORDER BY cr.created_at DESC
    `, [userId]);

    return rows.map(r => ({
      application_id: r.request_id,
      type: 'Collaboration',
      opportunity_id: r.collaboration_id,
      title: r.title,
      category: r.category,
      role: r.roles || 'Creative Contributor',
      lead_name: r.lead_name,
      mode: r.mode || 'Hybrid',
      duration: r.duration || '2-4 weeks',
      short_summary: r.short_summary || '',
      status: r.status,
      message: r.message || '',
      decision_message: r.decision_message || '',
      attachment_file: r.attachment_file || null,
      attachment_name: r.attachment_name || null,
      attachment_type: r.attachment_type || null,
      attachment_url: r.attachment_file ? UserModel.fileUrl(r.attachment_file) : null,
      applied_at: r.applied_at ? r.applied_at.toISOString() : null,
      reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null,
      details_url: `collaboration-details.html?id=${r.collaboration_id}`
    }));
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

const { db } = require('../config/db');
const UserModel = require('./userModel');
const NotificationModel = require('./notificationModel');
const EmailService = require('../services/emailService');

const ChallengeModel = {
  async list(currentUserId = null) {
    const challenges = await db.any('SELECT * FROM challenges ORDER BY deadline ASC, id DESC');
    return Promise.all(challenges.map(ch => ChallengeModel.formatChallenge(ch, currentUserId)));
  },

  async getById(id, currentUserId = null) {
    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id = $1', [id]);
    if (!challenge) return null;
    return ChallengeModel.formatChallenge(challenge, currentUserId);
  },

  async formatChallenge(ch, currentUserId = null) {
    const [participantsCount, userApp] = await Promise.all([
      db.one('SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = $1 AND status != $2', [ch.id, 'Withdrawn']),
      currentUserId
        ? db.oneOrNone('SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2', [ch.id, currentUserId])
        : Promise.resolve(null)
    ]);

    const isJoined = !!(userApp && userApp.status !== 'Withdrawn');

    return {
      id: ch.id,
      title: ch.title,
      description: ch.description || '',
      short_summary: ch.short_summary || (ch.description ? ch.description.slice(0, 140) + '...' : 'Participate in this creative challenge to showcase your skills and collaborate with peers.'),
      category: ch.category || 'Creative Arts',
      organizer: ch.organizer || 'Sherubtse Creative Club',
      skills: ch.skills || ch.category || 'Creativity, Collaboration',
      eligibility: ch.eligibility || 'Open to all enrolled Sherubtse College students across all departments.',
      participation_type: ch.participation_type || 'Individual / Team',
      team_size: ch.team_size || '1 - 4 members',
      location: ch.location || 'Kanglung Campus',
      mode: ch.mode || 'Hybrid',
      start_date: ch.start_date ? ch.start_date.toISOString() : null,
      deadline: ch.deadline ? ch.deadline.toISOString() : new Date().toISOString(),
      event_date: ch.event_date ? ch.event_date.toISOString() : null,
      submission_instructions: ch.submission_instructions || 'Submit your project deliverables through the CreativeHub portal before the deadline.',
      deliverables: ch.deliverables || 'Original creative work file or public portfolio link, accompanying project description, and brief creator note.',
      evaluation_criteria: ch.evaluation_criteria || 'Originality & concept (40%), Technical execution & craft (30%), Theme relevance & impact (30%).',
      prizes: ch.prizes || 'Certificates of Excellence, featured campus showcase exhibition, and recognition in the Sherubtse creative community.',
      resources: ch.resources || 'Campus Design Lab workstations, equipment booking via Media Cell, and mentor guidance sessions.',
      contact_info: ch.contact_info || 'creatives@sherubtse.edu.bt',
      status: ch.status || (ch.deadline && new Date(ch.deadline) < new Date() ? 'Completed' : 'Active'),
      participants: parseInt(participantsCount.count, 10),
      joined: isJoined,
      my_application: userApp ? {
        id: userApp.id,
        status: userApp.status,
        message: userApp.message || '',
        decision_message: userApp.decision_message || '',
        created_at: userApp.created_at ? userApp.created_at.toISOString() : null,
        reviewed_at: userApp.reviewed_at ? userApp.reviewed_at.toISOString() : null
      } : null
    };
  },

  async create(data) {
    const {
      userId,
      title,
      description,
      category,
      deadline,
      short_summary,
      organizer,
      skills,
      eligibility,
      participation_type,
      team_size,
      location,
      mode,
      start_date,
      event_date,
      submission_instructions,
      deliverables,
      evaluation_criteria,
      prizes,
      resources,
      contact_info,
      status
    } = data;

    return db.one(
      `INSERT INTO challenges (
        user_id, title, description, category, deadline,
        short_summary, organizer, skills, eligibility, participation_type,
        team_size, location, mode, start_date, event_date,
        submission_instructions, deliverables, evaluation_criteria, prizes,
        resources, contact_info, status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22
      )
      RETURNING *`,
      [
        userId,
        title,
        description || '',
        category || 'General',
        deadline,
        short_summary || null,
        organizer || 'Sherubtse Creative Club',
        skills || null,
        eligibility || 'Open to all Sherubtse students',
        participation_type || 'Individual',
        team_size || '1 - 4 members',
        location || 'Kanglung Campus',
        mode || 'Hybrid',
        start_date || null,
        event_date || null,
        submission_instructions || null,
        deliverables || null,
        evaluation_criteria || null,
        prizes || null,
        resources || null,
        contact_info || 'creatives@sherubtse.edu.bt',
        status || 'Active'
      ]
    );
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      'title', 'description', 'category', 'deadline', 'short_summary',
      'organizer', 'skills', 'eligibility', 'participation_type', 'team_size',
      'location', 'mode', 'start_date', 'event_date', 'submission_instructions',
      'deliverables', 'evaluation_criteria', 'prizes', 'resources', 'contact_info', 'status'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return ChallengeModel.getById(id);

    values.push(id);
    await db.none(`UPDATE challenges SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return ChallengeModel.getById(id);
  },

  async delete(id) {
    return db.result('DELETE FROM challenges WHERE id = $1', [id]);
  },

  // Apply with application message/portfolio link
  async apply(challengeId, userId, { message = '' } = {}) {
    const existing = await db.oneOrNone(
      'SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, userId]
    );

    if (existing) {
      if (existing.status !== 'Withdrawn') {
        const err = new Error(`You have already applied for this challenge (Current status: ${existing.status}).`);
        err.status = 400;
        throw err;
      }
      // Reactivate withdrawn application
      await db.none(
        `UPDATE challenge_participants
         SET status = 'Pending', message = $1, decision_message = NULL, reviewed_by = NULL, reviewed_at = NULL, created_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [message ? message.trim() : '', existing.id]
      );
    } else {
      await db.none(
        `INSERT INTO challenge_participants (challenge_id, user_id, status, message)
         VALUES ($1, $2, 'Pending', $3)`,
        [challengeId, userId, message ? message.trim() : '']
      );
    }

    // Trigger confirmation notification & email asynchronously
    (async () => {
      try {
        const [ch, user] = await Promise.all([
          db.oneOrNone('SELECT title FROM challenges WHERE id = $1', [challengeId]),
          db.oneOrNone('SELECT full_name, email, notifications_enabled FROM users WHERE id = $1', [userId])
        ]);
        if (ch && user) {
          await NotificationModel.notify(
            userId,
            `Your application for "${ch.title}" has been submitted and is currently Pending Review.`,
            'info',
            '/applications.html'
          );
          await EmailService.sendApplicationSubmittedEmail(user.email, user.full_name, ch.title, 'Challenge');
        }
      } catch (e) {
        console.error('[ChallengeModel.apply] Async notification error:', e.message);
      }
    })();

    return ChallengeModel.getById(challengeId, userId);
  },

  // Backwards compatible join
  async join(challengeId, userId) {
    return ChallengeModel.apply(challengeId, userId, { message: 'Registered participation' });
  },

  // Withdraw application
  async withdraw(challengeId, userId) {
    const existing = await db.oneOrNone(
      'SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, userId]
    );

    if (!existing) {
      const err = new Error('You do not have an active application for this challenge.');
      err.status = 404;
      throw err;
    }

    if (['Accepted', 'Rejected'].includes(existing.status)) {
      const err = new Error(`Cannot withdraw an application that has already been ${existing.status.toLowerCase()}.`);
      err.status = 400;
      throw err;
    }

    await db.none(
      `UPDATE challenge_participants SET status = 'Withdrawn' WHERE id = $1`,
      [existing.id]
    );

    return ChallengeModel.getById(challengeId, userId);
  },

  // Backwards compatible leave
  async leave(challengeId, userId) {
    return ChallengeModel.withdraw(challengeId, userId);
  },

  // Review / update application status (Admin or Organizer)
  async updateApplicationStatus(participantId, status, decisionMessage = '', adminId = null) {
    const validStatuses = ['Pending', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const updated = await db.oneOrNone(
      `UPDATE challenge_participants
       SET status = $1, decision_message = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, decisionMessage ? decisionMessage.trim() : null, adminId, participantId]
    );

    if (!updated) {
      const err = new Error('Application record not found.');
      err.status = 404;
      throw err;
    }

    // Trigger notification and email
    (async () => {
      try {
        const [ch, user] = await Promise.all([
          db.oneOrNone('SELECT title FROM challenges WHERE id = $1', [updated.challenge_id]),
          db.oneOrNone('SELECT full_name, email, notifications_enabled FROM users WHERE id = $1', [updated.user_id])
        ]);
        if (ch && user) {
          const noteText = decisionMessage ? ` Feedback: "${decisionMessage}"` : '';
          await NotificationModel.notify(
            updated.user_id,
            `Your application for "${ch.title}" has been updated to: ${status}.${noteText}`,
            status === 'Accepted' ? 'success' : (status === 'Rejected' ? 'error' : 'info'),
            '/applications.html'
          );
          await EmailService.sendApplicationDecisionEmail(
            user.email,
            user.full_name,
            ch.title,
            'Challenge',
            status,
            decisionMessage
          );
        }
      } catch (e) {
        console.error('[ChallengeModel.updateApplicationStatus] Notification error:', e.message);
      }
    })();

    return updated;
  },

  async getParticipants(challengeId) {
    const rows = await db.any(`
      SELECT cp.id as application_id, cp.status, cp.message, cp.decision_message, cp.reviewed_at, cp.created_at,
             u.id, u.full_name, u.username, u.email, u.profile_picture
      FROM challenge_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.challenge_id = $1
      ORDER BY cp.created_at DESC
    `, [challengeId]);

    return rows.map(r => ({
      application_id: r.application_id,
      status: r.status,
      message: r.message,
      decision_message: r.decision_message,
      created_at: r.created_at ? r.created_at.toISOString() : null,
      reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null,
      user: UserModel.formatSmallUser(r)
    }));
  },

  // Get all challenge applications submitted by a user
  async getUserApplications(userId) {
    const rows = await db.any(`
      SELECT cp.id as application_id, cp.status, cp.message, cp.decision_message, cp.reviewed_at, cp.created_at as applied_at,
             c.id as challenge_id, c.title, c.category, c.deadline, c.organizer, c.mode, c.status as challenge_status, c.short_summary
      FROM challenge_participants cp
      JOIN challenges c ON c.id = cp.challenge_id
      WHERE cp.user_id = $1
      ORDER BY cp.created_at DESC
    `, [userId]);

    return rows.map(r => ({
      application_id: r.application_id,
      type: 'Challenge',
      opportunity_id: r.challenge_id,
      title: r.title,
      category: r.category,
      organizer: r.organizer || 'Sherubtse Creative Club',
      mode: r.mode || 'Hybrid',
      deadline: r.deadline ? r.deadline.toISOString() : null,
      short_summary: r.short_summary || '',
      status: r.status,
      message: r.message || '',
      decision_message: r.decision_message || '',
      applied_at: r.applied_at ? r.applied_at.toISOString() : null,
      reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null,
      details_url: `challenge-details.html?id=${r.challenge_id}`
    }));
  }
};

module.exports = ChallengeModel;

const { db } = require('../config/db');
const UserModel = require('./userModel');

const ChallengeModel = {
  async list(currentUserId = null) {
    const challenges = await db.any('SELECT * FROM challenges ORDER BY deadline ASC');
    return Promise.all(challenges.map(ch => ChallengeModel.formatChallenge(ch, currentUserId)));
  },

  async getById(id, currentUserId = null) {
    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id = $1', [id]);
    if (!challenge) return null;
    return ChallengeModel.formatChallenge(challenge, currentUserId);
  },

  async formatChallenge(ch, currentUserId = null) {
    const [participantsCount, joined] = await Promise.all([
      db.one('SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = $1', [ch.id]),
      currentUserId
        ? db.oneOrNone('SELECT 1 FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2', [ch.id, currentUserId])
        : Promise.resolve(false)
    ]);

    return {
      id: ch.id,
      title: ch.title,
      description: ch.description || '',
      category: ch.category,
      deadline: ch.deadline ? ch.deadline.toISOString() : new Date().toISOString(),
      participants: parseInt(participantsCount.count, 10),
      joined: !!joined
    };
  },

  async create({ userId, title, description, category, deadline }) {
    return db.one(
      `INSERT INTO challenges (user_id, title, description, category, deadline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, description, category, deadline]
    );
  },

  async join(challengeId, userId) {
    await db.none(
      'INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [challengeId, userId]
    );
    return ChallengeModel.getById(challengeId, userId);
  },

  async leave(challengeId, userId) {
    await db.none(
      'DELETE FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, userId]
    );
    return ChallengeModel.getById(challengeId, userId);
  },

  async getParticipants(challengeId) {
    const rows = await db.any(`
      SELECT u.id, u.full_name, u.username, u.profile_picture
      FROM challenge_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.challenge_id = $1
      ORDER BY u.full_name ASC
    `, [challengeId]);

    return rows.map(UserModel.formatSmallUser);
  }
};

module.exports = ChallengeModel;

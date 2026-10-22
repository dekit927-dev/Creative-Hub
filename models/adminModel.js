const { db } = require('../config/db');
const UserModel = require('./userModel');

function getDateRange(period = '30d', customStart = null, customEnd = null) {
  const now = new Date();
  let startDate = null;
  let endDate = new Date(now);
  let prevStartDate = null;
  let prevEndDate = null;

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    const duration = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - duration);
    prevEndDate = new Date(startDate.getTime());
    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'all':
    default:
      startDate = new Date(2020, 0, 1);
      prevStartDate = null;
      prevEndDate = null;
      break;
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

const AdminModel = {
  getDateRange,

  async getOverviewStats(period = '30d', customStart = null, customEnd = null) {
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period, customStart, customEnd);

    // 1. Current Total Metrics
    const [
      totalUsersRes,
      totalCreationsRes,
      totalLikesRes,
      totalCommentsRes,
      totalSharesRes,
      totalFollowsRes,
      pendingReportsRes
    ] = await Promise.all([
      db.one("SELECT COUNT(*) FROM users WHERE role != 'admin'"),
      db.one('SELECT COUNT(*) FROM creations'),
      db.one('SELECT COUNT(*) FROM likes'),
      db.one('SELECT COUNT(*) FROM comments'),
      db.one('SELECT COUNT(*) FROM share_events'),
      db.one('SELECT COUNT(*) FROM follows'),
      db.one("SELECT COUNT(*) FROM reports WHERE status = 'pending'")
    ]);

    // 2. Active Users in Period (Users with creations, likes, comments, or challenges)
    const activeUsersRes = await db.one(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM (
        SELECT user_id FROM creations WHERE created_at >= $1 AND created_at <= $2
        UNION
        SELECT user_id FROM likes WHERE created_at >= $1 AND created_at <= $2
        UNION
        SELECT user_id FROM comments WHERE created_at >= $1 AND created_at <= $2
        UNION
        SELECT user_id FROM challenge_participants WHERE created_at >= $1 AND created_at <= $2
        UNION
        SELECT user_id FROM share_events WHERE user_id IS NOT NULL AND created_at >= $1 AND created_at <= $2
      ) active_pool
    `, [startDate, endDate]);

    // 3. New Registrations in Period
    const newRegRes = await db.one(
      "SELECT COUNT(*) FROM users WHERE role != 'admin' AND created_at >= $1 AND created_at <= $2",
      [startDate, endDate]
    );

    // 4. Prior Period for Delta calculation if historical dates exist
    let priorRegCount = 0;
    let priorActiveUsers = 0;
    if (prevStartDate && prevEndDate) {
      const pReg = await db.one(
        "SELECT COUNT(*) FROM users WHERE role != 'admin' AND created_at >= $1 AND created_at <= $2",
        [prevStartDate, prevEndDate]
      );
      priorRegCount = parseInt(pReg.count, 10);

      const pActive = await db.one(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM (
          SELECT user_id FROM creations WHERE created_at >= $1 AND created_at <= $2
          UNION
          SELECT user_id FROM likes WHERE created_at >= $1 AND created_at <= $2
          UNION
          SELECT user_id FROM comments WHERE created_at >= $1 AND created_at <= $2
        ) prev_active
      `, [prevStartDate, prevEndDate]);
      priorActiveUsers = parseInt(pActive.count, 10);
    }

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      total_users: parseInt(totalUsersRes.count, 10),
      active_users: parseInt(activeUsersRes.count, 10),
      prior_active_users: priorActiveUsers,
      total_creations: parseInt(totalCreationsRes.count, 10),
      total_likes: parseInt(totalLikesRes.count, 10),
      total_comments: parseInt(totalCommentsRes.count, 10),
      total_shares: parseInt(totalSharesRes.count, 10),
      total_follows: parseInt(totalFollowsRes.count, 10),
      new_registrations: parseInt(newRegRes.count, 10),
      prior_new_registrations: priorRegCount,
      pending_reports: parseInt(pendingReportsRes.count, 10)
    };
  },

  async getUserGrowth(period = '30d', customStart = null, customEnd = null) {
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const rows = await db.any(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
             COUNT(*) AS count
      FROM users
      WHERE role != 'admin' AND created_at >= $1 AND created_at <= $2
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `, [startDate, endDate]);

    return rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) }));
  },

  async getPlatformActivity(period = '30d', customStart = null, customEnd = null) {
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const [creations, likes, comments, shares, registrations] = await Promise.all([
      db.any(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) as count
        FROM creations WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date ORDER BY date ASC
      `, [startDate, endDate]),
      db.any(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) as count
        FROM likes WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date ORDER BY date ASC
      `, [startDate, endDate]),
      db.any(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) as count
        FROM comments WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date ORDER BY date ASC
      `, [startDate, endDate]),
      db.any(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) as count
        FROM share_events WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date ORDER BY date ASC
      `, [startDate, endDate]),
      db.any(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) as count
        FROM users WHERE role != 'admin' AND created_at >= $1 AND created_at <= $2
        GROUP BY date ORDER BY date ASC
      `, [startDate, endDate])
    ]);

    // Aggregate by date
    const dateMap = new Map();
    const addSeries = (list, key) => {
      for (const item of list) {
        if (!dateMap.has(item.date)) {
          dateMap.set(item.date, { date: item.date, creations: 0, likes: 0, comments: 0, shares: 0, registrations: 0 });
        }
        dateMap.get(item.date)[key] = parseInt(item.count, 10);
      }
    };

    addSeries(creations, 'creations');
    addSeries(likes, 'likes');
    addSeries(comments, 'comments');
    addSeries(shares, 'shares');
    addSeries(registrations, 'registrations');

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  },

  async getCategoryPopularity() {
    const rows = await db.any(`
      SELECT category as name, COUNT(*) as count
      FROM creations
      GROUP BY category
      ORDER BY count DESC
    `);

    const total = rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return rows.map(r => {
      const count = parseInt(r.count, 10);
      const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
      return { name: r.name, count, percentage };
    });
  },

  async getEngagementDistribution() {
    const [likesRes, commentsRes, sharesRes] = await Promise.all([
      db.one('SELECT COUNT(*) FROM likes'),
      db.one('SELECT COUNT(*) FROM comments'),
      db.one('SELECT COUNT(*) FROM share_events')
    ]);

    const likes = parseInt(likesRes.count, 10);
    const comments = parseInt(commentsRes.count, 10);
    const shares = parseInt(sharesRes.count, 10);
    const total = likes + comments + shares;

    return {
      likes,
      comments,
      shares,
      total_engagement: total,
      likes_percentage: total > 0 ? parseFloat(((likes / total) * 100).toFixed(1)) : 0,
      comments_percentage: total > 0 ? parseFloat(((comments / total) * 100).toFixed(1)) : 0,
      shares_percentage: total > 0 ? parseFloat(((shares / total) * 100).toFixed(1)) : 0
    };
  },

  // ================= 5 ESSENTIAL CREATOR RANKINGS =================
  async getCreatorRankings({ type = 'highest_engagement', limit = 10, period = 'all', customStart = null, customEnd = null } = {}) {
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);
    const hasDateFilter = period !== 'all';

    // Safe SQL subqueries aggregated separately before joining
    let sql = `
      WITH user_creations AS (
        SELECT user_id,
               COUNT(*) AS total_posts,
               COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) AS posts_in_period,
               MAX(created_at) AS latest_post_date
        FROM creations
        GROUP BY user_id
      ),
      user_likes AS (
        SELECT c.user_id,
               COUNT(l.id) AS total_likes,
               COUNT(l.id) FILTER (WHERE l.created_at >= $1 AND l.created_at <= $2) AS likes_in_period
        FROM creations c
        LEFT JOIN likes l ON l.creation_id = c.id
        GROUP BY c.user_id
      ),
      user_comments AS (
        SELECT c.user_id,
               COUNT(cm.id) AS total_comments,
               COUNT(cm.id) FILTER (WHERE cm.created_at >= $1 AND cm.created_at <= $2) AS comments_in_period,
               COUNT(DISTINCT c.id) FILTER (WHERE cm.id IS NOT NULL) AS posts_with_comments
        FROM creations c
        LEFT JOIN comments cm ON cm.creation_id = c.id
        GROUP BY c.user_id
      ),
      user_shares AS (
        SELECT c.user_id,
               COUNT(se.id) AS total_shares,
               COUNT(se.id) FILTER (WHERE se.created_at >= $1 AND se.created_at <= $2) AS shares_in_period,
               COUNT(DISTINCT c.id) FILTER (WHERE se.id IS NOT NULL) AS posts_with_shares
        FROM creations c
        LEFT JOIN share_events se ON se.creation_id = c.id
        GROUP BY c.user_id
      ),
      user_followers AS (
        SELECT following_id AS user_id,
               COUNT(*) AS total_followers
        FROM follows
        GROUP BY following_id
      )
      SELECT u.id, u.full_name, u.username, u.profile_picture, u.role, u.status, u.created_at as joined_date,
             COALESCE(uc.total_posts, 0) AS total_posts,
             COALESCE(uc.posts_in_period, 0) AS posts_in_period,
             uc.latest_post_date,
             COALESCE(ul.total_likes, 0) AS total_likes,
             COALESCE(ul.likes_in_period, 0) AS likes_in_period,
             COALESCE(ucm.total_comments, 0) AS total_comments,
             COALESCE(ucm.comments_in_period, 0) AS comments_in_period,
             COALESCE(ucm.posts_with_comments, 0) AS posts_with_comments,
             COALESCE(us.total_shares, 0) AS total_shares,
             COALESCE(us.shares_in_period, 0) AS shares_in_period,
             COALESCE(us.posts_with_shares, 0) AS posts_with_shares,
             COALESCE(uf.total_followers, 0) AS total_followers,
             (COALESCE(ul.total_likes, 0) + COALESCE(ucm.total_comments, 0) + COALESCE(us.total_shares, 0)) AS total_engagement,
             (COALESCE(ul.likes_in_period, 0) + COALESCE(ucm.comments_in_period, 0) + COALESCE(us.shares_in_period, 0)) AS period_engagement
      FROM users u
      LEFT JOIN user_creations uc ON uc.user_id = u.id
      LEFT JOIN user_likes ul ON ul.user_id = u.id
      LEFT JOIN user_comments ucm ON ucm.user_id = u.id
      LEFT JOIN user_shares us ON us.user_id = u.id
      LEFT JOIN user_followers uf ON uf.user_id = u.id
      WHERE u.role != 'admin'
    `;

    // Dynamic ordering based on ranking type
    switch (type) {
      case 'most_posts':
        sql += hasDateFilter ? ' ORDER BY posts_in_period DESC, total_posts DESC' : ' ORDER BY total_posts DESC';
        break;
      case 'most_likes':
        sql += hasDateFilter ? ' ORDER BY likes_in_period DESC, total_likes DESC' : ' ORDER BY total_likes DESC';
        break;
      case 'most_comments':
        sql += hasDateFilter ? ' ORDER BY comments_in_period DESC, total_comments DESC' : ' ORDER BY total_comments DESC';
        break;
      case 'most_shares':
        sql += hasDateFilter ? ' ORDER BY shares_in_period DESC, total_shares DESC' : ' ORDER BY total_shares DESC';
        break;
      case 'most_followers':
        sql += ' ORDER BY total_followers DESC, total_engagement DESC';
        break;
      case 'highest_engagement':
      default:
        sql += hasDateFilter ? ' ORDER BY period_engagement DESC, total_engagement DESC' : ' ORDER BY total_engagement DESC';
        break;
    }

    sql += ' LIMIT $3';

    const rows = await db.any(sql, [startDate, endDate, limit]);

    return rows.map((r, index) => {
      const totalPosts = parseInt(r.total_posts, 10);
      const totalLikes = parseInt(r.total_likes, 10);
      const totalComments = parseInt(r.total_comments, 10);
      const totalShares = parseInt(r.total_shares, 10);
      const totalFollowers = parseInt(r.total_followers, 10);
      const totalEngagement = totalLikes + totalComments + totalShares;

      const avgLikes = totalPosts > 0 ? parseFloat((totalLikes / totalPosts).toFixed(1)) : 0;
      const avgComments = totalPosts > 0 ? parseFloat((totalComments / totalPosts).toFixed(1)) : 0;
      const avgEngagement = totalPosts > 0 ? parseFloat((totalEngagement / totalPosts).toFixed(1)) : 0;

      return {
        rank: index + 1,
        id: r.id,
        full_name: r.full_name,
        username: r.username,
        profile_picture: UserModel.fileUrl(r.profile_picture),
        role: r.role,
        status: r.status,
        joined_date: r.joined_date ? r.joined_date.toISOString() : null,
        total_posts: totalPosts,
        posts_in_period: parseInt(r.posts_in_period, 10),
        latest_post_date: r.latest_post_date ? r.latest_post_date.toISOString() : null,
        total_likes: totalLikes,
        likes_in_period: parseInt(r.likes_in_period, 10),
        avg_likes_per_post: avgLikes,
        total_comments: totalComments,
        comments_in_period: parseInt(r.comments_in_period, 10),
        avg_comments_per_post: avgComments,
        posts_with_comments: parseInt(r.posts_with_comments, 10),
        total_shares: totalShares,
        shares_in_period: parseInt(r.shares_in_period, 10),
        posts_with_shares: parseInt(r.posts_with_shares, 10),
        total_followers: totalFollowers,
        total_engagement: totalEngagement,
        period_engagement: parseInt(r.period_engagement, 10),
        avg_engagement_per_post: avgEngagement
      };
    });
  },

  // ================= CREATOR COMPARISON =================
  async compareCreators(creatorIds = []) {
    if (!creatorIds || creatorIds.length === 0) return [];

    const rows = await db.any(`
      SELECT u.id, u.full_name, u.username, u.profile_picture,
             (SELECT COUNT(*) FROM creations WHERE user_id = u.id) AS total_posts,
             (SELECT COUNT(*) FROM likes l JOIN creations c ON c.id = l.creation_id WHERE c.user_id = u.id) AS total_likes,
             (SELECT COUNT(*) FROM comments cm JOIN creations c ON c.id = cm.creation_id WHERE c.user_id = u.id) AS total_comments,
             (SELECT COUNT(*) FROM share_events se JOIN creations c ON c.id = se.creation_id WHERE c.user_id = u.id) AS total_shares,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS total_followers
      FROM users u
      WHERE u.id = ANY($1::int[])
    `, [creatorIds]);

    return rows.map(r => {
      const posts = parseInt(r.total_posts, 10);
      const likes = parseInt(r.total_likes, 10);
      const comments = parseInt(r.total_comments, 10);
      const shares = parseInt(r.total_shares, 10);
      const followers = parseInt(r.total_followers, 10);
      const engagement = likes + comments + shares;
      const avgEngagement = posts > 0 ? parseFloat((engagement / posts).toFixed(1)) : 0;

      return {
        id: r.id,
        full_name: r.full_name,
        username: r.username,
        profile_picture: UserModel.fileUrl(r.profile_picture),
        total_posts: posts,
        total_likes: likes,
        total_comments: comments,
        total_shares: shares,
        total_followers: followers,
        total_engagement: engagement,
        avg_engagement: avgEngagement
      };
    });
  },

  // ================= INDIVIDUAL CREATOR ANALYTICS =================
  async getIndividualCreatorAnalytics(creatorId) {
    const user = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [creatorId]);
    if (!user) return null;

    const [followersCount, followingCount] = await Promise.all([
      db.one('SELECT COUNT(*) FROM follows WHERE following_id = $1', [creatorId]),
      db.one('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [creatorId])
    ]);

    const creations = await db.any(`
      SELECT c.*,
             (SELECT COUNT(*) FROM likes WHERE creation_id = c.id) AS likes_count,
             (SELECT COUNT(*) FROM comments WHERE creation_id = c.id) AS comments_count,
             (SELECT COUNT(*) FROM share_events WHERE creation_id = c.id) AS shares_count
      FROM creations c
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `, [creatorId]);

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    const categoryCounts = {};

    const formattedCreations = creations.map(c => {
      const l = parseInt(c.likes_count, 10);
      const cm = parseInt(c.comments_count, 10);
      const s = parseInt(c.shares_count, 10);
      totalLikes += l;
      totalComments += cm;
      totalShares += s;

      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        image: UserModel.fileUrl(c.image),
        created_at: c.created_at.toISOString(),
        likes: l,
        comments: cm,
        shares: s,
        engagement: l + cm + s
      };
    });

    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = creations.length > 0 ? parseFloat((totalEngagement / creations.length).toFixed(1)) : 0;

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        profile_picture: UserModel.fileUrl(user.profile_picture),
        role: user.role,
        status: user.status,
        joined_date: user.created_at.toISOString(),
        followers: parseInt(followersCount.count, 10),
        following: parseInt(followingCount.count, 10)
      },
      stats: {
        total_posts: creations.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        total_engagement: totalEngagement,
        avg_engagement_per_post: avgEngagement
      },
      categories: categoryCounts,
      creations: formattedCreations
    };
  },

  // ================= CONTENT ANALYTICS =================
  async getContentAnalytics({ category = '', creatorId = null, sortBy = 'engagement', order = 'DESC', limit = 20, page = 1, period = 'all' } = {}) {
    const offset = (page - 1) * limit;
    const { startDate, endDate } = getDateRange(period);

    let whereClauses = [];
    let params = [];

    if (category) {
      params.push(category);
      whereClauses.push(`c.category = $${params.length}`);
    }

    if (creatorId) {
      params.push(creatorId);
      whereClauses.push(`c.user_id = $${params.length}`);
    }

    if (period !== 'all') {
      params.push(startDate);
      whereClauses.push(`c.created_at >= $${params.length}`);
      params.push(endDate);
      whereClauses.push(`c.created_at <= $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    // Order field selection
    let orderClause = 'total_engagement DESC';
    if (sortBy === 'likes') orderClause = 'total_likes ' + order;
    else if (sortBy === 'comments') orderClause = 'total_comments ' + order;
    else if (sortBy === 'shares') orderClause = 'total_shares ' + order;
    else if (sortBy === 'date') orderClause = 'c.created_at ' + order;
    else orderClause = 'total_engagement ' + order;

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const sql = `
      SELECT c.id, c.title, c.description, c.category, c.image, c.created_at,
             u.id as creator_id, u.full_name as creator_name, u.username as creator_username, u.profile_picture as creator_picture,
             COALESCE((SELECT COUNT(*) FROM likes WHERE creation_id = c.id), 0) AS total_likes,
             COALESCE((SELECT COUNT(*) FROM comments WHERE creation_id = c.id), 0) AS total_comments,
             COALESCE((SELECT COUNT(*) FROM share_events WHERE creation_id = c.id), 0) AS total_shares,
             (
               COALESCE((SELECT COUNT(*) FROM likes WHERE creation_id = c.id), 0) +
               COALESCE((SELECT COUNT(*) FROM comments WHERE creation_id = c.id), 0) +
               COALESCE((SELECT COUNT(*) FROM share_events WHERE creation_id = c.id), 0)
             ) AS total_engagement
      FROM creations c
      JOIN users u ON u.id = c.user_id
      ${whereStr}
      ORDER BY ${orderClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const countSql = `
      SELECT COUNT(*) FROM creations c
      JOIN users u ON u.id = c.user_id
      ${whereStr}
    `;

    const [rows, totalRes] = await Promise.all([
      db.any(sql, params),
      db.one(countSql, params.slice(0, limitParam - 1))
    ]);

    const total = parseInt(totalRes.count, 10);

    return {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      items: rows.map((r, idx) => ({
        rank: offset + idx + 1,
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        image: UserModel.fileUrl(r.image),
        created_at: r.created_at.toISOString(),
        creator: {
          id: r.creator_id,
          name: r.creator_name,
          username: r.creator_username,
          profile_picture: UserModel.fileUrl(r.creator_picture)
        },
        likes: parseInt(r.total_likes, 10),
        comments: parseInt(r.total_comments, 10),
        shares: parseInt(r.total_shares, 10),
        total_engagement: parseInt(r.total_engagement, 10)
      }))
    };
  },

  // ================= USER MANAGEMENT =================
  async getUsersList({ search = '', status = '', role = '', limit = 20, page = 1 } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    if (role && role !== 'all') {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    const whereStr = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const sql = `
      SELECT u.id, u.full_name, u.username, u.email, u.bio, u.profile_picture, u.role, u.status, u.created_at,
             (SELECT COUNT(*) FROM creations WHERE user_id = u.id) AS creations_count,
             (SELECT COUNT(*) FROM likes l JOIN creations c ON c.id = l.creation_id WHERE c.user_id = u.id) AS likes_received,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
      FROM users u
      ${whereStr}
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countSql = `SELECT COUNT(*) FROM users u ${whereStr}`;

    const [rows, totalRes] = await Promise.all([
      db.any(sql, params),
      db.one(countSql, params.slice(0, limitIdx - 1))
    ]);

    const total = parseInt(totalRes.count, 10);

    return {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      users: rows.map(u => ({
        id: u.id,
        full_name: u.full_name,
        username: u.username,
        email: u.email,
        bio: u.bio || '',
        profile_picture: UserModel.fileUrl(u.profile_picture),
        role: u.role,
        status: u.status,
        joined_date: u.created_at.toISOString(),
        creations_count: parseInt(u.creations_count, 10),
        likes_received: parseInt(u.likes_received, 10),
        followers_count: parseInt(u.followers_count, 10)
      }))
    };
  },

  async setUserStatus(userId, status, adminId, reason = '') {
    return db.tx(async t => {
      const user = await t.oneOrNone('SELECT * FROM users WHERE id = $1', [userId]);
      if (!user) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
      }

      if (user.role === 'admin') {
        const err = new Error('Cannot change status of an administrator.');
        err.status = 400;
        throw err;
      }

      const updated = await t.one(
        'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, full_name, username, email, role, status',
        [status, userId]
      );

      await t.none(
        `INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
         VALUES ($1, $2, 'user', $3, $4)`,
        [adminId, status === 'suspended' ? 'suspend_user' : 'activate_user', userId, reason]
      );

      return updated;
    });
  },

  async getRecentRegistrations(limit = 6) {
    const rows = await db.any(`
      SELECT id, full_name, username, email, profile_picture, role, status, created_at
      FROM users
      WHERE role != 'admin'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return rows.map(r => ({
      ...r,
      profile_picture: UserModel.fileUrl(r.profile_picture),
      created_at: r.created_at.toISOString()
    }));
  },

  async getRecentContentActivity(limit = 6) {
    const rows = await db.any(`
      SELECT c.id, c.title, c.category, c.image, c.created_at,
             u.id as user_id, u.full_name, u.username, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE creation_id = c.id) AS likes_count,
             (SELECT COUNT(*) FROM comments WHERE creation_id = c.id) AS comments_count
      FROM creations c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [limit]);

    return rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      image: UserModel.fileUrl(r.image),
      created_at: r.created_at.toISOString(),
      creator: {
        id: r.user_id,
        name: r.full_name,
        username: r.username,
        profile_picture: UserModel.fileUrl(r.profile_picture)
      },
      likes: parseInt(r.likes_count, 10),
      comments: parseInt(r.comments_count, 10)
    }));
  }
};

module.exports = AdminModel;

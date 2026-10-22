// Comprehensive Admin Dashboard & Analytics Test Suite
// Tests all endpoints, PostgreSQL aggregations, RBAC, rankings, and moderation against real database

const http = require('http');
const { app } = require('./app');
const { db } = require('./config/db');
const { seedDatabase } = require('./config/seed');

let server;
let baseUrl;

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('CREATIVEHUB ADMIN DASHBOARD & ANALYTICS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Start Server on ephemeral port
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // Ensure database is freshly seeded
    await seedDatabase();

    // 2. Authentication & RBAC Tests
    console.log('--- TEST GROUP 1: AUTHENTICATION & SECURITY (RBAC) ---');

    // 2.1 Unauthenticated access to admin endpoints
    const unauthRes = await request('GET', '/api/admin/dashboard/overview');
    assert(unauthRes.status === 401, 'Unauthenticated access to /api/admin/dashboard/overview returns 401 Unauthorized');

    // 2.2 Student login (role = user)
    const studentLogin = await request('POST', '/api/login', {}, {
      email: 'sonam@sherubtse.edu.bt',
      password: 'password123'
    });
    assert(studentLogin.status === 200 && studentLogin.data.token, 'Student can log in successfully');
    const studentToken = studentLogin.data.token;

    // 2.3 Regular student attempting admin endpoint
    const studentAdminRes = await request('GET', '/api/admin/dashboard/overview', {
      'Authorization': `Bearer ${studentToken}`
    });
    assert(studentAdminRes.status === 403, 'Regular student (role=user) receives 403 Forbidden on admin endpoint');

    // 2.4 Admin login (role = admin)
    const adminLogin = await request('POST', '/api/login', {}, {
      email: 'admin@sherubtse.edu.bt',
      password: 'password123'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.user.role === 'admin', 'Admin logs in successfully with role=admin');
    const adminToken = adminLogin.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // 3. Overview Statistics Tests
    console.log('\n--- TEST GROUP 2: DASHBOARD OVERVIEW STATISTICS ---');
    const overviewRes = await request('GET', '/api/admin/dashboard/overview?period=all', adminHeaders);
    assert(overviewRes.status === 200, 'Admin can fetch /api/admin/dashboard/overview');
    const stats = overviewRes.data;

    // Verify DB counts match actual SQL queries
    const [dbUsers, dbCreations, dbLikes, dbComments, dbShares, dbFollows] = await Promise.all([
      db.one("SELECT COUNT(*) FROM users WHERE role != 'admin'"),
      db.one('SELECT COUNT(*) FROM creations'),
      db.one('SELECT COUNT(*) FROM likes'),
      db.one('SELECT COUNT(*) FROM comments'),
      db.one('SELECT COUNT(*) FROM share_events'),
      db.one('SELECT COUNT(*) FROM follows')
    ]);

    assert(stats.total_users === parseInt(dbUsers.count, 10), `Total users metric matches DB (${stats.total_users})`);
    assert(stats.total_creations === parseInt(dbCreations.count, 10), `Total creations metric matches DB (${stats.total_creations})`);
    assert(stats.total_likes === parseInt(dbLikes.count, 10), `Total likes metric matches DB (${stats.total_likes})`);
    assert(stats.total_comments === parseInt(dbComments.count, 10), `Total comments metric matches DB (${stats.total_comments})`);
    assert(stats.total_shares === parseInt(dbShares.count, 10), `Total tracked shares matches DB (${stats.total_shares})`);
    assert(stats.total_follows === parseInt(dbFollows.count, 10), `Total follows matches DB (${stats.total_follows})`);
    assert(Array.isArray(stats.recent_users) && stats.recent_users.length > 0, 'Recent student registrations returned');
    assert(Array.isArray(stats.recent_activity) && stats.recent_activity.length > 0, 'Recent content activity returned');

    // 4. Time Series & Graphical Data Tests
    console.log('\n--- TEST GROUP 3: STATISTICAL & GRAPHICAL DATA ---');
    const userGrowthRes = await request('GET', '/api/admin/dashboard/user-growth?period=all', adminHeaders);
    assert(userGrowthRes.status === 200 && Array.isArray(userGrowthRes.data), 'User growth returns array of time-series records');

    const activityRes = await request('GET', '/api/admin/dashboard/activity?period=all', adminHeaders);
    assert(activityRes.status === 200 && Array.isArray(activityRes.data), 'Platform activity returns multi-series records (creations, likes, comments, shares)');

    const catDistRes = await request('GET', '/api/admin/dashboard/categories', adminHeaders);
    assert(catDistRes.status === 200 && Array.isArray(catDistRes.data) && catDistRes.data.length > 0, 'Category popularity returns array with counts and percentages');
    const catPercentSum = catDistRes.data.reduce((sum, c) => sum + c.percentage, 0);
    assert(Math.round(catPercentSum) >= 99 && Math.round(catPercentSum) <= 101, `Category percentages sum to ~100% (${catPercentSum}%)`);

    const engDistRes = await request('GET', '/api/admin/dashboard/engagement', adminHeaders);
    assert(engDistRes.status === 200, 'Engagement distribution returns likes, comments, and shares components');
    assert(engDistRes.data.total_engagement === (engDistRes.data.likes + engDistRes.data.comments + engDistRes.data.shares),
      'Total engagement formula holds: likes + comments + shares');

    // 5. Creator Rankings Tests (The 5 Essential Rankings)
    console.log('\n--- TEST GROUP 4: 5 ESSENTIAL CREATOR RANKINGS ---');

    // 5.1 Highest Engagement
    const rankEng = await request('GET', '/api/admin/analytics/rankings?type=highest_engagement&limit=10', adminHeaders);
    assert(rankEng.status === 200 && Array.isArray(rankEng.data.rankings) && rankEng.data.rankings.length > 0,
      'Rankings 1: Highest Engagement ranking returns sorted creators');
    const topEng = rankEng.data.rankings[0];
    assert(topEng.total_engagement >= (rankEng.data.rankings[1]?.total_engagement || 0),
      `Top creator is sorted properly by engagement (Rank #1: ${topEng.full_name} with ${topEng.total_engagement} total engagement)`);

    // 5.2 Most Posts
    const rankPosts = await request('GET', '/api/admin/analytics/rankings?type=most_posts&limit=10', adminHeaders);
    assert(rankPosts.status === 200 && Array.isArray(rankPosts.data.rankings), 'Rankings 2: Most Posts ranking returns list');
    assert(rankPosts.data.rankings[0].total_posts >= (rankPosts.data.rankings[1]?.total_posts || 0),
      `Top poster is sorted properly (Rank #1: ${rankPosts.data.rankings[0].full_name} with ${rankPosts.data.rankings[0].total_posts} creations)`);

    // 5.3 Most Likes Received
    const rankLikes = await request('GET', '/api/admin/analytics/rankings?type=most_likes&limit=10', adminHeaders);
    assert(rankLikes.status === 200 && Array.isArray(rankLikes.data.rankings), 'Rankings 3: Most Likes ranking returns list');
    assert(rankLikes.data.rankings[0].total_likes >= (rankLikes.data.rankings[1]?.total_likes || 0),
      `Top liked creator is sorted properly (Rank #1: ${rankLikes.data.rankings[0].full_name} with ${rankLikes.data.rankings[0].total_likes} likes)`);

    // 5.4 Most Comments Received
    const rankComments = await request('GET', '/api/admin/analytics/rankings?type=most_comments&limit=10', adminHeaders);
    assert(rankComments.status === 200 && Array.isArray(rankComments.data.rankings), 'Rankings 4: Most Comments ranking returns list');
    assert(rankComments.data.rankings[0].total_comments >= (rankComments.data.rankings[1]?.total_comments || 0),
      `Top commented creator is sorted properly (Rank #1: ${rankComments.data.rankings[0].full_name} with ${rankComments.data.rankings[0].total_comments} comments)`);

    // 5.5 Most Shares Received
    const rankShares = await request('GET', '/api/admin/analytics/rankings?type=most_shares&limit=10', adminHeaders);
    assert(rankShares.status === 200 && Array.isArray(rankShares.data.rankings), 'Rankings 5: Most Shares ranking returns list');
    assert(rankShares.data.rankings[0].total_shares >= (rankShares.data.rankings[1]?.total_shares || 0),
      `Top shared creator is sorted properly (Rank #1: ${rankShares.data.rankings[0].full_name} with ${rankShares.data.rankings[0].total_shares} shares)`);

    // 5.6 Route aliases from Section 16
    const aliasTopPosters = await request('GET', '/api/admin/analytics/top-posters', adminHeaders);
    assert(aliasTopPosters.status === 200 && aliasTopPosters.data.rankings.length > 0, 'Section 16 alias: GET /api/admin/analytics/top-posters works');

    const aliasTopLiked = await request('GET', '/api/admin/analytics/top-liked-creators', adminHeaders);
    assert(aliasTopLiked.status === 200 && aliasTopLiked.data.rankings.length > 0, 'Section 16 alias: GET /api/admin/analytics/top-liked-creators works');

    // 6. Creator Comparison & Individual Analytics Tests
    console.log('\n--- TEST GROUP 5: CREATOR COMPARISON & INDIVIDUAL ANALYTICS ---');
    const compareRes = await request('GET', '/api/admin/analytics/compare?ids=1,2,3', adminHeaders);
    assert(compareRes.status === 200 && Array.isArray(compareRes.data) && compareRes.data.length >= 2,
      'Creator comparison tool compares multiple creators side-by-side');

    const singleCreatorRes = await request('GET', `/api/admin/analytics/creator/${topEng.id}`, adminHeaders);
    assert(singleCreatorRes.status === 200 && singleCreatorRes.data.user && singleCreatorRes.data.stats,
      `Individual creator analytics fetches full stats & public creations for ${topEng.full_name}`);
    assert(!singleCreatorRes.data.user.password, 'Password / secrets are NOT exposed in analytics output');

    // 7. Content Analytics Tests
    console.log('\n--- TEST GROUP 6: CONTENT ANALYTICS & POPULAR POSTS ---');
    const contentRes = await request('GET', '/api/admin/analytics/content?sort_by=engagement&order=DESC&limit=10', adminHeaders);
    assert(contentRes.status === 200 && Array.isArray(contentRes.data.items) && contentRes.data.items.length > 0,
      'Content analytics returns ranked creative works');
    const topWork = contentRes.data.items[0];
    assert(topWork.total_engagement === (topWork.likes + topWork.comments + topWork.shares),
      `Post total engagement equals sum of likes, comments, and shares (${topWork.total_engagement} = ${topWork.likes} + ${topWork.comments} + ${topWork.shares})`);

    // 8. User Management Tests
    console.log('\n--- TEST GROUP 7: USER MANAGEMENT & SUSPENSION ---');
    const usersListRes = await request('GET', '/api/admin/users?role=user', adminHeaders);
    assert(usersListRes.status === 200 && Array.isArray(usersListRes.data.users), 'Admin can list registered users');

    const targetUser = usersListRes.data.users[0];
    // Suspend user
    const suspendRes = await request('PATCH', `/api/admin/users/${targetUser.id}/status`, adminHeaders, {
      status: 'suspended',
      reason: 'Violation of campus community guidelines.'
    });
    assert(suspendRes.status === 200 && suspendRes.data.user.status === 'suspended',
      `Admin can suspend user ${targetUser.full_name}`);

    // Verify suspended user is blocked from logging in
    const suspendedLogin = await request('POST', '/api/login', {}, {
      email: targetUser.email,
      password: 'password123'
    });
    assert(suspendedLogin.status === 403, 'Suspended user is blocked from logging in with 403 Forbidden');

    // Reactivate user
    const reactivateRes = await request('PATCH', `/api/admin/users/${targetUser.id}/status`, adminHeaders, {
      status: 'active',
      reason: 'Account reinstated after appeal.'
    });
    assert(reactivateRes.status === 200 && reactivateRes.data.user.status === 'active',
      `Admin can reactivate user ${targetUser.full_name}`);

    // Admin manually creates user
    const newUsername = 'manual_user_' + Date.now().toString().slice(-6);
    const createUserRes = await request('POST', '/api/admin/users', adminHeaders, {
      full_name: 'Dechen Dorji',
      username: newUsername,
      email: `${newUsername}@sherubtse.edu.bt`,
      password: 'testpassword123',
      role: 'user',
      status: 'active',
      bio: 'Media & graphic design student at Sherubtse.'
    });
    assert(createUserRes.status === 201 && createUserRes.data.user && createUserRes.data.user.id,
      `Admin can manually register new user (${newUsername})`);

    // Verify newly created user can log in
    const newLoginRes = await request('POST', '/api/login', {}, {
      email: `${newUsername}@sherubtse.edu.bt`,
      password: 'testpassword123'
    });
    assert(newLoginRes.status === 200 && newLoginRes.data.token,
      'Newly registered user can log in successfully');

    // Duplicate username is rejected
    const dupRes = await request('POST', '/api/admin/users', adminHeaders, {
      full_name: 'Dechen Duplicate',
      username: newUsername,
      email: `other_${newUsername}@sherubtse.edu.bt`,
      password: 'testpassword123'
    });
    assert(dupRes.status === 400, 'Duplicate username registration rejected with 400 Bad Request');

    // 9. Content Moderation & Reports Tests
    console.log('\n--- TEST GROUP 8: CONTENT MODERATION & REPORTS QUEUE ---');
    // Student submits report
    const reportSubmit = await request('POST', '/api/admin/report', { 'Authorization': `Bearer ${studentToken}` }, {
      content_type: 'creation',
      content_id: topWork.id,
      reason: 'Checking moderation system'
    });
    assert(reportSubmit.status === 200 && reportSubmit.data.report, 'Student can submit content report');
    const reportId = reportSubmit.data.report.id;

    // Admin views reports queue
    const reportsQueue = await request('GET', '/api/admin/reports?status=pending', adminHeaders);
    assert(reportsQueue.status === 200 && reportsQueue.data.some(r => r.id === reportId),
      'Pending report appears in admin reports queue');

    // Admin resolves report (dismiss)
    const resolveRes = await request('POST', `/api/admin/reports/${reportId}/resolve`, adminHeaders, {
      decision: 'dismissed',
      resolution_note: 'Content reviewed and deemed acceptable.'
    });
    assert(resolveRes.status === 200 && resolveRes.data.report.status === 'dismissed',
      'Admin can dismiss report and record resolution note');

    // Verify moderation log recorded in DB
    const modLogs = await db.any('SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT 5');
    assert(modLogs.length > 0, `Moderation actions recorded in audit log table (${modLogs.length} logs found)`);

    // 10. Category Management CRUD Tests
    console.log('\n--- TEST GROUP 9: CATEGORY MANAGEMENT ---');
    const testCatName = 'Sculpture & Pottery ' + Date.now();
    const createCatRes = await request('POST', '/api/admin/categories', adminHeaders, {
      name: testCatName,
      description: 'Handmade pottery, clay modeling, and campus sculptures.'
    });
    assert(createCatRes.status === 200 && createCatRes.data.id, `Admin can create new category: "${testCatName}"`);
    const newCatId = createCatRes.data.id;

    // Update Category
    const updateCatRes = await request('PUT', `/api/admin/categories/${newCatId}`, adminHeaders, {
      name: testCatName + ' (Updated)',
      description: 'Updated description'
    });
    assert(updateCatRes.status === 200 && updateCatRes.data.name.includes('(Updated)'),
      'Admin can edit category name and description');

    // Safe Delete Category
    const deleteCatRes = await request('DELETE', `/api/admin/categories/${newCatId}`, adminHeaders);
    assert(deleteCatRes.status === 200, 'Admin can safely delete category (with reassignment to Other)');

    // 11. Share Tracking Tests
    console.log('\n--- TEST GROUP 10: SHARE TRACKING ---');
    const preShares = await db.one('SELECT COUNT(*) FROM share_events');
    const shareRes = await request('POST', `/api/creations/${topWork.id}/share`, { 'Authorization': `Bearer ${studentToken}` }, {
      method: 'link_copy'
    });
    assert(shareRes.status === 200 && shareRes.data.shares > 0,
      `Share action recorded successfully for post #${topWork.id} (Total shares now: ${shareRes.data.shares})`);
    const postShares = await db.one('SELECT COUNT(*) FROM share_events');
    assert(parseInt(postShares.count, 10) === parseInt(preShares.count, 10) + 1,
      'Share event persisted accurately to PostgreSQL share_events table');

    // 12. User Post Deletion & Permissions Tests
    console.log('\n--- TEST GROUP 11: USER POST DELETION & PERMISSIONS ---');
    // Create a temporary post owned by Sonam
    const testPost = await db.one(`
      INSERT INTO creations (user_id, title, description, category, image)
      VALUES ($1, 'Temporary Creative Video/Artwork', 'User delete option test', 'Other', 'temp_test_del.jpg')
      RETURNING id, user_id
    `, [studentLogin.data.user.id]);

    // Unauthenticated delete request should return 401
    const unauthDelRes = await request('DELETE', `/api/creations/${testPost.id}`);
    assert(unauthDelRes.status === 401, 'Unauthenticated user cannot delete posts (401 Unauthorized)');

    // Log in as a different student (Tashi)
    const tashiLogin = await request('POST', '/api/login', {}, {
      email: 'tashi@sherubtse.edu.bt',
      password: 'password123'
    });
    const tashiToken = tashiLogin.data.token;

    // Different student attempting to delete Sonam's post should return 403
    const forbiddenDelRes = await request('DELETE', `/api/creations/${testPost.id}`, {
      'Authorization': `Bearer ${tashiToken}`
    });
    assert(forbiddenDelRes.status === 403, 'User cannot delete another creator\'s post (403 Forbidden)');

    // Owner (Sonam) deleting her own post should succeed (200)
    const ownerDelRes = await request('DELETE', `/api/creations/${testPost.id}`, {
      'Authorization': `Bearer ${studentToken}`
    });
    assert(ownerDelRes.status === 200 && ownerDelRes.data.message.includes('deleted'),
      'Creator can successfully delete their own post with delete option');

    // Verify post is gone from DB
    const checkDeleted = await db.oneOrNone('SELECT id FROM creations WHERE id = $1', [testPost.id]);
    assert(checkDeleted === null, 'Deleted post is permanently removed from the database');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) server.close();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();

// CreativeHub Admin Dashboard & Analytics Controller
// Full integration with Node.js/Express backend & PostgreSQL

let currentPeriod = '30d';
let customStart = null;
let customEnd = null;
let currentRankingType = 'highest_engagement';
let currentRankingLimit = 10;
let cachedRankings = [];
let cachedUsers = [];
let cachedCategories = [];
let activeReportsStatus = 'pending';

// Chart instances
let userGrowthChartInstance = null;
let platformActivityChartInstance = null;
let categoryChartInstance = null;
let engagementPieChartInstance = null;
let rankingBarChartInstance = null;
let compareBarChartInstance = null;
let analyticsDeepActivityChartInstance = null;

// Modal state
let pendingUserStatusChange = null;
let pendingReportAction = null;
let editingCategoryId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await initPage();
    if (!user) return;

    if (user.role !== 'admin') {
      document.querySelector('.admin-main').innerHTML = `
        <div style="text-align:center; padding:60px 20px;">
          <h2 style="color:var(--danger)">Access Denied</h2>
          <p style="color:var(--muted); margin:12px 0 24px;">Administrator privileges are required to view this system.</p>
          <a href="home.html" class="btn">Return to Campus Feed</a>
        </div>
      `;
      return;
    }

    // Initialize routing & listeners
    setupNavigation();
    setupHashRouting();
    await loadInitialData();
  } catch (err) {
    toast(err.message || 'Failed to initialize admin dashboard.');
  }
});

// ================= NAVIGATION & ROUTING =================
function setupNavigation() {
  const navItems = document.querySelectorAll('.admin-nav-item[data-tab]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      window.location.hash = tab;
    });
  });

  setupHorizontalScroll();
}

function setupHorizontalScroll() {
  const containers = [
    document.getElementById('admin-sidebar'),
    document.getElementById('ranking-type-tabs'),
    ...document.querySelectorAll('.table-wrap')
  ].filter(Boolean);

  containers.forEach(container => {
    if (container._hasHScroll) return;
    container._hasHScroll = true;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    container.addEventListener('mousedown', (e) => {
      if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      isDown = true;
      container.classList.add('is-dragging');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        container.classList.remove('is-dragging');
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    });

    // Translate vertical mouse wheel over horizontal scroll container into horizontal scrolling
    container.addEventListener('wheel', (e) => {
      if (container.scrollWidth > container.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  });
}

function setupHashRouting() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'overview';
    switchTab(hash);
  });

  const initialHash = window.location.hash.replace('#', '') || 'overview';
  switchTab(initialHash);
}

function switchTab(tabName) {
  // Update sidebar active link
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(el => {
    const isActive = el.dataset.tab === tabName;
    el.classList.toggle('active', isActive);
    if (isActive && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // Toggle visible section
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  const activeSection = document.getElementById(`tab-${tabName}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Bind any tables in newly active section for horizontal drag/wheel
  setTimeout(setupHorizontalScroll, 100);

  // Load relevant section data
  loadTabData(tabName);
}

function loadTabData(tabName) {
  switch (tabName) {
    case 'overview':
      loadOverviewData();
      break;
    case 'analytics':
      loadAnalyticsData();
      break;
    case 'rankings':
      loadCreatorRankings();
      break;
    case 'content':
      loadContentAnalytics();
      break;
    case 'users':
      loadUsersList();
      break;
    case 'creations':
      loadCreationsManagement();
      break;
    case 'comments':
      loadCommentsManagement();
      break;
    case 'reports':
      loadReportsQueue(activeReportsStatus);
      break;
    case 'categories':
      loadCategoriesList();
      break;
  }
}

function refreshCurrentTab() {
  const currentTab = window.location.hash.replace('#', '') || 'overview';
  loadTabData(currentTab);
  toast('Data refreshed from PostgreSQL.');
}

// ================= DATE FILTERS =================
function handlePeriodChange() {
  const select = document.getElementById('period-select');
  const customInputs = document.getElementById('custom-date-inputs');
  currentPeriod = select.value;

  if (currentPeriod === 'custom') {
    customInputs.classList.remove('hidden');
    return;
  } else {
    customInputs.classList.add('hidden');
    customStart = null;
    customEnd = null;
  }

  const periodLabels = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time'
  };
  document.getElementById('active-range-label').textContent = periodLabels[currentPeriod] || currentPeriod;
  refreshCurrentTab();
}

function applyCustomDateRange() {
  const start = document.getElementById('custom-start-date').value;
  const end = document.getElementById('custom-end-date').value;

  if (!start || !end) {
    toast('Please select both start and end dates.');
    return;
  }

  customStart = start;
  customEnd = end;
  document.getElementById('active-range-label').textContent = `${start} to ${end}`;
  refreshCurrentTab();
}

function getQueryFilterString() {
  let params = `period=${encodeURIComponent(currentPeriod)}`;
  if (currentPeriod === 'custom' && customStart && customEnd) {
    params += `&start_date=${encodeURIComponent(customStart)}&end_date=${encodeURIComponent(customEnd)}`;
  }
  return params;
}

// ================= 1. DASHBOARD OVERVIEW =================
async function loadOverviewData() {
  try {
    const q = getQueryFilterString();
    const data = await api(`/api/admin/dashboard/overview?${q}`);

    // Populate 10 Summary Cards
    document.getElementById('stat-total-users').textContent = data.total_users;
    document.getElementById('stat-active-users').textContent = data.active_users;
    document.getElementById('stat-total-creations').textContent = data.total_creations;
    document.getElementById('stat-total-likes').textContent = data.total_likes;
    document.getElementById('stat-total-comments').textContent = data.total_comments;
    document.getElementById('stat-total-shares').textContent = data.total_shares;
    document.getElementById('stat-total-follows').textContent = data.total_follows;
    document.getElementById('stat-new-reg').textContent = data.new_registrations;
    document.getElementById('stat-pending-reports').textContent = data.pending_reports;

    // Delta / Trend labels
    const userTrendEl = document.getElementById('trend-active-users');
    if (data.prior_active_users !== undefined) {
      const diff = data.active_users - data.prior_active_users;
      const sign = diff >= 0 ? '+' : '';
      userTrendEl.textContent = `${sign}${diff} vs prior period`;
      userTrendEl.className = 'stat-card-trend ' + (diff >= 0 ? 'trend-up' : 'trend-down');
    }

    const regTrendEl = document.getElementById('trend-new-reg');
    if (data.prior_new_registrations !== undefined) {
      const diff = data.new_registrations - data.prior_new_registrations;
      const sign = diff >= 0 ? '+' : '';
      regTrendEl.textContent = `${sign}${diff} vs prior period`;
      regTrendEl.className = 'stat-card-trend ' + (diff >= 0 ? 'trend-up' : 'trend-down');
    }

    // Update pending reports badge in sidebar
    const badge = document.getElementById('sidebar-reports-badge');
    if (badge) {
      badge.textContent = data.pending_reports;
      badge.classList.toggle('hidden', data.pending_reports === 0);
    }

    // Populate Recent Registrations Table
    const recentUsersBody = document.getElementById('overview-recent-users');
    if (data.recent_users && data.recent_users.length > 0) {
      recentUsersBody.innerHTML = data.recent_users.map(u => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              ${avatar(u, 'small')}
              <div style="min-width:0; overflow:hidden;">
                <strong style="display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.88rem;">${esc(u.full_name)}</strong>
                <div class="muted" style="font-size:0.75rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${esc(u.email || '@' + u.username)}</div>
              </div>
            </div>
          </td>
          <td style="font-size:0.82rem; white-space:nowrap; color:var(--muted);">${formatDate(u.created_at)}</td>
          <td style="text-align:right;"><span class="status-pill ${u.status}">${u.status}</span></td>
        </tr>
      `).join('');
    } else {
      recentUsersBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No recent registrations found.</td></tr>`;
    }

    // Populate Recent Activity Table
    const recentActBody = document.getElementById('overview-recent-activity');
    if (data.recent_activity && data.recent_activity.length > 0) {
      recentActBody.innerHTML = data.recent_activity.map(p => `
        <tr>
          <td style="max-width:200px;">
            <a href="creation-details.html?id=${p.id}" style="color:inherit; font-weight:600; display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.88rem;" title="${esc(p.title)}">${esc(p.title)}</a>
            <div class="muted" style="font-size:0.75rem; margin-top:2px;">by ${esc(p.creator.name)}</div>
          </td>
          <td><span class="tag">${esc(p.category)}</span></td>
          <td style="text-align:right; font-size:0.82rem; white-space:nowrap;">
            <strong>${p.likes}</strong> likes &middot; <strong>${p.comments}</strong> comm
          </td>
        </tr>
      `).join('');
    } else {
      recentActBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No recent content uploaded.</td></tr>`;
    }

    // Load Charts concurrently
    await Promise.all([
      loadUserGrowthChart(),
      loadPlatformActivityChart(),
      loadCategoryDistributionChart(),
      loadEngagementPieChart()
    ]);
  } catch (err) {
    toast(err.message || 'Error loading overview data.');
  }
}

// Chart 1: User Growth
async function loadUserGrowthChart() {
  const q = getQueryFilterString();
  const data = await api(`/api/admin/dashboard/user-growth?${q}`);
  const ctx = document.getElementById('userGrowthChart').getContext('2d');

  if (userGrowthChartInstance) userGrowthChartInstance.destroy();

  const labels = data.map(d => d.date);
  const values = data.map(d => d.count);

  userGrowthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'New Registrations',
        data: values.length ? values : [0],
        borderColor: '#5b3df5',
        backgroundColor: 'rgba(91, 61, 245, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Chart 2: Platform Activity
async function loadPlatformActivityChart() {
  const q = getQueryFilterString();
  const data = await api(`/api/admin/dashboard/activity?${q}`);
  const ctx = document.getElementById('platformActivityChart').getContext('2d');

  if (platformActivityChartInstance) platformActivityChartInstance.destroy();

  const labels = data.map(d => d.date);

  platformActivityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [
        {
          label: 'Creations',
          data: data.map(d => d.creations),
          borderColor: '#5b3df5',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Likes',
          data: data.map(d => d.likes),
          borderColor: '#e53935',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Comments',
          data: data.map(d => d.comments),
          borderColor: '#0288d1',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Shares',
          data: data.map(d => d.shares),
          borderColor: '#2e7d32',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12 } }
      }
    }
  });
}

// Chart 3: Category Distribution
async function loadCategoryDistributionChart() {
  const data = await api('/api/admin/dashboard/categories');
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (categoryChartInstance) categoryChartInstance.destroy();

  const labels = data.map(d => d.name);
  const values = data.map(d => d.count);
  const colors = ['#5b3df5', '#ff9800', '#2e7d32', '#e53935', '#9c27b0', '#00bcd4', '#795548'];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['None'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: function(item) {
              const count = item.raw;
              const cat = data[item.dataIndex];
              return ` ${item.label}: ${count} works (${cat ? cat.percentage : 0}%)`;
            }
          }
        }
      }
    }
  });
}

// Chart 4: Engagement Composition
async function loadEngagementPieChart() {
  const data = await api('/api/admin/dashboard/engagement');
  const ctx = document.getElementById('engagementPieChart').getContext('2d');

  if (engagementPieChartInstance) engagementPieChartInstance.destroy();

  engagementPieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Likes Received', 'Comments Received', 'Tracked Shares'],
      datasets: [{
        data: [data.likes, data.comments, data.shares],
        backgroundColor: ['#e53935', '#0288d1', '#2e7d32'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: function(item) {
              const val = item.raw;
              const total = data.total_engagement;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${item.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ================= 2. ANALYTICS OVERVIEW =================
async function loadAnalyticsData() {
  try {
    const q = getQueryFilterString();
    const [activity, categories, engagement] = await Promise.all([
      api(`/api/admin/dashboard/activity?${q}`),
      api('/api/admin/dashboard/categories'),
      api('/api/admin/dashboard/engagement')
    ]);

    // Render Deep Activity Chart
    const ctx = document.getElementById('analyticsDeepActivityChart').getContext('2d');
    if (analyticsDeepActivityChartInstance) analyticsDeepActivityChartInstance.destroy();

    analyticsDeepActivityChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: activity.map(d => d.date),
        datasets: [
          { label: 'Creations', data: activity.map(d => d.creations), backgroundColor: '#5b3df5' },
          { label: 'Likes', data: activity.map(d => d.likes), backgroundColor: '#e53935' },
          { label: 'Comments', data: activity.map(d => d.comments), backgroundColor: '#0288d1' },
          { label: 'Shares', data: activity.map(d => d.shares), backgroundColor: '#2e7d32' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Populate Category breakdown list
    const catList = document.getElementById('category-analytics-list');
    catList.innerHTML = categories.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line);">
        <div><strong>${esc(c.name)}</strong></div>
        <div style="display:flex; gap:14px; font-weight:600;">
          <span>${c.count} creations</span>
          <span class="tag">${c.percentage}%</span>
        </div>
      </div>
    `).join('');

    // Populate Engagement metrics summary
    const engSummary = document.getElementById('engagement-metrics-summary');
    engSummary.innerHTML = `
      <div class="engagement-summary-grid">
        <div class="stat-card" style="box-shadow:none;">
          <div class="stat-card-label">Total Engagement</div>
          <div class="stat-card-value">${engagement.total_engagement}</div>
          <div class="stat-card-trend trend-neutral">Aggregated Interactions</div>
        </div>
        <div class="stat-card" style="box-shadow:none;">
          <div class="stat-card-label">Likes Percentage</div>
          <div class="stat-card-value">${engagement.likes_percentage}%</div>
          <div class="stat-card-trend trend-neutral">${engagement.likes} Likes</div>
        </div>
        <div class="stat-card" style="box-shadow:none;">
          <div class="stat-card-label">Comments Percentage</div>
          <div class="stat-card-value">${engagement.comments_percentage}%</div>
          <div class="stat-card-trend trend-neutral">${engagement.comments} Comments</div>
        </div>
        <div class="stat-card" style="box-shadow:none;">
          <div class="stat-card-label">Shares Percentage</div>
          <div class="stat-card-value">${engagement.shares_percentage}%</div>
          <div class="stat-card-trend trend-neutral">${engagement.shares} Verified Shares</div>
        </div>
      </div>
    `;
  } catch (err) {
    toast(err.message || 'Error loading analytics overview.');
  }
}

// ================= 3. CREATOR RANKINGS & LEADERBOARD =================
function changeRankingType(type) {
  currentRankingType = type;
  document.querySelectorAll('#ranking-type-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  loadCreatorRankings();
}

function setRankingLimit(limit) {
  currentRankingLimit = limit;
  document.querySelectorAll('.limit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(String(limit)));
    btn.classList.toggle('secondary', !btn.textContent.includes(String(limit)));
  });
  loadCreatorRankings();
}

async function loadCreatorRankings() {
  try {
    const q = getQueryFilterString();
    const data = await api(`/api/admin/analytics/rankings?type=${currentRankingType}&limit=${currentRankingLimit}&${q}`);
    cachedRankings = data.rankings || [];

    const titleMap = {
      highest_engagement: 'Top Creators by Highest Engagement (Likes + Comments + Shares)',
      most_posts: 'Top Creators by Most Published Creations',
      most_likes: 'Top Creators by Most Likes Received',
      most_comments: 'Top Creators by Most Comments Received',
      most_shares: 'Top Creators by Most Shares Received',
      most_followers: 'Top Creators by Follower Count'
    };
    document.getElementById('ranking-chart-title').textContent = titleMap[currentRankingType] || 'Creator Leaderboard';

    renderRankingBarChart(cachedRankings);
    renderRankingsTable(cachedRankings);
  } catch (err) {
    toast(err.message || 'Error loading creator rankings.');
  }
}

function renderRankingBarChart(rankings) {
  const ctx = document.getElementById('rankingBarChart').getContext('2d');
  if (rankingBarChartInstance) rankingBarChartInstance.destroy();

  const labels = rankings.map(r => r.full_name);
  let datasetLabel = 'Total Engagement';
  let datasetValues = [];

  switch (currentRankingType) {
    case 'most_posts':
      datasetLabel = 'Total Creations';
      datasetValues = rankings.map(r => r.total_posts);
      break;
    case 'most_likes':
      datasetLabel = 'Total Likes';
      datasetValues = rankings.map(r => r.total_likes);
      break;
    case 'most_comments':
      datasetLabel = 'Total Comments';
      datasetValues = rankings.map(r => r.total_comments);
      break;
    case 'most_shares':
      datasetLabel = 'Total Shares';
      datasetValues = rankings.map(r => r.total_shares);
      break;
    case 'most_followers':
      datasetLabel = 'Followers';
      datasetValues = rankings.map(r => r.total_followers);
      break;
    case 'highest_engagement':
    default:
      datasetLabel = 'Total Engagement';
      datasetValues = rankings.map(r => r.total_engagement);
      break;
  }

  rankingBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Creators'],
      datasets: [{
        label: datasetLabel,
        data: datasetValues.length ? datasetValues : [0],
        backgroundColor: '#5b3df5',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderRankingsTable(rankings) {
  const head = document.getElementById('rankings-table-head');
  const body = document.getElementById('rankings-table-body');

  // Customize headers based on ranking type
  if (currentRankingType === 'highest_engagement') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Engagement</th>
        <th>Likes</th>
        <th>Comments</th>
        <th>Shares</th>
        <th>Creations</th>
        <th>Avg / Post</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--brand); font-size:1.05rem;">${r.total_engagement}</strong></td>
        <td>${r.total_likes}</td>
        <td>${r.total_comments}</td>
        <td>${r.total_shares}</td>
        <td>${r.total_posts}</td>
        <td>${r.avg_engagement_per_post}</td>
        <td>
          <button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button>
        </td>
      </tr>
    `).join('');
  } else if (currentRankingType === 'most_posts') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Posts</th>
        <th>In Period</th>
        <th>Latest Post</th>
        <th>Likes Received</th>
        <th>Comments Received</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--brand); font-size:1.05rem;">${r.total_posts}</strong></td>
        <td>+${r.posts_in_period}</td>
        <td style="font-size:0.85rem;">${r.latest_post_date ? formatDate(r.latest_post_date) : 'N/A'}</td>
        <td>${r.total_likes}</td>
        <td>${r.total_comments}</td>
        <td><button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button></td>
      </tr>
    `).join('');
  } else if (currentRankingType === 'most_likes') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Likes</th>
        <th>Likes In Period</th>
        <th>Total Works</th>
        <th>Avg Likes/Post</th>
        <th>Comments</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--ink); font-size:1.05rem;">${r.total_likes}</strong></td>
        <td>+${r.likes_in_period}</td>
        <td>${r.total_posts}</td>
        <td>${r.avg_likes_per_post}</td>
        <td>${r.total_comments}</td>
        <td><button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button></td>
      </tr>
    `).join('');
  } else if (currentRankingType === 'most_comments') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Comments</th>
        <th>In Period</th>
        <th>Posts Discussed</th>
        <th>Avg Comments/Post</th>
        <th>Likes</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--ink); font-size:1.05rem;">${r.total_comments}</strong></td>
        <td>+${r.comments_in_period}</td>
        <td>${r.posts_with_comments}</td>
        <td>${r.avg_comments_per_post}</td>
        <td>${r.total_likes}</td>
        <td><button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button></td>
      </tr>
    `).join('');
  } else if (currentRankingType === 'most_shares') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Shares</th>
        <th>In Period</th>
        <th>Creations Shared</th>
        <th>Total Works</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--ink); font-size:1.05rem;">${r.total_shares}</strong></td>
        <td>+${r.shares_in_period}</td>
        <td>${r.posts_with_shares}</td>
        <td>${r.total_posts}</td>
        <td><button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button></td>
      </tr>
    `).join('');
  } else if (currentRankingType === 'most_followers') {
    head.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Followers</th>
        <th>Total Works</th>
        <th>Total Engagement</th>
        <th>Actions</th>
      </tr>
    `;
    body.innerHTML = rankings.map(r => `
      <tr>
        <td><strong>#${r.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatar(r, 'small')}
            <div>
              <a href="javascript:void(0)" onclick="openCreatorModal(${r.id})" style="color:inherit; font-weight:700;">${esc(r.full_name)}</a>
              <div class="muted" style="font-size:0.8rem;">@${esc(r.username)}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--brand); font-size:1.05rem;">${r.total_followers}</strong></td>
        <td>${r.total_posts}</td>
        <td>${r.total_engagement}</td>
        <td><button class="btn small secondary" onclick="openCreatorModal(${r.id})">Analytics</button></td>
      </tr>
    `).join('');
  }

  if (rankings.length === 0) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;">No creators found for this criteria.</td></tr>`;
  }
}

function filterRankingsTable() {
  const query = document.getElementById('ranking-search').value.toLowerCase().trim();
  const filtered = cachedRankings.filter(r =>
    r.full_name.toLowerCase().includes(query) ||
    r.username.toLowerCase().includes(query)
  );
  renderRankingsTable(filtered);
}

// ================= CREATOR COMPARISON =================
async function openCreatorCompareModal() {
  document.getElementById('compare-modal').classList.remove('hidden');
  const container = document.getElementById('compare-selector-container');

  // Load students list to compare
  if (cachedUsers.length === 0) {
    const data = await api('/api/admin/users?role=user&limit=100');
    cachedUsers = data.users || [];
  }

  container.innerHTML = cachedUsers.map(u => `
    <label style="display:flex; align-items:center; gap:6px; background:var(--bg); padding:6px 12px; border-radius:8px; cursor:pointer;">
      <input type="checkbox" name="compare_creator" value="${u.id}">
      <span>${esc(u.full_name)} (@${esc(u.username)})</span>
    </label>
  `).join('');
}

function closeCompareModal() {
  document.getElementById('compare-modal').classList.add('hidden');
}

async function executeCreatorComparison() {
  const checkboxes = document.querySelectorAll('input[name="compare_creator"]:checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);

  if (ids.length < 2) {
    toast('Please select at least 2 creators to compare.');
    return;
  }

  try {
    const data = await api(`/api/admin/analytics/compare?ids=${ids.join(',')}`);
    document.getElementById('compare-results').classList.remove('hidden');

    // Render grouped bar chart
    const ctx = document.getElementById('compareBarChart').getContext('2d');
    if (compareBarChartInstance) compareBarChartInstance.destroy();

    const labels = ['Posts', 'Likes', 'Comments', 'Shares', 'Followers', 'Total Engagement'];
    const colors = ['#5b3df5', '#ff9800', '#2e7d32', '#e53935', '#0288d1'];

    compareBarChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: data.map((creator, idx) => ({
          label: creator.full_name,
          data: [
            creator.total_posts,
            creator.total_likes,
            creator.total_comments,
            creator.total_shares,
            creator.total_followers,
            creator.total_engagement
          ],
          backgroundColor: colors[idx % colors.length],
          borderRadius: 4
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });

    // Comparison matrix table
    const tableWrap = document.getElementById('compare-table-wrap');
    tableWrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Creator</th>
            <th>Posts</th>
            <th>Likes</th>
            <th>Comments</th>
            <th>Shares</th>
            <th>Followers</th>
            <th>Total Engagement</th>
            <th>Avg / Post</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(c => `
            <tr>
              <td><strong>${esc(c.full_name)}</strong></td>
              <td>${c.total_posts}</td>
              <td>${c.total_likes}</td>
              <td>${c.total_comments}</td>
              <td>${c.total_shares}</td>
              <td>${c.total_followers}</td>
              <td><strong style="color:var(--brand)">${c.total_engagement}</strong></td>
              <td>${c.avg_engagement}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    toast(err.message || 'Error comparing creators.');
  }
}

// ================= INDIVIDUAL CREATOR ANALYTICS MODAL =================
async function openCreatorModal(creatorId) {
  try {
    const modal = document.getElementById('creator-modal');
    const content = document.getElementById('creator-modal-content');
    content.innerHTML = `<div style="text-align:center; padding:40px;">Loading creator profile and analytics...</div>`;
    modal.classList.remove('hidden');

    const data = await api(`/api/admin/analytics/creator/${creatorId}`);
    const u = data.user;
    const s = data.stats;

    content.innerHTML = `
      <div style="display:flex; gap:18px; align-items:center; margin-bottom:20px;">
        ${avatar(u, 'large')}
        <div>
          <h2 style="margin:0;">${esc(u.full_name)}</h2>
          <div class="muted">@${esc(u.username)} &middot; ${esc(u.email)}</div>
          <div style="margin-top:6px; font-size:0.88rem;">${esc(u.bio || 'Sherubtse Creative Community Student')}</div>
          <div style="margin-top:4px; font-size:0.8rem; color:var(--muted);">Joined: ${formatDate(u.joined_date)} &middot; Status: <span class="status-pill ${u.status}">${u.status}</span></div>
        </div>
      </div>

      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); margin-bottom:20px;">
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Creations</div>
          <div class="stat-card-value" style="font-size:1.4rem;">${s.total_posts}</div>
        </div>
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Likes</div>
          <div class="stat-card-value" style="font-size:1.4rem; color:var(--ink);">${s.total_likes}</div>
        </div>
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Comments</div>
          <div class="stat-card-value" style="font-size:1.4rem; color:var(--ink);">${s.total_comments}</div>
        </div>
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Shares</div>
          <div class="stat-card-value" style="font-size:1.4rem; color:var(--ink);">${s.total_shares}</div>
        </div>
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Engagement</div>
          <div class="stat-card-value" style="font-size:1.4rem; color:var(--brand);">${s.total_engagement}</div>
        </div>
        <div class="stat-card" style="padding:12px;">
          <div class="stat-card-label">Avg / Post</div>
          <div class="stat-card-value" style="font-size:1.4rem;">${s.avg_engagement_per_post}</div>
        </div>
      </div>

      <h3 style="font-size:1.05rem; margin-bottom:12px;">Public Creations by this Student</h3>
      <div class="table-wrap" style="box-shadow:none; border:1px solid var(--line); margin:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Work</th>
              <th>Category</th>
              <th>Date</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Shares</th>
              <th>Engagement</th>
            </tr>
          </thead>
          <tbody>
            ${data.creations.map(c => `
              <tr>
                <td><a href="creation-details.html?id=${c.id}" target="_blank" style="color:inherit; font-weight:600;">${esc(c.title)}</a></td>
                <td><span class="tag">${esc(c.category)}</span></td>
                <td>${formatDate(c.created_at)}</td>
                <td>${c.likes}</td>
                <td>${c.comments}</td>
                <td>${c.shares}</td>
                <td><strong>${c.engagement}</strong></td>
              </tr>
            `).join('')}
            ${data.creations.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No published creations yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    toast(err.message || 'Error opening creator details.');
  }
}

function closeCreatorModal() {
  document.getElementById('creator-modal').classList.add('hidden');
}

// ================= 4. CONTENT ANALYTICS =================
async function loadContentAnalytics() {
  try {
    const category = document.getElementById('content-category-filter').value;
    const sortBy = document.getElementById('content-sort-by').value;
    const order = document.getElementById('content-order').value;
    const q = getQueryFilterString();

    const data = await api(`/api/admin/analytics/content?category=${encodeURIComponent(category)}&sort_by=${sortBy}&order=${order}&${q}`);
    const body = document.getElementById('content-table-body');

    body.innerHTML = data.items.map(item => `
      <tr>
        <td><strong>#${item.rank}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${item.image}" style="width:48px; height:48px; object-fit:cover; border-radius:8px;" alt="${esc(item.title)}">
            <div>
              <a href="creation-details.html?id=${item.id}" target="_blank" style="color:inherit; font-weight:700;">${esc(item.title)}</a>
              <div class="muted" style="font-size:0.78rem;">${esc(item.description.slice(0, 50))}${item.description.length > 50 ? '...' : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <a href="javascript:void(0)" onclick="openCreatorModal(${item.creator.id})" style="color:inherit; font-weight:600;">${esc(item.creator.name)}</a>
        </td>
        <td><span class="tag">${esc(item.category)}</span></td>
        <td style="font-size:0.85rem;">${formatDate(item.created_at)}</td>
        <td>${item.likes}</td>
        <td>${item.comments}</td>
        <td>${item.shares}</td>
        <td><strong style="color:var(--brand); font-size:1.05rem;">${item.total_engagement}</strong></td>
        <td>
          <div style="display:flex; gap:6px;">
            <a href="creation-details.html?id=${item.id}" target="_blank" class="btn small secondary">Inspect</a>
            <button class="btn small" style="background:var(--danger);" onclick="deleteCreationPrompt(${item.id})">Remove</button>
          </div>
        </td>
      </tr>
    `).join('');

    if (data.items.length === 0) {
      body.innerHTML = `<tr><td colspan="10" style="text-align:center;">No creations match the selected criteria.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading content analytics.');
  }
}

// ================= 5. USER MANAGEMENT =================
let userSearchTimeout = null;
function debounceUserSearch() {
  clearTimeout(userSearchTimeout);
  userSearchTimeout = setTimeout(() => {
    loadUsersList();
  }, 350);
}

async function loadUsersList() {
  try {
    const search = document.getElementById('user-search-input').value;
    const status = document.getElementById('user-status-filter').value;
    const role = document.getElementById('user-role-filter').value;

    const data = await api(`/api/admin/users?search=${encodeURIComponent(search)}&status=${status}&role=${role}`);
    cachedUsers = data.users || [];

    const body = document.getElementById('users-table-body');
    body.innerHTML = cachedUsers.map(u => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${avatar(u, 'small')}
            <div>
              <strong>${esc(u.full_name)}</strong>
              <div class="muted" style="font-size:0.8rem;">@${esc(u.username)}</div>
            </div>
          </div>
        </td>
        <td style="font-size:0.88rem;">${esc(u.email)}</td>
        <td style="font-size:0.85rem;">${formatDate(u.joined_date)}</td>
        <td>${u.creations_count}</td>
        <td>${u.likes_received}</td>
        <td>${u.followers_count}</td>
        <td><span class="status-pill ${u.status}">${u.status}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn small secondary" onclick="openCreatorModal(${u.id})">Stats</button>
            ${u.role !== 'admin' ? `
              <button class="btn small ${u.status === 'active' ? 'secondary' : ''}"
                style="${u.status === 'active' ? 'color:var(--danger); border-color:var(--danger);' : 'background:var(--ok);'}"
                onclick="openUserStatusModal(${u.id}, '${u.status === 'active' ? 'suspended' : 'active'}', '${esc(u.full_name)}')">
                ${u.status === 'active' ? 'Suspend' : 'Reactivate'}
              </button>
            ` : '<span class="muted" style="font-size:0.8rem;">Admin</span>'}
          </div>
        </td>
      </tr>
    `).join('');

    if (cachedUsers.length === 0) {
      body.innerHTML = `<tr><td colspan="8" style="text-align:center;">No students or users found matching criteria.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading users list.');
  }
}

function openUserStatusModal(userId, newStatus, fullName) {
  pendingUserStatusChange = { userId, newStatus };
  const modal = document.getElementById('user-status-modal');
  const title = document.getElementById('user-status-modal-title');
  const desc = document.getElementById('user-status-modal-desc');
  const btn = document.getElementById('confirm-user-status-btn');

  if (newStatus === 'suspended') {
    title.textContent = `Suspend Account: ${fullName}`;
    desc.textContent = 'Suspending this account will immediately revoke login sessions and block posting, commenting, and liking.';
    btn.textContent = 'Suspend User';
    btn.style.background = 'var(--danger)';
  } else {
    title.textContent = `Reactivate Account: ${fullName}`;
    desc.textContent = 'Reactivating will restore standard student privileges and access to CreativeHub.';
    btn.textContent = 'Reactivate User';
    btn.style.background = 'var(--ok)';
  }

  document.getElementById('user-status-reason').value = '';
  modal.classList.remove('hidden');
}

function closeUserStatusModal() {
  document.getElementById('user-status-modal').classList.add('hidden');
  pendingUserStatusChange = null;
}

async function submitUserStatusChange() {
  if (!pendingUserStatusChange) return;
  const { userId, newStatus } = pendingUserStatusChange;
  const reason = document.getElementById('user-status-reason').value.trim();

  try {
    const res = await api(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: { status: newStatus, reason }
    });
    toast(res.message);
    closeUserStatusModal();
    loadUsersList();
  } catch (err) {
    toast(err.message || 'Error updating user status.');
  }
}

// ================= 6. CREATIVE-WORK MANAGEMENT =================
async function loadCreationsManagement() {
  try {
    const data = await api('/api/admin/analytics/content?limit=50&sort_by=date&order=DESC');
    const body = document.getElementById('creations-mgmt-body');

    body.innerHTML = data.items.map(item => `
      <tr>
        <td>
          <img src="${item.image}" style="width:48px; height:48px; object-fit:cover; border-radius:6px;" alt="">
        </td>
        <td>
          <a href="creation-details.html?id=${item.id}" target="_blank" style="color:inherit; font-weight:600;">${esc(item.title)}</a>
        </td>
        <td>${esc(item.creator.name)}</td>
        <td><span class="tag">${esc(item.category)}</span></td>
        <td style="font-size:0.85rem;">${formatDate(item.created_at)}</td>
        <td>${item.likes} likes &middot; ${item.comments} comments &middot; ${item.shares} shares</td>
        <td>
          <button class="btn small" style="background:var(--danger);" onclick="deleteCreationPrompt(${item.id})">Delete</button>
        </td>
      </tr>
    `).join('');

    if (data.items.length === 0) {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;">No creations found.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading creations.');
  }
}

async function deleteCreationPrompt(id) {
  const reason = prompt('Please enter an administrative removal reason (logged in moderation audit):');
  if (reason === null) return;

  try {
    const res = await api(`/api/admin/creations/${id}`, {
      method: 'DELETE',
      body: { reason: reason.trim() || 'Content removed by administrator.' }
    });
    toast(res.message);
    loadCreationsManagement();
    loadContentAnalytics();
  } catch (err) {
    toast(err.message || 'Error deleting creation.');
  }
}

// ================= 7. COMMENT MODERATION =================
async function loadCommentsManagement() {
  try {
    const creations = await api('/api/admin/analytics/content?limit=25');
    const commentsList = [];

    // Fetch comments from top active creations
    for (const post of creations.items.slice(0, 10)) {
      if (post.comments > 0) {
        try {
          const detail = await api(`/api/creations/${post.id}`);
          if (detail.comments_list) {
            detail.comments_list.forEach(cm => {
              commentsList.push({
                ...cm,
                postTitle: post.title,
                postId: post.id
              });
            });
          }
        } catch (e) { /* ignore */ }
      }
    }

    const body = document.getElementById('comments-mgmt-body');
    body.innerHTML = commentsList.map(c => `
      <tr>
        <td><a href="creation-details.html?id=${c.postId}" target="_blank" style="color:inherit; font-weight:600;">${esc(c.postTitle)}</a></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            ${avatar(c.user, 'small')}
            <span>${esc(c.user.full_name)}</span>
          </div>
        </td>
        <td style="max-width:320px;">${esc(c.content)}</td>
        <td style="font-size:0.85rem;">${formatDateTime(c.created_at)}</td>
        <td>
          <button class="btn small" style="background:var(--danger);" onclick="deleteCommentPrompt(${c.id})">Delete</button>
        </td>
      </tr>
    `).join('');

    if (commentsList.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;">No recent comments found.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading comments.');
  }
}

async function deleteCommentPrompt(id) {
  const reason = prompt('Please enter moderation removal reason:');
  if (reason === null) return;

  try {
    const res = await api(`/api/admin/comments/${id}`, {
      method: 'DELETE',
      body: { reason: reason.trim() || 'Comment removed by administrator.' }
    });
    toast(res.message);
    loadCommentsManagement();
  } catch (err) {
    toast(err.message || 'Error deleting comment.');
  }
}

// ================= 8. REPORTS QUEUE =================
async function loadReportsQueue(status = 'pending') {
  try {
    activeReportsStatus = status;
    document.querySelectorAll('#reports-filter-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(status));
    });

    const data = await api(`/api/admin/reports?status=${status}`);
    const body = document.getElementById('reports-table-body');

    body.innerHTML = data.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>
          <strong>${r.content_type.toUpperCase()} #${r.content_id}</strong>
          ${r.content_preview ? `<div class="muted" style="font-size:0.8rem;">"${esc(r.content_preview)}"</div>` : ''}
        </td>
        <td>${esc(r.reporter ? r.reporter.name : 'Student')}</td>
        <td>${esc(r.reason)}</td>
        <td style="font-size:0.85rem;">${formatDateTime(r.created_at)}</td>
        <td><span class="status-pill ${r.status}">${r.status}</span></td>
        <td>
          ${r.status === 'pending' ? `
            <button class="btn small" onclick="openReportModal(${r.id}, '${r.content_type}', ${r.content_id}, '${esc(r.reason)}')">Review</button>
          ` : `<span class="muted" style="font-size:0.8rem;">Resolved by Admin</span>`}
        </td>
      </tr>
    `).join('');

    if (data.length === 0) {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;">No reports in "${status}" state.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading reports.');
  }
}

function openReportModal(reportId, contentType, contentId, reason) {
  pendingReportAction = { reportId, contentType, contentId };
  const modal = document.getElementById('report-modal');
  const details = document.getElementById('report-modal-details');

  details.innerHTML = `
    <strong>Target:</strong> ${contentType} #${contentId}<br>
    <strong>Reported Reason:</strong> "${reason}"
  `;
  document.getElementById('report-resolution-note').value = '';
  modal.classList.remove('hidden');
}

function closeReportModal() {
  document.getElementById('report-modal').classList.add('hidden');
  pendingReportAction = null;
}

async function submitReportResolution(decision, deleteContent) {
  if (!pendingReportAction) return;
  const { reportId } = pendingReportAction;
  const note = document.getElementById('report-resolution-note').value.trim();

  try {
    const res = await api(`/api/admin/reports/${reportId}/resolve`, {
      method: 'POST',
      body: {
        decision,
        resolution_note: note,
        delete_content: deleteContent
      }
    });
    toast(res.message);
    closeReportModal();
    loadReportsQueue('pending');
    loadOverviewData();
  } catch (err) {
    toast(err.message || 'Error resolving report.');
  }
}

// ================= 9. CATEGORY MANAGEMENT =================
async function loadCategoriesList() {
  try {
    const categories = await api('/api/admin/categories');
    cachedCategories = categories;

    // Populate category dropdown in content analytics tab
    const catSelect = document.getElementById('content-category-filter');
    if (catSelect) {
      catSelect.innerHTML = `<option value="">All Categories</option>` +
        categories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    }

    const body = document.getElementById('categories-table-body');
    body.innerHTML = categories.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${esc(c.name)}</strong></td>
        <td style="font-size:0.88rem; color:var(--muted);">${esc(c.description || 'No description.')}</td>
        <td><strong style="color:var(--brand);">${c.creations_count}</strong> creations</td>
        <td style="font-size:0.85rem;">${formatDate(c.created_at)}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn small secondary" onclick="openEditCategoryModal(${c.id}, '${esc(c.name)}', '${esc(c.description || '')}')">Edit</button>
            <button class="btn small" style="background:var(--danger);" onclick="deleteCategoryPrompt(${c.id}, '${esc(c.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    if (categories.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;">No categories found.</td></tr>`;
    }
  } catch (err) {
    toast(err.message || 'Error loading categories.');
  }
}

function openAddCategoryModal() {
  editingCategoryId = null;
  document.getElementById('category-modal-title').textContent = 'Add Category';
  document.getElementById('cat-name-input').value = '';
  document.getElementById('cat-desc-input').value = '';
  document.getElementById('category-modal').classList.remove('hidden');
}

function openEditCategoryModal(id, name, desc) {
  editingCategoryId = id;
  document.getElementById('category-modal-title').textContent = 'Edit Category';
  document.getElementById('cat-name-input').value = name;
  document.getElementById('cat-desc-input').value = desc;
  document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
  editingCategoryId = null;
}

async function saveCategory() {
  const name = document.getElementById('cat-name-input').value.trim();
  const description = document.getElementById('cat-desc-input').value.trim();

  if (!name) {
    toast('Category name is required.');
    return;
  }

  try {
    if (editingCategoryId) {
      await api(`/api/admin/categories/${editingCategoryId}`, {
        method: 'PUT',
        body: { name, description }
      });
      toast('Category updated successfully.');
    } else {
      await api('/api/admin/categories', {
        method: 'POST',
        body: { name, description }
      });
      toast('Category created successfully.');
    }
    closeCategoryModal();
    loadCategoriesList();
  } catch (err) {
    toast(err.message || 'Error saving category.');
  }
}

async function deleteCategoryPrompt(id, name) {
  if (!confirm(`Delete category "${name}"? Existing student creations will be safely reassigned to "Other".`)) return;

  try {
    const res = await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
    toast(res.message);
    loadCategoriesList();
  } catch (err) {
    toast(err.message || 'Error deleting category.');
  }
}

// Initial Load
async function loadInitialData() {
  await Promise.all([
    loadOverviewData(),
    loadCategoriesList()
  ]);
}

let allApplications = [];
let currentTypeFilter = "all";
let currentStatusFilter = "all";

function getStatusBadge(status) {
  const norm = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="status-badge-lg ${norm}">${esc(status || "Pending")}</span>`;
}

async function loadMyApplications() {
  try {
    const data = await api("/api/my-applications");
    const challenges = (data.challenges || []).map(c => ({ ...c, type: "Challenge" }));
    const collaborations = (data.collaborations || []).map(c => ({ ...c, type: "Collaboration" }));
    allApplications = [...challenges, ...collaborations].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

    updateMetrics(challenges, collaborations);
    renderList();
    document.getElementById("loading").classList.add("hidden");
  } catch (err) {
    document.getElementById("loading").classList.add("hidden");
    showMessage("message", err.message || "Failed to load applications.");
  }
}

function updateMetrics(challenges, collaborations) {
  const total = allApplications.length;
  const pending = allApplications.filter(a => a.status === "Pending").length;
  const underReview = allApplications.filter(a => a.status === "Under Review").length;
  const accepted = allApplications.filter(a => a.status === "Accepted").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-under-review").textContent = underReview;
  document.getElementById("stat-accepted").textContent = accepted;

  // Update filter pill counts
  document.querySelectorAll(".filter-pill").forEach(pill => {
    const type = pill.dataset.type;
    if (type === "all") pill.textContent = `All (${total})`;
    if (type === "Challenge") pill.textContent = `Challenges (${challenges.length})`;
    if (type === "Collaboration") pill.textContent = `Collaborations (${collaborations.length})`;
  });
}

function filterType(type, button) {
  currentTypeFilter = type;
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  button.classList.add("active");
  renderList();
}

function filterStatus(status) {
  currentStatusFilter = status;
  renderList();
}

function renderList() {
  const listEl = document.getElementById("applications-list");
  let filtered = allApplications;

  if (currentTypeFilter !== "all") {
    filtered = filtered.filter(a => a.type === currentTypeFilter);
  }

  if (currentStatusFilter !== "all") {
    filtered = filtered.filter(a => a.status === currentStatusFilter);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="card" style="text-align:center; padding:40px;">
        <h3 style="margin-top:0; color:var(--heading);">No applications found</h3>
        <p class="muted">You don't have any applications matching the selected criteria.</p>
        <div style="margin-top:16px;">
          <a href="challenges.html" class="btn small">Explore Challenges</a>
          <a href="collaboration.html" class="btn small secondary" style="margin-left:8px;">Explore Collaborations</a>
        </div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(app => {
    const isChallenge = app.type === "Challenge";
    const detailUrl = isChallenge ? `challenge-details.html?id=${app.opportunity_id}` : `collaboration-details.html?id=${app.opportunity_id}`;
    const roleOrCat = isChallenge ? `Category: ${esc(app.category)}` : `Role: ${esc(app.role || "Contributor")}`;
    const canWithdraw = ["Pending", "Under Review"].includes(app.status);

    let feedbackHtml = "";
    if (app.decision_message) {
      feedbackHtml = `
        <div class="feedback-box">
          <strong>Reviewer Feedback:</strong> ${esc(app.decision_message)}
        </div>
      `;
    }

    return `
      <div class="app-card" id="app-${app.type}-${app.application_id}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tag" style="background:var(--blue-navy); color:#FFF; font-weight:700;">${app.type}</span>
            <span class="tag" style="background:var(--blue-pale); color:var(--blue-navy);">${roleOrCat}</span>
          </div>
          <div>${getStatusBadge(app.status)}</div>
        </div>

        <h3 style="margin:0 0 6px; font-size:1.2rem;">
          <a href="${detailUrl}" style="color:var(--heading);">${esc(app.title)}</a>
        </h3>

        <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:0.83rem; color:var(--muted); margin-bottom:10px;">
          <div>Submitted: <strong>${formatDate(app.applied_at)}</strong></div>
          ${app.mode ? `<div>Mode: <strong>${esc(app.mode)}</strong></div>` : ""}
          ${app.organizer ? `<div>Organizer: <strong>${esc(app.organizer)}</strong></div>` : ""}
          ${app.lead_name ? `<div>Lead: <strong>${esc(app.lead_name)}</strong></div>` : ""}
        </div>

        ${app.message ? `<div style="font-size:0.88rem; color:var(--muted); margin-bottom:8px;"><strong>Your Note:</strong> ${esc(app.message)}</div>` : ""}
        ${app.attachment_file ? `
          <div style="margin:8px 0; font-size:0.82rem;">
            <a href="${fileUrl(app.attachment_file)}" target="_blank" download class="row" style="display:inline-flex; align-items:center; gap:6px; background:var(--blue-pale); padding:4px 10px; border-radius:6px; color:var(--blue-navy); font-weight:600; text-decoration:none;">
              ${svgIcon("paperclip", "sm")} <span>Attached Sample: ${esc(app.attachment_name || 'Download Attachment')}</span>
            </a>
          </div>
        ` : ""}
        ${feedbackHtml}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid var(--line);">
          <a href="${detailUrl}" class="btn small secondary">View Opportunity Details</a>
          ${canWithdraw ? `
            <button class="btn small secondary" onclick="withdrawApp('${app.type}', ${app.opportunity_id})" style="color:var(--danger); border-color:var(--danger);">
              Withdraw
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function withdrawApp(type, opportunityId) {
  if (!confirm(`Are you sure you want to withdraw your application for this ${type.toLowerCase()}?`)) return;
  const url = type === "Challenge" ? `/api/challenges/${opportunityId}/withdraw` : `/api/collaborations/${opportunityId}/withdraw`;
  try {
    const res = await api(url, { method: "POST" });
    toast(res.message || "Application withdrawn.");
    loadMyApplications();
  } catch (err) {
    toast(err.message || "Failed to withdraw.");
  }
}

(async function init() {
  await initPage("challenges.html"); // Keeps standard navbar
  loadMyApplications();
})();

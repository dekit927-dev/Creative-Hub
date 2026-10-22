// Collaboration hub: list projects, post a project, request to join, close a project.
function collabHtml(c) {
  const isOwner = currentUser && c.user.id === currentUser.id;
  const myReq = c.my_request;
  let statusBadge = "";
  if (myReq && myReq.status && myReq.status !== "Withdrawn") {
    statusBadge = ` <span class="tag" style="background:var(--blue-light); color:var(--blue-navy); font-weight:700;">Status: ${esc(myReq.status)}</span>`;
  }

  let action = `<a href="collaboration-details.html?id=${c.id}" class="btn small">View Details & Roles</a>`;
  if (isOwner) {
    action = `
      <div style="display:flex; gap:6px;">
        <a href="collaboration-details.html?id=${c.id}" class="btn small">View & Manage</a>
        <button class="btn secondary small" onclick="toggleStatus(${c.id})">${c.status === "Open" ? "Close" : "Re-open"}</button>
      </div>`;
  } else if (c.requested_by_me) {
    action = `
      <div style="display:flex; gap:6px;">
        <a href="collaboration-details.html?id=${c.id}" class="btn small">View Details</a>
        <button class="btn secondary small" onclick="cancelRequest(${c.id})" style="color:var(--danger);">Withdraw</button>
      </div>`;
  }

  const requesters = isOwner && c.requesters && c.requesters.length
    ? `<div class="people"><span class="muted">Requests:</span> ${c.requesters.map(p =>
        `<a class="row" href="profile.html?id=${p.id}">${avatar(p, "small")} ${esc(p.full_name)}</a>`).join("")}</div>` : "";

  return `<div class="card item-card">
    <div class="row" style="justify-content:space-between">
      <div>
        <span class="tag ${c.status === "Open" ? "" : "warn"}">${esc(c.status)}</span>
        ${c.category ? `<span class="tag" style="background:var(--blue-pale);">${esc(c.category)}</span>` : ""}
        ${statusBadge}
      </div>
      <span class="muted">${c.request_count} request${c.request_count === 1 ? "" : "s"} &middot; ${esc(c.duration || "2-4 weeks")}</span>
    </div>
    <h3><a href="collaboration-details.html?id=${c.id}" style="color:inherit">${esc(c.title)}</a></h3>
    <p class="muted" style="margin-bottom:8px;">${esc(c.short_summary || c.description)}</p>
    <div class="muted" style="font-size:0.83rem; margin-bottom:12px;"><strong>Roles:</strong> ${esc(c.roles || c.skills)} &middot; <strong>Mode:</strong> ${esc(c.mode || "Hybrid")}</div>
    <div class="row" style="justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <a class="row" href="profile.html?id=${c.user.id}">${avatar(c.user, "small")} ${esc(c.user.full_name)}</a>
      ${action}
    </div>${requesters}</div>`;
}

async function loadCollabs() {
  try {
    const list = await api("/api/collaborations");
    document.getElementById("list").innerHTML = list.map(collabHtml).join("") ||
      `<div class="empty">No projects yet. Post the first one.</div>`;
  } catch (error) { showMessage("message", error.message); }
}

async function changeCollab(path, method, successText) {
  try { await api(path, { method }); if (successText) toast(successText); loadCollabs(); }
  catch (error) { toast(error.message); }
}
const requestJoin = (id) => changeCollab("/api/collaborations/" + id + "/join", "POST", "Request sent");
const cancelRequest = (id) => changeCollab("/api/collaborations/" + id + "/join", "DELETE", "Request cancelled");
const toggleStatus = (id) => changeCollab("/api/collaborations/" + id + "/status", "PUT", "Status updated");

document.getElementById("toggle-form").addEventListener("click", () => {
  document.getElementById("collab-form-card").classList.toggle("hidden");
});

document.getElementById("collab-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("form-message");
  const body = {
    title: document.getElementById("k-title").value.trim(),
    skills: document.getElementById("k-skills").value.trim(),
    description: document.getElementById("k-description").value.trim(),
  };
  if (!body.title || !body.skills || !body.description) return showMessage("form-message", "Please fill in all fields.");
  try {
    await api("/api/collaborations", { method: "POST", body });
    event.target.reset();
    document.getElementById("collab-form-card").classList.add("hidden");
    toast("Project posted");
    loadCollabs();
  } catch (error) { showMessage("form-message", error.message); }
});

(async function start() {
  await initPage("collaboration.html");
  loadCollabs();
})();

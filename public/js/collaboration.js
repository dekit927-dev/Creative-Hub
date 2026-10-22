// Collaboration hub: list projects, post a project, request to join, close a project.
function collabHtml(c) {
  const isOwner = c.user.id === currentUser.id;
  let action = "";
  if (isOwner) {
    action = `<button class="btn secondary small" onclick="toggleStatus(${c.id})">${c.status === "Open" ? "Close project" : "Re-open project"}</button>`;
  } else if (c.requested_by_me) {
    action = `<button class="btn secondary small" onclick="cancelRequest(${c.id})">Requested - tap to cancel</button>`;
  } else {
    action = `<button class="btn small" ${c.status !== "Open" ? "disabled" : ""} onclick="requestJoin(${c.id})">Request to join</button>`;
  }
  const requesters = isOwner && c.requesters.length
    ? `<div class="people"><span class="muted">Requests:</span> ${c.requesters.map(p =>
        `<a class="row" href="profile.html?id=${p.id}">${avatar(p, "small")} ${esc(p.full_name)}</a>`).join("")}</div>` : "";
  return `<div class="card item-card">
    <div class="row" style="justify-content:space-between">
      <span class="tag ${c.status === "Open" ? "" : "warn"}">${esc(c.status)}</span>
      <span class="muted">${c.request_count} request${c.request_count === 1 ? "" : "s"}</span>
    </div>
    <h3>${esc(c.title)}</h3>
    <p class="muted">${esc(c.description)}</p>
    <p><strong>Skills needed:</strong> ${esc(c.skills)}</p>
    <div class="row" style="justify-content:space-between">
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

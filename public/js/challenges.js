// Challenges page: list, join/leave, see participants, create a challenge.
function challengeHtml(ch) {
  const ended = new Date(ch.deadline) < new Date(new Date().toDateString());
  const myApp = ch.my_application;
  let statusBadge = "";
  if (myApp && myApp.status && myApp.status !== "Withdrawn") {
    const norm = myApp.status.toLowerCase().replace(/\s+/g, "-");
    statusBadge = ` <span class="tag" style="background:var(--blue-light); color:var(--blue-navy); font-weight:700;">Applied: ${esc(myApp.status)}</span>`;
  }

  return `<div class="card item-card" id="challenge-${ch.id}">
    <div class="row" style="justify-content:space-between">
      <div>
        <span class="tag">${esc(ch.category)}</span>
        ${ch.mode ? `<span class="tag" style="background:var(--blue-pale);">${esc(ch.mode)}</span>` : ""}
        ${statusBadge}
        ${ended ? ' <span class="tag warn">Ended</span>' : ""}
      </div>
      <span class="muted">Deadline: ${formatDate(ch.deadline)}</span>
    </div>
    <h3><a href="challenge-details.html?id=${ch.id}" style="color:inherit">${esc(ch.title)}</a></h3>
    <p class="muted" style="margin-bottom:8px;">${esc(ch.short_summary || ch.description)}</p>
    <div class="muted" style="font-size:0.83rem; margin-bottom:12px;">By ${esc(ch.organizer || "Sherubtse Creative Club")} &middot; ${esc(ch.location || "Kanglung Campus")}</div>
    <div class="row" style="justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="challenge-details.html?id=${ch.id}" class="btn small">View Details & Guidelines</a>
        ${ch.joined
          ? `<button class="btn secondary small" onclick="leaveChallenge(${ch.id})">Joined (Leave)</button>`
          : `<button class="btn secondary small" ${ended ? "disabled" : ""} onclick="joinChallenge(${ch.id})">Quick Join</button>`}
      </div>
      <button class="btn secondary small" onclick="showParticipants(${ch.id})">${ch.participants} participant${ch.participants === 1 ? "" : "s"}</button>
    </div>
    <div class="people" id="people-${ch.id}"></div>
  </div>`;
}

async function loadChallenges() {
  try {
    const list = await api("/api/challenges");
    document.getElementById("list").innerHTML = list.map(challengeHtml).join("") ||
      `<div class="empty">No challenges yet. Start the first one.</div>`;
  } catch (error) { showMessage("message", error.message); }
}

async function joinChallenge(id) {
  try { await api("/api/challenges/" + id + "/join", { method: "POST" }); toast("You joined the challenge"); loadChallenges(); }
  catch (error) { toast(error.message); }
}

async function leaveChallenge(id) {
  try { await api("/api/challenges/" + id + "/join", { method: "DELETE" }); toast("You left the challenge"); loadChallenges(); }
  catch (error) { toast(error.message); }
}

async function showParticipants(id) {
  const box = document.getElementById("people-" + id);
  if (box.innerHTML) { box.innerHTML = ""; return; }  // click again to hide
  try {
    const people = await api("/api/challenges/" + id + "/participants");
    box.innerHTML = people.length
      ? people.map(p => `<a class="row" href="profile.html?id=${p.id}">${avatar(p, "small")} ${esc(p.full_name)}</a>`).join("")
      : `<span class="muted">Nobody has joined yet.</span>`;
  } catch (error) { toast(error.message); }
}

document.getElementById("toggle-form").addEventListener("click", () => {
  document.getElementById("challenge-form-card").classList.toggle("hidden");
});

document.getElementById("challenge-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("form-message");
  const body = {
    title: document.getElementById("c-title").value.trim(),
    category: document.getElementById("c-category").value,
    deadline: document.getElementById("c-deadline").value,
    description: document.getElementById("c-description").value.trim(),
  };
  if (!body.title || !body.description || !body.deadline) return showMessage("form-message", "Please fill in all fields.");
  try {
    await api("/api/challenges", { method: "POST", body });
    event.target.reset();
    document.getElementById("challenge-form-card").classList.add("hidden");
    toast("Challenge created");
    loadChallenges();
  } catch (error) { showMessage("form-message", error.message); }
});

(async function start() {
  await initPage("challenges.html");
  const categories = await api("/api/categories");
  document.getElementById("c-category").innerHTML = categories.map(c => `<option>${esc(c)}</option>`).join("");
  loadChallenges();
})();

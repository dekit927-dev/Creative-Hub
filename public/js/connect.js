// Connect page: discover creators, follow/unfollow, message creators, interactive search filter.
async function loadUsers() {
  const filterInput = document.getElementById("user-filter");
  const q = (filterInput ? filterInput.value : "").trim();
  const usersContainer = document.getElementById("users");

  usersContainer.innerHTML = `<div class="loading-box" style="grid-column:1/-1;"><div class="spinner-ring"></div><span>Searching creators...</span></div>`;

  try {
    const users = (await api("/api/users?q=" + encodeURIComponent(q))).filter(u => u.id !== currentUser.id);
    if (!users || users.length === 0) {
      usersContainer.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <div style="font-size:2rem; margin-bottom:8px;">&#128101;</div>
          <strong>No creators found</strong>
          <p class="muted" style="margin-top:4px;">Try searching for a different name, username, or creative focus.</p>
        </div>`;
      return;
    }

    usersContainer.innerHTML = users.map(u => `
      <div class="card user-card reveal-on-scroll">
        <a href="profile.html?id=${u.id}" title="View profile">${avatar(u, "big")}</a>
        <h3><a href="profile.html?id=${u.id}" style="color:inherit">${esc(u.full_name)}</a></h3>
        <div class="muted" style="font-size:0.88rem;">@${esc(u.username)} &middot; <strong id="fc-${u.id}" style="color:var(--blue-navy)">${u.followers}</strong> followers</div>
        <p>${esc(u.bio) || '<span class="muted" style="font-style:italic">Creative community member</span>'}</p>
        <div class="row" style="justify-content:center; gap:8px; margin-top:auto;">
          <button class="btn small ${u.is_following ? "secondary" : ""}" id="fb-${u.id}" onclick="toggleFollow(${u.id})">
            ${u.is_following ? "&#10003; Following" : "+ Follow"}
          </button>
          <a class="btn small secondary" href="messages.html?user=${u.id}" title="Send message">&#9993; Message</a>
          <a class="btn small secondary" href="profile.html?id=${u.id}">Profile</a>
        </div>
      </div>
    `).join("");
  } catch (error) {
    showMessage("message", error.message);
  }
}

async function toggleFollow(id) {
  try {
    const result = await api("/api/users/" + id + "/follow", { method: "POST" });
    const button = document.getElementById("fb-" + id);
    if (button) {
      button.innerHTML = result.following ? "&#10003; Following" : "+ Follow";
      button.classList.toggle("secondary", result.following);
    }
    const countEl = document.getElementById("fc-" + id);
    if (countEl) countEl.textContent = result.followers;
    toast(result.following ? "Creator followed" : "Creator unfollowed");
  } catch (error) {
    toast(error.message);
  }
}

let filterTimer;
const userFilter = document.getElementById("user-filter");
if (userFilter) {
  userFilter.addEventListener("input", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(loadUsers, 250);
  });
}

(async function start() {
  await initPage("connect.html");
  loadUsers();
})();

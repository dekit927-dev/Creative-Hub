// Search page: asks the backend for matching users, creations and categories.
(async function start() {
  await initPage("");
  const q = (getParam("q") || "").trim();
  document.getElementById("search-title").textContent = q ? `Results for "${q}"` : "Search";
  if (!q) return showMessage("message", "Type something in the search bar to find people, creations, or categories.");

  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = `<div class="loading-box"><div class="spinner-ring"></div><span>Searching Creative Hub...</span></div>`;

  try {
    const r = await api("/api/search?q=" + encodeURIComponent(q));
    let html = "";

    if (r.categories && r.categories.length) {
      html += `<h2>Categories</h2><div class="chips">` + r.categories.map(c =>
        `<a class="chip" href="search.html?q=${encodeURIComponent(c.name)}">${esc(c.name)} (${c.count})</a>`).join("") + `</div>`;
    }

    html += `<h2>People</h2>`;
    if (r.users && r.users.length) {
      html += `<div class="grid">` + r.users.map(u => `
        <div class="card user-card reveal-on-scroll">
          <a href="profile.html?id=${u.id}">${avatar(u, "big")}</a>
          <h3><a href="profile.html?id=${u.id}" style="color:inherit">${esc(u.full_name)}</a></h3>
          <div class="muted">@${esc(u.username)}</div>
          <p>${esc(u.bio) || '<span class="muted" style="font-style:italic">Creative community member</span>'}</p>
          <div class="row" style="justify-content:center; gap:8px; margin-top:auto;">
            <a class="btn small secondary" href="messages.html?user=${u.id}">&#9993; Message</a>
            <a class="btn small secondary" href="profile.html?id=${u.id}">View profile</a>
          </div>
        </div>`).join("") + `</div>`;
    } else {
      html += `<p class="muted">No people found matching your search.</p>`;
    }

    html += `<h2 style="margin-top:32px">Creations</h2>`;
    if (r.creations && r.creations.length) {
      html += `<div class="grid">${r.creations.map(postCardHtml).join("")}</div>`;
    } else {
      html += `<p class="muted">No creations found matching your search.</p>`;
    }

    resultsContainer.innerHTML = html;
  } catch (error) {
    showMessage("message", error.message);
  }
})();

// Home page: shows the feed, with optional category filter and interactive chips.
let selectedCategory = "";

async function loadFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = `<div class="loading-box" style="grid-column:1/-1;"><div class="spinner-ring"></div><span>Loading creative feed...</span></div>`;

  try {
    const url = "/api/creations" + (selectedCategory ? "?category=" + encodeURIComponent(selectedCategory) : "");
    const posts = await api(url);
    if (!posts || posts.length === 0) {
      feed.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <div style="margin-bottom:12px; display:flex; justify-content:center;">${svgIcon("palette", "hero")}</div>
          <strong>No creations found in this category</strong>
          <p class="muted" style="margin: 6px 0 16px;">Be the first creator to share something exciting.</p>
          <a class="btn small" href="create.html">+ Share the first one</a>
        </div>`;
      return;
    }

    feed.innerHTML = posts.map(postCardHtml).join("");
  } catch (error) {
    feed.innerHTML = `<div class="message error" style="grid-column:1/-1">${esc(error.message)}</div>`;
  }
}

async function showChips() {
  try {
    const categories = await api("/api/categories");
    const chips = document.getElementById("chips");
    chips.innerHTML = ["All", ...categories].map(name => {
      const isActive = (name === "All" && !selectedCategory) || name === selectedCategory;
      return `<button class="chip ${isActive ? "active" : ""}" data-name="${esc(name)}">${esc(name)}</button>`;
    }).join("");

    chips.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        selectedCategory = chip.dataset.name === "All" ? "" : chip.dataset.name;
        showChips();
        loadFeed();
      });
    });
  } catch (err) { /* ignore */ }
}

(async function start() {
  await initPage("home.html");
  showChips();
  loadFeed();
})();

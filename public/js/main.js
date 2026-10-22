// Shared code used by every page: API calls, navbar, notifications, post cards.

// Use relative URLs when loaded from the server, or default to localhost:3000
const API = window.location.protocol.startsWith("http") ? "" : "http://127.0.0.1:3000";
let currentUser = null;

// Apply saved light/dark/system theme right away
(function() {
  const saved = localStorage.getItem("theme") || "light";
  if (saved === "system") {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = saved;
  }
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (localStorage.getItem("theme") === "system") {
        document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      }
    });
  }
})();

// ---------- helpers ----------
function esc(text) {
  // Stops user text from being treated as HTML
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function fileUrl(path) {
  return path ? API + path : "";
}

function formatDate(isoString) {
  // The server stores UTC times
  const date = new Date(isoString.endsWith("Z") ? isoString : isoString + "Z");
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(isoString) {
  const date = new Date(isoString.endsWith("Z") ? isoString : isoString + "Z");
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function avatar(user, extraClass = "") {
  if (user.profile_picture) {
    return `<img class="avatar ${extraClass}" src="${fileUrl(user.profile_picture)}" alt="${esc(user.full_name)}">`;
  }
  const initials = user.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return `<span class="avatar initials ${extraClass}">${esc(initials)}</span>`;
}

function showMessage(elementId, text, type = "error") {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.className = "message " + type;
  box.textContent = text;
  box.classList.remove("hidden");
}

function hideMessage(elementId) {
  const box = document.getElementById(elementId);
  if (box) box.classList.add("hidden");
}

function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---------- talking to the backend ----------
async function api(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = "Bearer " + token;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  let response;
  try {
    response = await fetch(API + path, { ...options, headers });
  } catch (error) {
    throw new Error("Cannot reach the server. Make sure the backend is running.");
  }
  let data = null;
  try { data = await response.json(); } catch (error) { /* no JSON body */ }

  const onAuthPage = /login\.html|register\.html/.test(window.location.pathname);
  if (response.status === 401 && !onAuthPage) {
    // Token missing or expired: go back to login
    localStorage.removeItem("token");
    window.location.href = "login.html";
    throw new Error("Please log in.");
  }
  if (!response.ok) {
    throw new Error(data && data.detail ? data.detail : "Something went wrong. Please try again.");
  }
  return data;
}

async function logout() {
  try { await api("/api/logout", { method: "POST" }); } catch (e) { /* ignore */ }
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ---------- page start-up (every logged-in page calls this first) ----------
async function initPage(activeLink) {
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
    return null;
  }
  currentUser = await api("/api/me");
  renderNavbar(activeLink);
  renderFooter();
  loadNotifications();
  setInterval(loadNotifications, 15000);
  initScrollReveal();
  return currentUser;
}

function renderNavbar(activeLink) {
  const links = [
    { href: "home.html", name: "Home", icon: "&#127968;" },
    { href: "challenges.html", name: "Challenges", icon: "&#127942;" },
    { href: "connect.html", name: "Connect", icon: "&#128101;" },
    { href: "collaboration.html", name: "Collaborate", icon: "&#129309;" },
    { href: "messages.html", name: "Messages", icon: "&#128172;" }
  ];

  const isAdmin = window.location.pathname.startsWith("/admin") || activeLink === "admin";
  if (isAdmin) {
    document.body.classList.add("admin-page");
  }

  const linkHtml = links.map(l =>
    `<a href="${l.href}" class="${activeLink === l.href ? "active" : ""}">${l.name}</a>`).join("");

  const bottomTabsHtml = links.map(l => `
    <a href="${l.href}" class="mobile-tab-item ${activeLink === l.href ? "active" : ""}">
      <span class="mobile-tab-icon">${l.icon}</span>
      <span class="mobile-tab-label">${l.name}</span>
    </a>
  `).join("");

  document.getElementById("navbar").innerHTML = `
    <nav class="navbar"><div class="nav-inner">
      <a class="logo" href="home.html">
        <span class="logo-mark">C</span>
        <span class="logo-text">Creative Hub</span>
      </a>

      <!-- Desktop & Laptop Nav Links -->
      <div class="nav-links">${linkHtml}</div>

      <!-- Desktop & Laptop Search Form -->
      <form class="search-form" id="search-form">
        <input type="search" id="search-input" placeholder="Search people, posts, categories" value="${esc(getParam("q") || "")}" autocomplete="off">
      </form>

      <!-- Action items -->
      <div class="nav-right">
        <a class="icon-btn nav-search-icon-btn" href="search.html" title="Search" aria-label="Search">&#128269;</a>
        ${!isAdmin && currentUser && currentUser.role === "admin" ? `<a class="btn small secondary nav-admin-btn" href="/admin" style="font-weight:700">Admin</a>` : ""}
        <a class="btn small nav-create-btn ${isAdmin ? "hide-on-mobile" : ""}" href="create.html">+ Create</a>
        <div class="dropdown-wrap">
          <button class="icon-btn" id="bell-btn" title="Notifications" aria-label="Notifications">&#128276;<span class="badge hidden" id="bell-badge">0</span></button>
          <div class="dropdown hidden" id="notif-panel"></div>
        </div>
        <a href="profile.html" title="My profile" class="nav-avatar-link">${avatar(currentUser)}</a>
        <a href="settings.html" class="muted nav-settings-link" title="Settings">&#9881;<span class="settings-text"> Settings</span></a>
      </div>
    </div></nav>

    <!-- Mobile Bottom Navigation Bar (Phones & Tabs <= 900px, hidden on Admin) -->
    ${!isAdmin ? `
    <nav class="mobile-bottom-bar" aria-label="Mobile Navigation">
      <div class="mobile-bottom-inner">
        ${bottomTabsHtml}
      </div>
    </nav>` : ""}`;

  document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    if (q) window.location.href = "search.html?q=" + encodeURIComponent(q);
  });
  document.getElementById("bell-btn").addEventListener("click", (event) => {
    event.stopPropagation();
    document.getElementById("notif-panel").classList.toggle("hidden");
  });
  document.addEventListener("click", (event) => {
    const panel = document.getElementById("notif-panel");
    if (panel && !panel.contains(event.target)) panel.classList.add("hidden");
  });
}

// ---------- footer (callout CTA + rich community details like Image 3) ----------
function renderFooter() {
  const footerEl = document.getElementById("footer");
  if (!footerEl) return;

  const isLoggedIn = Boolean(currentUser);

  footerEl.innerHTML = `
    <footer class="app-footer">
      <!-- Callout section like Image 3 top banner -->
      <section class="footer-callout">
        <div class="footer-callout-inner">
          <div class="footer-callout-text">
            <span class="callout-eyebrow">THERE IS A PLACE FOR YOU</span>
            <h2 class="callout-title">Be part of a community that creates.</h2>
            <p class="callout-desc">Students can share digital art, photography, writing, and music. Connect with fellow creators, join creative challenges, and collaborate on exciting campus projects across Kanglung.</p>
          </div>
          <div class="footer-callout-action">
            ${isLoggedIn
              ? `<a class="btn-callout-action" href="create.html">+ Share your work</a>
                 <a class="callout-sublink" href="profile.html">View your profile</a>`
              : `<a class="btn-callout-action" href="register.html">Sign up</a>
                 <a class="callout-sublink" href="login.html">Already a member? Log in</a>`
            }
          </div>
        </div>
      </section>

      <!-- Main Footer Details -->
      <section class="footer-main">
        <div class="footer-main-inner">
          <div class="footer-brand-col">
            <div class="footer-logo-row">
              <div class="footer-logo-badge">C</div>
              <div>
                <h3 class="footer-brand-title">Creative Hub</h3>
                <span class="footer-brand-sub">SHERUBTSE COLLEGE · BHUTAN</span>
              </div>
            </div>
            <p class="footer-tagline">Together, we can create a stronger and more vibrant creative community in Kanglung.</p>
          </div>

          <div class="footer-col">
            <h4>Discover</h4>
            <ul>
              <li><a href="home.html">Creative Feed</a></li>
              <li><a href="search.html?q=Photography">Photography</a></li>
              <li><a href="search.html?q=Digital%20Art">Digital Art</a></li>
              <li><a href="search.html?q=Illustration">Illustration</a></li>
              <li><a href="search.html?q=Writing">Campus Writing</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Participate</h4>
            <ul>
              <li><a href="create.html">Share Your Work</a></li>
              <li><a href="challenges.html">Creative Challenges</a></li>
              <li><a href="collaboration.html">Collaboration Hub</a></li>
              <li><a href="connect.html">Discover Creators</a></li>
              <li><a href="search.html">Search Community</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Your Community</h4>
            <ul>
              <li><a href="profile.html">Member Profile</a></li>
              <li><a href="messages.html">Direct Messages</a></li>
              <li><a href="settings.html">Account Settings</a></li>
              ${currentUser && currentUser.role === "admin" ? `<li><a href="/admin">Admin Dashboard</a></li>` : ""}
              <li><a href="login.html" onclick="logout(); return false;">Log out</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; 2026 Creative Hub &middot; Sherubtse College, Royal University of Bhutan. All rights reserved.</div>
          <div class="footer-bottom-links">
            <a href="connect.html">Campus Creators</a>
            <a href="challenges.html">Challenges</a>
            <a href="collaboration.html">Collaborate</a>
            <a href="settings.html">Theme Settings</a>
          </div>
        </div>
      </section>
    </footer>
  `;
}


// ---------- notifications ----------
async function loadNotifications() {
  try {
    const data = await api("/api/notifications");
    const badge = document.getElementById("bell-badge");
    badge.textContent = data.unread;
    badge.classList.toggle("hidden", data.unread === 0);

    let html = `<div class="dropdown-head">Notifications
      <button class="btn small secondary" id="read-all-btn">Mark all as read</button></div>`;
    if (data.items.length === 0) html += `<div class="empty">No notifications yet.</div>`;
    data.items.forEach(n => {
      html += `<a class="notif ${n.is_read ? "" : "unread"}" data-id="${n.id}" data-link="${esc(n.link || "")}">
        ${esc(n.message)}<small>${formatDateTime(n.created_at)}</small></a>`;
    });
    const panel = document.getElementById("notif-panel");
    panel.innerHTML = html;
    document.getElementById("read-all-btn").addEventListener("click", async (event) => {
      event.stopPropagation();
      await api("/api/notifications/read-all", { method: "PUT" });
      loadNotifications();
    });
    panel.querySelectorAll(".notif").forEach(item => {
      item.addEventListener("click", async () => {
        await api("/api/notifications/" + item.dataset.id + "/read", { method: "PUT" });
        if (item.dataset.link) window.location.href = item.dataset.link;
        else loadNotifications();
      });
    });
  } catch (error) { /* ignore notification errors */ }
}

// ---------- post cards (used on Home, Profile and Search) ----------
function postCardHtml(post) {
  return `
    <article class="card post reveal-on-scroll" id="post-${post.id}">
      <div class="post-head">
        <a href="profile.html?id=${post.user.id}">${avatar(post.user)}</a>
        <div><a href="profile.html?id=${post.user.id}">${esc(post.user.full_name)}</a>
        <div class="muted" style="font-size:0.82rem">@${esc(post.user.username)} &middot; ${formatDate(post.created_at)}</div></div>
      </div>
      <a href="creation-details.html?id=${post.id}"><img class="post-img" src="${fileUrl(post.image)}" alt="${esc(post.title)}" onerror="this.onerror=null; this.src='/images/sherubtse_clock_tower.jpg';"></a>
      <div class="post-body">
        <span class="tag">${esc(post.category)}</span>
        <h3><a href="creation-details.html?id=${post.id}" style="color:inherit">${esc(post.title)}</a></h3>
        <p>${esc(post.description)}</p>
      </div>
      <div class="post-actions">
        <button class="action like-btn ${post.liked_by_me ? "liked" : ""}" onclick="likePost(${post.id}, this)">
          ${post.liked_by_me ? "&#9829; Liked" : "&#9825; Like"} (<span class="like-count">${post.likes}</span>)</button>
        <a class="action" href="creation-details.html?id=${post.id}#comments">&#128172; Comments (${post.comments})</a>
        <button class="action share-btn" onclick="sharePost(${post.id}, this)" title="Share creation">&#10532; Share (<span class="share-count">${post.shares || 0}</span>)</button>
        <button class="action" onclick="reportCreationPrompt(${post.id})" title="Report creation" style="margin-left:auto; color:var(--muted); font-size:0.85rem;">&#9873; Report</button>
      </div>
    </article>`;
}

async function likePost(id, button) {
  try {
    const result = await api("/api/creations/" + id + "/like", { method: "POST" });
    button.classList.toggle("liked", result.liked);
    button.innerHTML = (result.liked ? "&#9829; Liked" : "&#9825; Like") +
      ` (<span class="like-count">${result.likes}</span>)`;
  } catch (error) {
    toast(error.message);
  }
}

async function sharePost(id, button) {
  try {
    const postUrl = window.location.origin + "/creation-details.html?id=" + id;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(postUrl);
    }
    const result = await api("/api/creations/" + id + "/share", { method: "POST", body: { method: "link_copy" } });
    if (button) {
      const countEl = button.querySelector(".share-count");
      if (countEl) countEl.textContent = result.shares;
    }
    toast("Link copied to clipboard!");
  } catch (err) {
    toast("Link copied to clipboard!");
  }
}

async function reportCreationPrompt(creationId) {
  const reason = prompt("Why are you reporting this creative work to platform administrators?");
  if (!reason || !reason.trim()) return;
  try {
    const res = await api("/api/admin/report", {
      method: "POST",
      body: { content_type: "creation", content_id: creationId, reason: reason.trim() }
    });
    toast(res.message || "Report submitted for administrator review.");
  } catch (err) {
    toast(err.message);
  }
}

async function reportCommentPrompt(commentId) {
  const reason = prompt("Why are you reporting this comment to platform administrators?");
  if (!reason || !reason.trim()) return;
  try {
    const res = await api("/api/admin/report", {
      method: "POST",
      body: { content_type: "comment", content_id: commentId, reason: reason.trim() }
    });
    toast(res.message || "Report submitted for administrator review.");
  } catch (err) {
    toast(err.message);
  }
}

// ================= Apple-Style Scroll Reveal Controller =================
let scrollObserver = null;

function initScrollReveal() {
  const targetSelectors = [
    ".card",
    ".post",
    ".user-card",
    ".stat-card",
    ".metric-box",
    ".challenge-card",
    ".item-card",
    ".page-title",
    ".footer-callout",
    ".footer-main",
    ".home-hero-content",
    ".detail-card",
    ".comment",
    ".profile-banner-card"
  ];

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(targetSelectors.join(",")).forEach(el => {
      el.classList.add("is-visible");
    });
    return;
  }

  if (!scrollObserver) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          scrollObserver.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.08
    });
  }

  function observeElements(root = document) {
    const elements = root.querySelectorAll(targetSelectors.join(","));
    elements.forEach((el) => {
      if (!el.classList.contains("is-visible")) {
        el.classList.add("reveal-on-scroll");

        // Stagger cascading animation for cards inside lists or grids
        const parent = el.parentElement;
        if (parent && (parent.classList.contains("grid") || parent.classList.contains("stack") || parent.id === "feed" || parent.id === "users" || parent.id === "list")) {
          const siblingIndex = Array.prototype.indexOf.call(parent.children, el);
          el.style.transitionDelay = `${Math.min((siblingIndex % 6) * 0.07, 0.42)}s`;
        }

        // Elements already in the viewport on initial load should reveal immediately
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          requestAnimationFrame(() => {
            el.classList.add("is-visible");
          });
        } else {
          scrollObserver.observe(el);
        }
      }
    });
  }

  observeElements();

  // MutationObserver detects dynamically fetched items (e.g. loadFeed(), search results, loadUsers())
  if (!window._scrollRevealMutationObserver && window.MutationObserver) {
    window._scrollRevealMutationObserver = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (hasNewNodes) {
        observeElements();
      }
    });
    window._scrollRevealMutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Global expose so other scripts can trigger if needed
window.initScrollReveal = initScrollReveal;

// Run on document load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrollReveal);
} else {
  initScrollReveal();
}
window.addEventListener("load", initScrollReveal);


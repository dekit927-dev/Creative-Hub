// Messages Page: Distinct contact colors, interactive chat, real-time messaging, and responsive view.
let activeUserId = null;
let activeUserData = null;
let isSending = false;

// Curated stable accent palette for contacts
const CONTACT_ACCENTS = [
  { key: "teal", name: "Teal", color: "#0D9488", badgeBg: "#CCFBF1", badgeText: "#0F766E", border: "#5EEAD4" },
  { key: "indigo", name: "Indigo", color: "#4F46E5", badgeBg: "#EEF2FF", badgeText: "#3730A3", border: "#A5B4FC" },
  { key: "violet", name: "Violet", color: "#7C3AED", badgeBg: "#EDE9FE", badgeText: "#5B21B6", border: "#C4B5FD" },
  { key: "emerald", name: "Emerald", color: "#059669", badgeBg: "#D1FAE5", badgeText: "#065F46", border: "#6EE7B7" },
  { key: "sky", name: "Sky", color: "#0284C7", badgeBg: "#E0F2FE", badgeText: "#075985", border: "#7DD3FC" },
  { key: "rose", name: "Rose", color: "#E11D48", badgeBg: "#FFE4E6", badgeText: "#9F1239", border: "#FDA4AF" },
  { key: "amber", name: "Amber", color: "#D97706", badgeBg: "#FEF3C7", badgeText: "#92400E", border: "#FCD34D" },
  { key: "cyan", name: "Cyan", color: "#0891B2", badgeBg: "#CFFAFE", badgeText: "#155E75", border: "#67E8F9" }
];

// Returns a stable, deterministic accent color based on user ID or username
function getContactAccent(user) {
  if (!user) return CONTACT_ACCENTS[0];
  const idNum = Number(user.id) || 0;
  let hash = idNum * 37;
  const str = user.username || user.full_name || "";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  const idx = Math.abs(hash) % CONTACT_ACCENTS.length;
  return CONTACT_ACCENTS[idx];
}

// Renders an avatar with an accent ring in the contact's stable color
function contactAvatar(user, accent, sizeClass = "") {
  const initials = (user.full_name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (user.profile_picture) {
    return `<img class="avatar ${sizeClass}" style="border: 2.5px solid ${accent.color};" src="${fileUrl(user.profile_picture)}" alt="${esc(user.full_name)}" onerror="this.onerror=null; this.outerHTML='<span class=\\'avatar initials ${sizeClass}\\' style=\\'background:${accent.color}; color:#ffffff; border: 2.5px solid ${accent.border};\\'>${esc(initials)}</span>';">`;
  }
  return `<span class="avatar initials ${sizeClass}" style="background:${accent.color}; color:#ffffff; border: 2.5px solid ${accent.border};">${esc(initials)}</span>`;
}

// Load and render conversation list
async function loadConversations() {
  const container = document.getElementById("conversations");
  try {
    const list = await api("/api/conversations");
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty" style="padding:32px 16px;">
          <div style="font-size:1.8rem; margin-bottom:8px;">&#128172;</div>
          <strong>No conversations yet</strong>
          <p class="muted" style="font-size:0.85rem; margin-top:4px;">Use the dropdown above to start a conversation.</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(c => {
      const accent = getContactAccent(c.user);
      const isActive = c.user.id === activeUserId;
      return `
        <div class="convo ${isActive ? "active" : ""}"
             style="--convo-accent-color: ${accent.color};"
             onclick="openChat(${c.user.id})"
             id="convo-${c.user.id}">
          <div class="convo-avatar-wrap">
            ${contactAvatar(c.user, accent, "small")}
          </div>
          <div class="convo-info">
            <div class="convo-name-row">
              <span class="convo-name">${esc(c.user.full_name)}</span>
              <span class="convo-tag" style="background:${accent.badgeBg}; color:${accent.badgeText}; border:1px solid ${accent.border}">
                @${esc(c.user.username)}
              </span>
            </div>
            <small>${esc(c.last_message || "No messages yet")}</small>
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    toast(error.message);
  }
}

// Mobile navigation: go back to conversations list
function backToList() {
  const layout = document.getElementById("chat-layout");
  if (layout) layout.classList.remove("mobile-in-chat");
}

// Update the disabled/active state of the send button
function updateSendButton() {
  const input = document.getElementById("chat-input");
  const btn = document.getElementById("send-btn");
  if (!btn || !input) return;
  const hasText = Boolean(input.value.trim());
  btn.disabled = !hasText || isSending;
  btn.classList.toggle("btn-disabled", !hasText || isSending);
}

// Load messages thread for the active user
async function loadThread(showLoading = false) {
  if (!activeUserId) return;
  const box = document.getElementById("chat-messages");
  const head = document.getElementById("chat-head");

  if (showLoading) {
    box.innerHTML = `<div class="loading-box"><div class="spinner-ring"></div><span>Loading messages...</span></div>`;
  }

  try {
    const data = await api("/api/messages?with_user=" + activeUserId);
    activeUserData = data.user;
    const accent = getContactAccent(data.user);

    // Apply contact's distinct accent to the header stripe and elements
    head.style.borderTop = `3px solid ${accent.color}`;
    head.innerHTML = `
      <div class="chat-head-user">
        <button class="mobile-back-btn" onclick="backToList()" title="Back to conversations">&larr; Chats</button>
        ${contactAvatar(data.user, accent, "small")}
        <div class="chat-head-info">
          <div class="chat-head-name">
            <span>${esc(data.user.full_name)}</span>
            <span class="chat-accent-badge" style="background:${accent.badgeBg}; color:${accent.badgeText}; border:1px solid ${accent.border}">
              @${esc(data.user.username)}
            </span>
          </div>
        </div>
      </div>
      <div>
        <a class="btn small secondary" href="profile.html?id=${data.user.id}" title="View ${esc(data.user.full_name)}'s profile">View Profile</a>
      </div>
    `;

    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

    if (!data.messages || data.messages.length === 0) {
      box.innerHTML = `
        <div class="empty-chat-state">
          <span class="empty-chat-state-icon" style="color:${accent.color}">&#9998;</span>
          <h4>Conversation with ${esc(data.user.full_name)}</h4>
          <p>No messages yet. Send a friendly greeting to start collaborating!</p>
        </div>`;
    } else {
      box.innerHTML = data.messages.map(m => {
        const isMine = m.sender_id === currentUser.id;
        return `
          <div class="bubble ${isMine ? "mine" : ""}">
            ${esc(m.message)}
            <small>${formatDateTime(m.created_at)}</small>
          </div>
        `;
      }).join("");
    }

    if (showLoading || atBottom) {
      box.scrollTop = box.scrollHeight;
    }
  } catch (error) {
    box.innerHTML = `<div class="message error">${esc(error.message)}</div>`;
  }
}

// Open chat with a specific user
async function openChat(userId) {
  if (!userId) return;
  activeUserId = Number(userId);

  // Responsive switch on mobile
  const layout = document.getElementById("chat-layout");
  if (layout) layout.classList.add("mobile-in-chat");

  const form = document.getElementById("chat-form");
  form.classList.remove("hidden");

  // Highlight selected conversation in sidebar immediately
  document.querySelectorAll(".convo").forEach(el => el.classList.remove("active"));
  const activeItem = document.getElementById("convo-" + activeUserId);
  if (activeItem) activeItem.classList.add("active");

  await loadThread(true);
  updateSendButton();

  // Focus message input
  const input = document.getElementById("chat-input");
  if (input) input.focus();

  loadConversations();
}

// Send Message Handler
document.getElementById("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = (input.value || "").trim();
  if (!text || !activeUserId || isSending) return;

  isSending = true;
  updateSendButton();

  try {
    await api("/api/messages", {
      method: "POST",
      body: { receiver_id: activeUserId, message: text }
    });
    input.value = "";
    updateSendButton();
    await loadThread(false);

    const box = document.getElementById("chat-messages");
    box.scrollTop = box.scrollHeight;
    loadConversations();
  } catch (error) {
    toast(error.message);
  } finally {
    isSending = false;
    updateSendButton();
    input.focus();
  }
});

// Handle real-time input changes
const chatInputEl = document.getElementById("chat-input");
if (chatInputEl) {
  chatInputEl.addEventListener("input", updateSendButton);
  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("chat-form").requestSubmit();
    }
  });
}

// Select a new user from dropdown
document.getElementById("new-chat").addEventListener("change", (event) => {
  if (event.target.value) {
    openChat(event.target.value);
  }
  event.target.value = "";
});

// Page Initialization
(async function start() {
  await initPage("messages.html");

  // Populate users in dropdown
  try {
    const users = await api("/api/users");
    const select = document.getElementById("new-chat");
    users.filter(u => u.id !== currentUser.id).forEach(u => {
      select.insertAdjacentHTML("beforeend", `<option value="${u.id}">${esc(u.full_name)} (@${esc(u.username)})</option>`);
    });
  } catch (err) { /* ignore */ }

  await loadConversations();

  // Check URL parameter (e.g. ?user=3)
  const target = getParam("user");
  if (target) {
    openChat(target);
  }

  // Real-time chat via Socket.IO
  if (typeof io !== "undefined") {
    const socket = io();
    socket.emit("join_user", currentUser.id);
    socket.on("new_message", (msg) => {
      if (activeUserId && (msg.sender_id === activeUserId || msg.receiver_id === activeUserId)) {
        loadThread(false);
      }
      loadConversations();
    });
  }

  // Graceful polling fallback every 6 seconds
  setInterval(() => {
    if (activeUserId) loadThread(false);
    loadConversations();
  }, 6000);
})();

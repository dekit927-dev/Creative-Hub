// Creation details page: big image, like, comments, delete.
const creationId = getParam("id");

function renderComment(c) {
  return `<div class="comment">${avatar(c.user, "small")}<div>
    <a href="profile.html?id=${c.user.id}"><strong>${esc(c.user.full_name)}</strong></a>
    <span class="muted" style="font-size:0.8rem"> ${formatDateTime(c.created_at)}</span>
    <p>${esc(c.comment)}</p></div></div>`;
}

async function loadCreation() {
  const box = document.getElementById("details");
  try {
    const c = await api("/api/creations/" + creationId);
    const isOwner = currentUser && (c.user.id === currentUser.id || currentUser.role === 'admin');
    const mediaType = getMediaType(c.image, c.category);
    let mediaHtml = '';
    if (mediaType === 'video') {
      mediaHtml = `
        <div class="details-media-container video-details-container">
          <video class="details-img details-video-player" src="${fileUrl(c.image)}" controls playsinline autoplay muted preload="auto"></video>
        </div>`;
    } else if (mediaType === 'audio') {
      mediaHtml = `
        <div class="details-media-container audio-details-container">
          <div class="details-audio-box">
            <div class="audio-disc-icon" style="width:64px; height:64px;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
            <div style="flex:1; min-width:0;">
              <h2 style="margin:0 0 4px; font-size:1.3rem; color:var(--blue-navy);">${esc(c.title)}</h2>
              <div class="muted" style="font-size:0.88rem;">Audio recording by ${esc(c.user.full_name)}</div>
            </div>
          </div>
          <audio class="details-audio-player" src="${fileUrl(c.image)}" controls preload="auto" style="width:100%; margin-top:16px;"></audio>
        </div>`;
    } else {
      mediaHtml = `<div><img class="details-img" src="${fileUrl(c.image)}" alt="${esc(c.title)}" onerror="this.onerror=null; this.src='/images/sherubtse_clock_tower.jpg';"></div>`;
    }

    box.innerHTML = `
      ${mediaHtml}
      <div class="card">
        <span class="tag">${esc(c.category)}</span>
        <h1 style="font-size:1.6rem">${esc(c.title)}</h1>
        <div class="row" style="margin:8px 0">
          <a href="profile.html?id=${c.user.id}">${avatar(c.user)}</a>
          <div><a href="profile.html?id=${c.user.id}"><strong>${esc(c.user.full_name)}</strong></a>
          <div class="muted" style="font-size:0.85rem">Created ${formatDate(c.created_at)}</div></div>
        </div>
        <p>${esc(c.description)}</p>
        <div class="row" style="margin:12px 0; gap:10px; align-items:center;">
          <button class="action like-btn ${c.liked_by_me ? "liked" : ""}" id="like-btn">
            ${c.liked_by_me ? svgIcon("heartFilled", "sm") + " Liked" : svgIcon("heart", "sm") + " Like"} (<span class="like-count">${c.likes}</span>)</button>
          <button class="action share-btn" onclick="sharePost(${c.id}, this)">${svgIcon("share", "sm")} Share (<span class="share-count">${c.shares || 0}</span>)</button>
          <span class="muted"><span id="comment-count">${c.comment_list.length}</span> comments</span>
          <button class="action" onclick="reportCreationPrompt(${c.id})" style="color:var(--muted); font-size:0.85rem;" title="Report creation">${svgIcon("flag", "sm")} Report</button>
          ${isOwner ? `<button class="btn danger small" id="delete-btn">Delete</button>` : ""}
        </div>
        <h3 id="comments">Comments</h3>
        <div id="comment-list">${c.comment_list.map(renderComment).join("") || `<p class="muted" id="no-comments">No comments yet. Be the first.</p>`}</div>
        <form class="comment-form" id="comment-form">
          <input type="text" id="comment-input" placeholder="Add a comment" maxlength="500" autocomplete="off">
          <button class="btn" type="submit">Post</button>
        </form>
      </div>`;

    document.getElementById("like-btn").addEventListener("click", (e) => likePost(c.id, e.currentTarget));

    document.getElementById("comment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("comment-input");
      if (!input.value.trim()) return toast("Please write a comment first.");
      try {
        const newComment = await api("/api/creations/" + c.id + "/comments", { method: "POST", body: { comment: input.value } });
        const none = document.getElementById("no-comments");
        if (none) none.remove();
        document.getElementById("comment-list").insertAdjacentHTML("beforeend", renderComment(newComment));
        const counter = document.getElementById("comment-count");
        counter.textContent = Number(counter.textContent) + 1;
        input.value = "";
      } catch (error) { toast(error.message); }
    });

    const deleteBtn = document.getElementById("delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this creation? This cannot be undone.")) return;
        try {
          const res = await api("/api/creations/" + c.id, { method: "DELETE" });
          toast(res && res.message ? res.message : "Creation deleted successfully.");
          setTimeout(() => {
            window.location.href = "home.html";
          }, 600);
        } catch (error) { toast(error.message); }
      });
    }
  } catch (error) {
    showMessage("message", error.message);
  }
}

(async function start() {
  await initPage("");
  if (!creationId) return showMessage("message", "No creation selected.");
  loadCreation();
})();

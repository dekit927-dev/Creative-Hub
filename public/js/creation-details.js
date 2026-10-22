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
    const isOwner = c.user.id === currentUser.id;
    box.innerHTML = `
      <div><img class="details-img" src="${fileUrl(c.image)}" alt="${esc(c.title)}"></div>
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
            ${c.liked_by_me ? "&#9829; Liked" : "&#9825; Like"} (<span class="like-count">${c.likes}</span>)</button>
          <button class="action share-btn" onclick="sharePost(${c.id}, this)">&#10532; Share (<span class="share-count">${c.shares || 0}</span>)</button>
          <span class="muted"><span id="comment-count">${c.comment_list.length}</span> comments</span>
          <button class="action" onclick="reportCreationPrompt(${c.id})" style="color:var(--muted); font-size:0.85rem;" title="Report creation">&#9873; Report</button>
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
        if (!confirm("Delete this creation? This cannot be undone.")) return;
        try {
          await api("/api/creations/" + c.id, { method: "DELETE" });
          window.location.href = "home.html";
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

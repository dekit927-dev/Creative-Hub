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
    const mediaType = getMediaType(c.image, c);
    let mediaHtml = '';
    if (mediaType === 'video') {
      const vSrc = fileUrl(c.image);
      mediaHtml = `
        <div class="details-media-container video-details-container">
          <video class="details-img details-video-player" controls playsinline autoplay muted preload="auto" onerror="handleVideoError(this, '${vSrc}', '${esc(c.title)}')">
            <source src="${vSrc}" type="video/mp4">
            <source src="${vSrc}" type="video/webm">
            <source src="${vSrc}" type="video/quicktime">
            Your browser does not support HTML5 video.
          </video>
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
    } else if (mediaType === 'document') {
      const docSrc = fileUrl(c.image);
      const rawFileName = c.file_name || (c.raw_image ? c.raw_image.split('/').pop() : 'Document');
      const ext = rawFileName.split('.').pop().toLowerCase();
      let badgeColor = 'var(--blue-primary)';
      let badgeText = ext.toUpperCase();
      if (ext === 'pdf') { badgeColor = '#ef4444'; badgeText = 'PDF'; }
      else if (ext === 'doc' || ext === 'docx') { badgeColor = '#2563eb'; badgeText = 'DOC'; }
      else if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') { badgeColor = '#10b981'; badgeText = 'SHEET'; }
      else if (ext === 'ppt' || ext === 'pptx') { badgeColor = '#f59e0b'; badgeText = 'SLIDES'; }

      const sizeStr = c.file_size ? `${(c.file_size / (1024 * 1024)).toFixed(1)} MB` : '';

      mediaHtml = `
        <div class="details-media-container doc-details-container" style="padding:28px 24px; background:linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(59,130,246,0.14) 100%); border-radius:16px; border:1px solid var(--blue-border); margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
            <div style="width:68px; height:68px; border-radius:16px; background:${badgeColor}; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 6px 18px rgba(0,0,0,0.15);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-size:10px; font-weight:800; letter-spacing:0.5px; margin-top:3px;">${badgeText}</span>
            </div>
            <div style="flex:1; min-width:200px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="media-type-badge doc-badge" style="position:static;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  ${badgeText} Document
                </span>
                ${sizeStr ? `<span class="muted" style="font-size:0.85rem; font-weight:600;">${sizeStr}</span>` : ''}
              </div>
              <h2 style="margin:0 0 6px; font-size:1.35rem; color:var(--text-main);">${esc(c.title)}</h2>
              <div class="muted" style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                File: <strong>${esc(rawFileName)}</strong>
              </div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              <a href="${docSrc}" target="_blank" rel="noopener noreferrer" class="btn" style="padding:10px 18px; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Open / View
              </a>
              <a href="${docSrc}" download="${esc(rawFileName)}" class="btn secondary" style="padding:10px 18px; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download
              </a>
            </div>
          </div>
          ${ext === 'pdf' ? `
            <div style="margin-top:20px; border-radius:12px; overflow:hidden; border:1px solid var(--blue-border); background:#fff; height:500px;">
              <iframe src="${docSrc}" style="width:100%; height:100%; border:none;" title="PDF Preview"></iframe>
            </div>` : ''}
        </div>`;
    } else if (mediaType === 'link') {
      const rawUrl = c.link_url || "";
      let domain = "";
      try {
        domain = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl).hostname;
      } catch (e) {
        domain = rawUrl;
      }

      mediaHtml = `
        <div class="details-media-container link-details-container" style="margin-bottom:16px;">
          ${c.image ? `
            <div style="position:relative; margin-bottom:14px;">
              <img class="details-img" src="${fileUrl(c.image)}" alt="${esc(c.title)}" style="max-height:420px; object-fit:cover; border-radius:12px;">
              <span class="media-type-badge link-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Link / URL
              </span>
            </div>` : ''}
          <div style="padding:22px 24px; border-radius:14px; background:linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(59,130,246,0.16) 100%); border:1px solid var(--blue-border); display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:16px; min-width:240px; flex:1;">
              <div style="width:48px; height:48px; border-radius:12px; background:var(--blue-primary); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </div>
              <div style="min-width:0; flex:1;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="media-type-badge link-badge" style="position:static;">External Resource</span>
                  <span style="font-weight:700; color:var(--blue-primary); font-size:0.95rem;">${esc(domain)}</span>
                </div>
                <a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; margin-top:4px; font-size:0.88rem; color:var(--text-main); text-decoration:underline; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:480px;">
                  ${esc(rawUrl)}
                </a>
              </div>
            </div>
            <a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer" class="btn" style="padding:10px 22px; font-size:0.95rem; display:inline-flex; align-items:center; gap:8px;">
              <span>Visit External Link</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>`;
    } else {
      mediaHtml = `<div><img class="details-img" src="${fileUrl(c.image)}" alt="${esc(c.title)}"></div>`;
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

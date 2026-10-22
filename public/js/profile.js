// Profile Page: Distinct visual identity, interactive profile management, follow/message actions, and creations.
let profileUser = null;

async function loadProfile() {
  const id = getParam("id") || currentUser.id;
  try {
    profileUser = await api("/api/users/" + id);
  } catch (error) {
    return showMessage("message", error.message);
  }
  const u = profileUser;
  const isMe = u.id === currentUser.id;

  // Render distinct user profile hero card
  document.getElementById("profile-head").innerHTML = `
    <div class="profile-hero-card">
      <div class="profile-banner"></div>
      <div class="profile-hero-body">
        <div class="profile-avatar-row">
          <div class="profile-avatar-wrap">
            ${avatar(u, "big")}
          </div>
          <div class="profile-badges-row">
            ${isMe
              ? `<span class="profile-badge-pill mine">&#10022; Your Profile</span>`
              : `<span class="profile-badge-pill creator">&#9679; Creative Member</span>`}
          </div>
        </div>

        <div class="profile-meta-wrap">
          <h1>${esc(u.full_name)}</h1>
          <div class="profile-handle-badge">@${esc(u.username)}</div>
          
          <div class="profile-bio-box">
            ${esc(u.bio) || '<span class="muted" style="font-style:italic">No bio shared yet.</span>'}
          </div>

          <div class="profile-stats-grid">
            <div class="profile-stat-tile">
              <strong>${u.creations}</strong>
              <span>Creations</span>
            </div>
            <div class="profile-stat-tile">
              <strong id="followers-count">${u.followers}</strong>
              <span>Followers</span>
            </div>
            <div class="profile-stat-tile">
              <strong>${u.following}</strong>
              <span>Following</span>
            </div>
          </div>

          <div class="profile-actions">
            ${isMe ? `
              <button class="btn" id="edit-btn">&#9998; Edit profile</button>
              <a class="btn secondary" href="create.html">+ Share new work</a>
            ` : `
              <button class="btn ${u.is_following ? "secondary" : ""}" id="follow-btn">
                ${u.is_following ? "&#10003; Following" : "+ Follow"}
              </button>
              <a class="btn secondary" href="messages.html?user=${u.id}">&#9993; Message</a>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  if (isMe) {
    document.getElementById("edit-btn").addEventListener("click", () => {
      document.getElementById("e-name").value = u.full_name;
      document.getElementById("e-bio").value = u.bio || "";
      const editCard = document.getElementById("edit-card");
      editCard.classList.remove("hidden");
      editCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else {
    document.getElementById("follow-btn").addEventListener("click", async (event) => {
      try {
        const result = await api("/api/users/" + u.id + "/follow", { method: "POST" });
        event.target.innerHTML = result.following ? "&#10003; Following" : "+ Follow";
        event.target.classList.toggle("secondary", result.following);
        document.getElementById("followers-count").textContent = result.followers;
        toast(result.following ? `Now following ${u.full_name}` : `Unfollowed ${u.full_name}`);
      } catch (error) {
        toast(error.message);
      }
    });
  }

  loadCreations(u.id);
}

// Live avatar preview in edit profile form
const pictureInput = document.getElementById("e-picture");
if (pictureInput) {
  pictureInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const previewWrap = document.getElementById("avatar-preview-wrap");
    const previewImg = document.getElementById("avatar-preview-img");
    if (file && previewWrap && previewImg) {
      previewImg.src = URL.createObjectURL(file);
      previewWrap.classList.remove("hidden");
    }
  });
}

// Load creations for user
async function loadCreations(userId) {
  const box = document.getElementById("creations");
  try {
    const posts = await api("/api/creations?user_id=" + userId);
    box.innerHTML = posts.length
      ? posts.map(postCardHtml).join("")
      : `<div class="empty" style="grid-column:1/-1">
           <div style="font-size:2rem; margin-bottom:8px;">&#127912;</div>
           <strong>No creations shared yet</strong>
           <p class="muted" style="margin-top:4px;">When this creator publishes creative works, they will appear here.</p>
         </div>`;
  } catch (error) {
    box.innerHTML = `<div class="message error" style="grid-column:1/-1">${esc(error.message)}</div>`;
  }
}

// Downscale large avatar images client-side for fast uploads and permanent DB persistence
function resizeImageToDataUrl(file, maxWidth = 600, maxHeight = 600, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Cancel editing
document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("edit-card").classList.add("hidden");
});

// Submit edit profile form
document.getElementById("edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("edit-message");
  const name = document.getElementById("e-name").value.trim();
  if (!name) return showMessage("edit-message", "Name cannot be empty.");

  const saveBtn = document.getElementById("save-profile-btn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  const formData = new FormData();
  formData.append("full_name", name);
  formData.append("bio", document.getElementById("e-bio").value);
  const picture = document.getElementById("e-picture").files[0];
  if (picture) {
    formData.append("profile_picture", picture);
    try {
      const compressedData = await resizeImageToDataUrl(picture);
      if (compressedData) {
        formData.append("profile_picture_data", compressedData);
      }
    } catch (e) {
      // fallback to file upload
    }
  }

  try {
    await api("/api/users/" + currentUser.id, { method: "PUT", body: formData });
    toast("Profile updated successfully!");
    setTimeout(() => window.location.reload(), 400);
  } catch (error) {
    showMessage("edit-message", error.message);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save changes";
    }
  }
});

(async function start() {
  const me = await initPage("");
  if (me) loadProfile();
})();

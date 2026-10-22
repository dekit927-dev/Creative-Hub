let collabData = null;
const collabId = getParam("id");

if (!collabId) {
  window.location.href = "collaboration.html";
}

let selectedAttachmentFile = null;

function getStatusBadge(status) {
  const norm = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="status-badge-lg ${norm}">${esc(status || "Pending")}</span>`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type, filename = "") {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (type === "audio" || ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) {
    return svgIcon("music", "lg");
  }
  if (type === "photo" || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
    return svgIcon("image", "lg");
  }
  return svgIcon("fileText", "lg");
}

async function loadCollabDetails() {
  try {
    collabData = await api(`/api/collaborations/${collabId}`);
    renderDetails(collabData);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("content").classList.remove("hidden");
  } catch (err) {
    document.getElementById("loading").innerHTML = `
      <div class="message error">${esc(err.message || "Could not load collaboration.")}</div>
      <a href="collaboration.html" class="btn small" style="margin-top:16px;">Back to Collaboration Hub</a>
    `;
  }
}

function renderDetails(c) {
  document.getElementById("collab-title").textContent = c.title;
  document.getElementById("collab-category").textContent = c.category;
  document.getElementById("collab-mode").textContent = c.mode;
  document.getElementById("collab-status-tag").textContent = c.status;
  document.getElementById("collab-status-tag").className = `tag ${c.status === "Open" ? "" : "warn"}`;

  document.getElementById("collab-user-name").textContent = c.user.full_name;
  document.getElementById("collab-user-link").href = `profile.html?id=${c.user.id}`;
  document.getElementById("collab-user-avatar").innerHTML = avatar(c.user, "small");

  document.getElementById("collab-positions").textContent = c.positions || "--";
  document.getElementById("collab-duration").textContent = c.duration || "--";
  document.getElementById("collab-location").textContent = c.location || "--";
  document.getElementById("collab-experience").textContent = c.experience || "--";

  document.getElementById("collab-description").textContent = c.description;
  document.getElementById("collab-roles").textContent = c.roles;
  document.getElementById("collab-deliverables").textContent = c.deliverables;
  document.getElementById("collab-tools").textContent = c.tools;
  document.getElementById("collab-compensation").textContent = c.compensation;
  document.getElementById("collab-application-instructions").textContent = c.application_instructions;

  // Check if current user is the creator or admin
  const isCreatorOrAdmin = currentUser && (currentUser.id === c.user.id || currentUser.role === "admin");
  const topActionBox = document.getElementById("collab-top-action");

  const metaItems = document.querySelectorAll(".meta-item");
  if (isCreatorOrAdmin) {
    metaItems.forEach(el => {
      el.classList.add("is-creator-editable");
      el.title = `Click to edit ${el.dataset.field || "this parameter"}`;
      el.onclick = () => openEditModal(el.dataset.field);
    });

    topActionBox.innerHTML = `
      <button class="btn secondary small" onclick="openEditModal()" id="edit-collab-btn" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
        ${svgIcon("edit", "sm")} <span>Edit Project Details</span>
      </button>
    `;
  } else {
    metaItems.forEach(el => {
      el.classList.remove("is-creator-editable");
      el.onclick = null;
    });
    topActionBox.innerHTML = "";
  }

  renderApplicationCard(c);
  renderReviewerBox(c);
}

function renderAttachmentPreview(attFile, attName, attType) {
  if (!attFile) return "";
  const url = fileUrl(attFile);
  const name = esc(attName || "Uploaded Sample");
  const type = (attType || "").toLowerCase();

  if (type === "audio") {
    return `
      <div style="margin:10px 0; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:10px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.85rem; font-weight:700; color:#166534; display:flex; align-items:center; gap:6px;">
            <span style="display:flex; align-items:center;">${svgIcon("music", "sm")}</span> <span>Audio Demo:</span> <strong style="color:#14532D;">${name}</strong>
          </span>
          <a href="${url}" download="${name}" class="btn xs secondary" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; padding:3px 8px;">
            ${svgIcon("download", "xs")} <span>Download</span>
          </a>
        </div>
        <audio controls preload="metadata" style="width:100%; height:36px; border-radius:6px;" src="${url}"></audio>
      </div>
    `;
  }

  if (type === "photo") {
    return `
      <div style="margin:10px 0; background:#FFFFFF; border:1px solid var(--blue-border); border-radius:10px; padding:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.83rem; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:6px;">
            <span style="display:flex; align-items:center; color:var(--blue-primary);">${svgIcon("image", "sm")}</span> <span>Attached Photo:</span> <strong>${name}</strong>
          </span>
          <a href="${url}" target="_blank" download="${name}" class="btn xs secondary" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; padding:3px 8px;">
            ${svgIcon("download", "xs")} <span>Download</span>
          </a>
        </div>
        <a href="${url}" target="_blank" title="Click to view full image" style="display:inline-block; max-width:100%;">
          <img src="${url}" alt="${name}" style="max-height:180px; max-width:100%; border-radius:8px; object-fit:cover; display:block; border:1px solid #E2E8F0; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        </a>
      </div>
    `;
  }

  // Document fallback
  return `
    <div style="margin:10px 0; display:flex; justify-content:space-between; align-items:center; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:10px; padding:10px 14px;">
      <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
        <span style="display:flex; align-items:center; color:var(--blue-navy);">${getFileIcon("document", attName)}</span>
        <div style="overflow:hidden;">
          <div style="font-weight:700; font-size:0.86rem; color:var(--ink); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${name}</div>
          <span class="muted" style="font-size:0.75rem;">Document Attachment</span>
        </div>
      </div>
      <a href="${url}" target="_blank" download="${name}" class="btn xs secondary" style="display:inline-flex; align-items:center; gap:4px; margin-left:10px; white-space:nowrap; padding:4px 10px;">
        ${svgIcon("download", "xs")} <span>Download</span>
      </a>
    </div>
  `;
}

function renderApplicationCard(c) {
  const statusBox = document.getElementById("request-status-box");
  const btnBox = document.getElementById("action-buttons-box");
  const isOwner = currentUser && currentUser.id === c.user.id;
  const myReq = c.my_request;

  if (isOwner) {
    statusBox.innerHTML = `
      <p style="margin:0 0 6px; font-weight:700; color:var(--blue-navy);">You are the Project Lead</p>
      <p class="muted" style="margin:0; font-size:0.85rem;">You initiated this collaboration. Update project parameters and review join requests below.</p>
    `;
    btnBox.innerHTML = `
      <button class="btn secondary full small" onclick="openEditModal()" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; margin-top:10px; font-weight:600;">
        ${svgIcon("edit", "sm")} <span>Edit Positions, Duration & Requirements</span>
      </button>
      <button class="btn secondary full small" onclick="toggleProjectStatus()" style="margin-top:8px;">
        ${c.status === "Open" ? "Close Project to New Requests" : "Re-open Project for Collaborators"}
      </button>
    `;
    return;
  }

  if (myReq && myReq.status !== "Withdrawn") {
    let feedbackHtml = "";
    if (myReq.decision_message) {
      feedbackHtml = `
        <div class="feedback-callout">
          <strong>Lead Student Note:</strong>
          <p style="margin:4px 0 0; color:var(--ink);">${esc(myReq.decision_message)}</p>
        </div>`;
    }

    let coverNoteHtml = "";
    if (myReq.message) {
      coverNoteHtml = `
        <div style="font-size:0.85rem; color:var(--muted); margin-top:8px;">
          <strong>Your Message:</strong> ${esc(myReq.message)}
        </div>`;
    }

    let attachmentHtml = "";
    if (myReq.attachment_file) {
      attachmentHtml = `
        <div style="margin-top:10px;">
          <strong style="font-size:0.82rem; color:var(--muted); display:block; margin-bottom:4px;">Your Attached Sample:</strong>
          ${renderAttachmentPreview(myReq.attachment_file, myReq.attachment_name, myReq.attachment_type)}
        </div>
      `;
    }

    statusBox.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.9rem; color:var(--muted);">Current Status:</span>
        ${getStatusBadge(myReq.status)}
      </div>
      <div style="font-size:0.82rem; color:var(--muted);">Requested on: ${formatDate(myReq.created_at)}</div>
      ${coverNoteHtml}
      ${attachmentHtml}
      ${feedbackHtml}
    `;

    if (["Pending", "Under Review"].includes(myReq.status)) {
      btnBox.innerHTML = `
        <button class="btn secondary full small" onclick="withdrawRequest()" style="margin-top:12px; color:var(--danger);">
          Withdraw Request
        </button>
      `;
    } else {
      btnBox.innerHTML = "";
    }
  } else {
    // Has not requested or withdrew
    if (c.status !== "Open") {
      statusBox.innerHTML = `<p class="muted" style="margin:0;">This project is currently closed and not accepting new collaborator requests.</p>`;
      btnBox.innerHTML = `<button class="btn full secondary" disabled>Collaboration Closed</button>`;
    } else {
      statusBox.innerHTML = `
        <p class="muted" style="margin:0 0 10px; font-size:0.9rem;">
          Interested in joining this creative project? Request to join, share your background, and upload audio demos, photos, or docs.
        </p>`;
      btnBox.innerHTML = `
        <button class="btn full" onclick="openApplyModal()">
          Request to Join
        </button>
      `;
    }
  }
}

function renderReviewerBox(c) {
  const reviewerBox = document.getElementById("reviewer-box");
  const requestersList = document.getElementById("requesters-list");
  if (!reviewerBox || !requestersList) return;

  const isLead = currentUser && (currentUser.id === c.user.id || currentUser.role === "admin");
  if (!isLead || !c.requesters_list || c.requesters_list.length === 0) {
    if (isLead && c.requesters_list && c.requesters_list.length === 0) {
      reviewerBox.classList.remove("hidden");
      requestersList.innerHTML = `<p class="muted" style="font-size:0.85rem;">No join requests yet.</p>`;
    } else {
      reviewerBox.classList.add("hidden");
    }
    return;
  }

  reviewerBox.classList.remove("hidden");
  requestersList.innerHTML = c.requesters_list.map(r => `
    <div class="card" style="padding:14px; border:1px solid var(--blue-border); font-size:0.88rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <a href="profile.html?id=${r.user.id}" class="row" style="font-weight:700; color:var(--ink);">
          ${avatar(r.user, "small")} ${esc(r.user.full_name)}
        </a>
        ${getStatusBadge(r.status)}
      </div>
      ${r.message ? `<p class="muted" style="margin:0 0 8px; font-size:0.83rem; background:var(--blue-pale); padding:8px 12px; border-radius:6px; line-height:1.5;"><strong>Note:</strong> ${esc(r.message)}</p>` : ""}
      
      ${renderAttachmentPreview(r.attachment_file, r.attachment_name, r.attachment_type)}

      ${r.decision_message ? `<p class="muted" style="margin:6px 0 8px; font-size:0.83rem;"><strong>Decision Note:</strong> ${esc(r.decision_message)}</p>` : ""}
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
        <select id="request-status-${r.request_id}" style="font-size:0.82rem; padding:5px 8px; width:auto; flex:1;">
          <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Under Review" ${r.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Accepted" ${r.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <button class="btn small" onclick="updateRequestStatus(${r.request_id})">Update</button>
      </div>
    </div>
  `).join("");
}

async function updateRequestStatus(requestId) {
  const select = document.getElementById("request-status-" + requestId);
  if (!select) return;
  const status = select.value;
  const decision_message = prompt(`Add an optional message or note for the student (Status: ${status}):`, "");
  if (decision_message === null) return;

  try {
    await api(`/api/collaborations/${collabId}/requests/${requestId}/status`, {
      method: "PATCH",
      body: { status, decision_message }
    });
    toast(`Applicant status set to "${status}"`);
    loadCollabDetails();
  } catch (err) {
    toast(err.message || "Failed to update status.");
  }
}

async function toggleProjectStatus() {
  try {
    await api(`/api/collaborations/${collabId}/status`, { method: "PUT" });
    toast("Project status updated.");
    loadCollabDetails();
  } catch (err) {
    toast(err.message || "Could not change status.");
  }
}

// ----------------- Edit Modal Logic -----------------
function openEditModal(focusField = null) {
  if (!collabData) return;
  hideMessage("edit-modal-error");

  document.getElementById("edit-positions").value = collabData.positions || "";
  document.getElementById("edit-duration").value = collabData.duration || "";
  document.getElementById("edit-location").value = collabData.location || "";
  document.getElementById("edit-experience").value = collabData.experience || "";
  document.getElementById("edit-mode").value = collabData.mode || "Hybrid";
  document.getElementById("edit-category").value = collabData.category || "";
  document.getElementById("edit-roles").value = collabData.roles || "";
  document.getElementById("edit-deliverables").value = collabData.deliverables || "";

  document.getElementById("edit-collab-modal").classList.remove("hidden");

  // Focus specific field if requested
  if (focusField === "positions") document.getElementById("edit-positions").focus();
  else if (focusField === "duration") document.getElementById("edit-duration").focus();
  else if (focusField === "location") document.getElementById("edit-location").focus();
  else if (focusField === "experience") document.getElementById("edit-experience").focus();
  else document.getElementById("edit-positions").focus();
}

function closeEditModal() {
  document.getElementById("edit-collab-modal").classList.add("hidden");
  hideMessage("edit-modal-error");
}

document.getElementById("close-edit-modal-btn").addEventListener("click", closeEditModal);
document.getElementById("close-edit-modal-x").addEventListener("click", closeEditModal);

document.getElementById("edit-collab-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage("edit-modal-error");
  const saveBtn = document.getElementById("save-collab-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const body = {
    positions: document.getElementById("edit-positions").value.trim(),
    duration: document.getElementById("edit-duration").value.trim(),
    location: document.getElementById("edit-location").value.trim(),
    experience: document.getElementById("edit-experience").value.trim(),
    mode: document.getElementById("edit-mode").value,
    category: document.getElementById("edit-category").value.trim() || undefined,
    roles: document.getElementById("edit-roles").value.trim() || undefined,
    deliverables: document.getElementById("edit-deliverables").value.trim() || undefined
  };

  try {
    await api(`/api/collaborations/${collabId}`, {
      method: "PUT",
      body
    });
    toast("Collaboration details updated successfully!");
    closeEditModal();
    loadCollabDetails();
  } catch (err) {
    showMessage("edit-modal-error", err.message || "Failed to update collaboration details.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
});

// ----------------- Apply Modal & File Upload Logic -----------------
const fileDropzone = document.getElementById("file-dropzone");
const applyFileInput = document.getElementById("apply-file");
const dropzoneIdle = document.getElementById("dropzone-idle");
const dropzoneSelected = document.getElementById("dropzone-selected");
const selectedFileName = document.getElementById("selected-file-name");
const selectedFileSize = document.getElementById("selected-file-size");
const selectedFileIcon = document.getElementById("selected-file-icon");
const removeFileBtn = document.getElementById("remove-file-btn");

function updateFileUI(file) {
  selectedAttachmentFile = file || null;
  if (file) {
    dropzoneIdle.classList.add("hidden");
    dropzoneSelected.classList.remove("hidden");
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = formatBytes(file.size);
    selectedFileIcon.textContent = getFileIcon(file.type ? file.type.split("/")[0] : "", file.name);
  } else {
    applyFileInput.value = "";
    dropzoneIdle.classList.remove("hidden");
    dropzoneSelected.classList.add("hidden");
  }
}

if (fileDropzone && applyFileInput) {
  fileDropzone.addEventListener("click", (e) => {
    if (e.target.closest("#remove-file-btn")) return;
    applyFileInput.click();
  });

  applyFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      updateFileUI(e.target.files[0]);
    }
  });

  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateFileUI(null);
    });
  }

  // Drag and drop events
  ["dragenter", "dragover"].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropzone.style.borderColor = "var(--blue-primary)";
      fileDropzone.style.background = "#EFF6FF";
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropzone.style.borderColor = "var(--blue-border)";
      fileDropzone.style.background = "#F8FAFC";
    });
  });

  fileDropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      updateFileUI(e.dataTransfer.files[0]);
    }
  });
}

function openApplyModal() {
  hideMessage("modal-error");
  updateFileUI(null);
  document.getElementById("apply-message").value = "";
  document.getElementById("apply-modal").classList.remove("hidden");
  document.getElementById("apply-message").focus();
}

function closeApplyModal() {
  document.getElementById("apply-modal").classList.add("hidden");
  hideMessage("modal-error");
  updateFileUI(null);
}

document.getElementById("close-modal-btn").addEventListener("click", closeApplyModal);
const closeModalX = document.getElementById("close-modal-x");
if (closeModalX) closeModalX.addEventListener("click", closeApplyModal);

document.getElementById("apply-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage("modal-error");
  const message = document.getElementById("apply-message").value.trim();
  const btn = document.getElementById("confirm-apply-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    let body;
    if (selectedAttachmentFile) {
      body = new FormData();
      if (message) body.append("message", message);
      body.append("attachment", selectedAttachmentFile);
    } else {
      body = { message };
    }

    const res = await api(`/api/collaborations/${collabId}/apply`, {
      method: "POST",
      body
    });

    toast(res.message || "Request sent successfully!");
    closeApplyModal();
    loadCollabDetails();
  } catch (err) {
    showMessage("modal-error", err.message || "Failed to submit request.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit Request";
  }
});

async function withdrawRequest() {
  if (!confirm("Are you sure you want to withdraw your join request?")) return;
  try {
    const res = await api(`/api/collaborations/${collabId}/withdraw`, { method: "POST" });
    toast(res.message || "Request withdrawn.");
    loadCollabDetails();
  } catch (err) {
    toast(err.message || "Failed to withdraw request.");
  }
}

(async function init() {
  await initPage("collaboration.html");
  loadCollabDetails();
})();

let collabData = null;
const collabId = getParam("id");

if (!collabId) {
  window.location.href = "collaboration.html";
}

function getStatusBadge(status) {
  const norm = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="status-badge-lg ${norm}">${esc(status || "Pending")}</span>`;
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

  document.getElementById("collab-positions").textContent = c.positions;
  document.getElementById("collab-duration").textContent = c.duration;
  document.getElementById("collab-location").textContent = c.location;
  document.getElementById("collab-experience").textContent = c.experience;

  document.getElementById("collab-description").textContent = c.description;
  document.getElementById("collab-roles").textContent = c.roles;
  document.getElementById("collab-deliverables").textContent = c.deliverables;
  document.getElementById("collab-tools").textContent = c.tools;
  document.getElementById("collab-compensation").textContent = c.compensation;
  document.getElementById("collab-application-instructions").textContent = c.application_instructions;

  renderApplicationCard(c);
  renderReviewerBox(c);
}

function renderApplicationCard(c) {
  const statusBox = document.getElementById("request-status-box");
  const btnBox = document.getElementById("action-buttons-box");
  const isOwner = currentUser && currentUser.id === c.user.id;
  const myReq = c.my_request;

  if (isOwner) {
    statusBox.innerHTML = `
      <p style="margin:0 0 6px; font-weight:700; color:var(--blue-navy);">You are the Project Lead</p>
      <p class="muted" style="margin:0; font-size:0.85rem;">You initiated this collaboration. Manage project status and review join requests below.</p>
    `;
    btnBox.innerHTML = `
      <button class="btn secondary full small" onclick="toggleProjectStatus()" style="margin-top:12px;">
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

    statusBox.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.9rem; color:var(--muted);">Current Status:</span>
        ${getStatusBadge(myReq.status)}
      </div>
      <div style="font-size:0.82rem; color:var(--muted);">Requested on: ${formatDate(myReq.created_at)}</div>
      ${coverNoteHtml}
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
          Interested in joining this creative project? Request to join and tell the project lead how you can contribute.
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
    <div class="card" style="padding:12px; border:1px solid var(--blue-border); font-size:0.88rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <a href="profile.html?id=${r.user.id}" class="row" style="font-weight:700; color:var(--ink);">
          ${avatar(r.user, "small")} ${esc(r.user.full_name)}
        </a>
        ${getStatusBadge(r.status)}
      </div>
      ${r.message ? `<p class="muted" style="margin:0 0 8px; font-size:0.83rem; background:var(--blue-pale); padding:6px 10px; border-radius:6px;"><strong>Note:</strong> ${esc(r.message)}</p>` : ""}
      ${r.decision_message ? `<p class="muted" style="margin:0 0 8px; font-size:0.83rem;"><strong>Decision Note:</strong> ${esc(r.decision_message)}</p>` : ""}
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
        <select id="request-status-${r.request_id}" style="font-size:0.82rem; padding:4px 8px; width:auto; flex:1;">
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

function openApplyModal() {
  document.getElementById("apply-modal").classList.remove("hidden");
  document.getElementById("apply-message").focus();
}

function closeApplyModal() {
  document.getElementById("apply-modal").classList.add("hidden");
  hideMessage("modal-error");
}

document.getElementById("close-modal-btn").addEventListener("click", closeApplyModal);

document.getElementById("apply-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage("modal-error");
  const message = document.getElementById("apply-message").value.trim();
  const btn = document.getElementById("confirm-apply-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    const res = await api(`/api/collaborations/${collabId}/apply`, {
      method: "POST",
      body: { message }
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

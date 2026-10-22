let challengeData = null;
const challengeId = getParam("id");

if (!challengeId) {
  window.location.href = "challenges.html";
}

function getStatusBadge(status) {
  const norm = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="status-badge-lg ${norm}">${esc(status || "Pending")}</span>`;
}

async function loadChallengeDetails() {
  try {
    challengeData = await api(`/api/challenges/${challengeId}`);
    renderDetails(challengeData);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("content").classList.remove("hidden");
  } catch (err) {
    document.getElementById("loading").innerHTML = `
      <div class="message error">${esc(err.message || "Could not load challenge.")}</div>
      <a href="challenges.html" class="btn small" style="margin-top:16px;">Back to Challenges</a>
    `;
  }
}

function renderDetails(ch) {
  document.getElementById("c-title").textContent = ch.title;
  document.getElementById("c-category").textContent = ch.category;
  document.getElementById("c-organizer").textContent = ch.organizer;
  document.getElementById("c-mode").textContent = ch.mode;
  const modeTextEl = document.getElementById("c-mode-text");
  if (modeTextEl) modeTextEl.textContent = ch.mode;
  document.getElementById("c-deadline").textContent = formatDate(ch.deadline);
  document.getElementById("c-location").textContent = ch.location;
  document.getElementById("c-team-size").textContent = ch.team_size;
  document.getElementById("c-participants-count").textContent = ch.participants;

  const ended = ch.deadline && new Date(ch.deadline) < new Date(new Date().toDateString());
  document.getElementById("c-ended-badge").classList.toggle("hidden", !ended);

  document.getElementById("c-description").textContent = ch.description;
  document.getElementById("c-deliverables").textContent = ch.deliverables;
  document.getElementById("c-submission-instructions").textContent = ch.submission_instructions;
  document.getElementById("c-eligibility").textContent = ch.eligibility;
  document.getElementById("c-evaluation-criteria").textContent = ch.evaluation_criteria;
  document.getElementById("c-prizes").textContent = ch.prizes;
  document.getElementById("c-resources").textContent = ch.resources;
  document.getElementById("c-contact-info").textContent = ch.contact_info;

  // Check if current user is the creator or admin
  const isCreatorOrAdmin = currentUser && (
    currentUser.role === "admin" ||
    (ch.user && ch.user.id === currentUser.id) ||
    ch.user_id === currentUser.id ||
    ch.organizer === currentUser.full_name
  );

  const topActionBox = document.getElementById("c-top-action");
  const metaItems = document.querySelectorAll(".meta-item");

  if (isCreatorOrAdmin) {
    metaItems.forEach(el => {
      if (el.dataset.field) {
        el.classList.add("is-creator-editable");
        el.title = `Click to edit ${el.dataset.field.replace("_", " ")}`;
        el.onclick = () => openEditModal(el.dataset.field);
      }
    });

    if (topActionBox) {
      topActionBox.innerHTML = `
        <button class="btn secondary small" onclick="openEditModal()" id="edit-challenge-btn" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
          ${svgIcon("edit", "sm")} <span>Edit Challenge Details</span>
        </button>
      `;
    }
  } else {
    metaItems.forEach(el => {
      el.classList.remove("is-creator-editable");
      el.onclick = null;
    });
    if (topActionBox) topActionBox.innerHTML = "";
  }

  renderApplicationCard(ch, ended);
  renderReviewerBox(ch);
}

function renderApplicationCard(ch, ended) {
  const statusBox = document.getElementById("application-status-box");
  const btnBox = document.getElementById("action-buttons-box");
  const myApp = ch.my_application;

  if (myApp && myApp.status !== "Withdrawn") {
    let feedbackHtml = "";
    if (myApp.decision_message) {
      feedbackHtml = `
        <div class="feedback-callout">
          <strong>Reviewer Note:</strong>
          <p style="margin:4px 0 0; color:var(--ink);">${esc(myApp.decision_message)}</p>
        </div>`;
    }

    let coverNoteHtml = "";
    if (myApp.message) {
      coverNoteHtml = `
        <div style="font-size:0.85rem; color:var(--muted); margin-top:8px;">
          <strong>Your Submission Note:</strong> ${esc(myApp.message)}
        </div>`;
    }

    statusBox.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.9rem; color:var(--muted);">Current Status:</span>
        ${getStatusBadge(myApp.status)}
      </div>
      <div style="font-size:0.82rem; color:var(--muted);">Submitted on: ${formatDate(myApp.created_at)}</div>
      ${coverNoteHtml}
      ${feedbackHtml}
    `;

    if (["Pending", "Under Review"].includes(myApp.status)) {
      btnBox.innerHTML = `
        <button class="btn secondary full small" onclick="withdrawApplication()" style="margin-top:12px; color:var(--danger);">
          Withdraw Application
        </button>
      `;
    } else {
      btnBox.innerHTML = "";
    }
  } else {
    // User has not applied or withdrew
    if (ended) {
      statusBox.innerHTML = `<p class="muted" style="margin:0;">This challenge has concluded and submissions are closed.</p>`;
      btnBox.innerHTML = `<button class="btn full secondary" disabled>Submissions Closed</button>`;
    } else {
      statusBox.innerHTML = `
        <p class="muted" style="margin:0 0 10px; font-size:0.9rem;">
          Ready to participate? Submit your entry note or register your intent to compete before the deadline.
        </p>`;
      btnBox.innerHTML = `
        <button class="btn full" onclick="openApplyModal()">
          Apply for Challenge
        </button>
      `;
    }
  }
}

function renderReviewerBox(ch) {
  const reviewerBox = document.getElementById("reviewer-box");
  const applicantsList = document.getElementById("applicants-list");
  if (!reviewerBox || !applicantsList) return;

  const isReviewer = currentUser && (currentUser.role === "admin" || ch.organizer === currentUser.full_name);
  if (!isReviewer || !ch.participants_list || ch.participants_list.length === 0) {
    if (isReviewer && ch.participants_list && ch.participants_list.length === 0) {
      reviewerBox.classList.remove("hidden");
      applicantsList.innerHTML = `<p class="muted" style="font-size:0.85rem;">No applicants yet.</p>`;
    } else {
      reviewerBox.classList.add("hidden");
    }
    return;
  }

  reviewerBox.classList.remove("hidden");
  applicantsList.innerHTML = ch.participants_list.map(p => `
    <div class="card" style="padding:12px; border:1px solid var(--blue-border); font-size:0.88rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <a href="profile.html?id=${p.user.id}" class="row" style="font-weight:700; color:var(--ink);">
          ${avatar(p.user, "small")} ${esc(p.user.full_name)}
        </a>
        ${getStatusBadge(p.status)}
      </div>
      ${p.message ? `<p class="muted" style="margin:0 0 8px; font-size:0.83rem; background:var(--blue-pale); padding:6px 10px; border-radius:6px;"><strong>Note:</strong> ${esc(p.message)}</p>` : ""}
      ${p.decision_message ? `<p class="muted" style="margin:0 0 8px; font-size:0.83rem;"><strong>Feedback:</strong> ${esc(p.decision_message)}</p>` : ""}
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
        <select id="review-status-${p.application_id}" style="font-size:0.82rem; padding:4px 8px; width:auto; flex:1;">
          <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Under Review" ${p.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Accepted" ${p.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${p.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <button class="btn small" onclick="updateApplicantStatus(${p.application_id})">Update</button>
      </div>
    </div>
  `).join("");
}

async function updateApplicantStatus(applicationId) {
  const select = document.getElementById("review-status-" + applicationId);
  if (!select) return;
  const status = select.value;
  const decision_message = prompt(`Add an optional feedback or decision message for the student (Status: ${status}):`, "");
  if (decision_message === null) return; // user cancelled

  try {
    await api(`/api/challenges/${challengeId}/applications/${applicationId}/status`, {
      method: "PATCH",
      body: { status, decision_message }
    });
    toast(`Applicant status set to "${status}"`);
    loadChallengeDetails();
  } catch (err) {
    toast(err.message || "Failed to update status.");
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
    const res = await api(`/api/challenges/${challengeId}/apply`, {
      method: "POST",
      body: { message }
    });
    toast(res.message || "Application submitted successfully!");
    closeApplyModal();
    loadChallengeDetails();
  } catch (err) {
    showMessage("modal-error", err.message || "Failed to submit application.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit Application";
  }
});

async function withdrawApplication() {
  if (!confirm("Are you sure you want to withdraw your application for this challenge?")) return;
  try {
    const res = await api(`/api/challenges/${challengeId}/withdraw`, { method: "POST" });
    toast(res.message || "Application withdrawn.");
    loadChallengeDetails();
  } catch (err) {
    toast(err.message || "Failed to withdraw application.");
  }
}

// Edit Challenge Details Modal functions
function openEditModal(focusField = "") {
  if (!challengeData) return;
  hideMessage("edit-modal-error");

  document.getElementById("edit-title").value = challengeData.title || "";
  document.getElementById("edit-location").value = challengeData.location || "";

  // Format deadline for <input type="date">
  if (challengeData.deadline) {
    const d = new Date(challengeData.deadline);
    if (!isNaN(d.getTime())) {
      document.getElementById("edit-deadline").value = d.toISOString().split("T")[0];
    } else {
      document.getElementById("edit-deadline").value = "";
    }
  } else {
    document.getElementById("edit-deadline").value = "";
  }

  document.getElementById("edit-team-size").value = challengeData.team_size || "";
  document.getElementById("edit-mode").value = challengeData.mode || "Hybrid";
  document.getElementById("edit-category").value = challengeData.category || "";
  document.getElementById("edit-organizer").value = challengeData.organizer || "";
  document.getElementById("edit-description").value = challengeData.description || "";
  document.getElementById("edit-deliverables").value = challengeData.deliverables || "";
  document.getElementById("edit-submission-instructions").value = challengeData.submission_instructions || "";
  document.getElementById("edit-eligibility").value = challengeData.eligibility || "";
  document.getElementById("edit-evaluation-criteria").value = challengeData.evaluation_criteria || "";
  document.getElementById("edit-prizes").value = challengeData.prizes || "";
  document.getElementById("edit-contact-info").value = challengeData.contact_info || "";

  document.getElementById("edit-modal").classList.remove("hidden");

  if (focusField) {
    const fieldMap = {
      deadline: "edit-deadline",
      location: "edit-location",
      team_size: "edit-team-size",
      mode: "edit-mode",
      category: "edit-category",
      description: "edit-description",
      deliverables: "edit-deliverables"
    };
    const targetId = fieldMap[focusField] || `edit-${focusField}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } else {
    document.getElementById("edit-title").focus();
  }
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) modal.classList.add("hidden");
  hideMessage("edit-modal-error");
}

const closeEditX = document.getElementById("close-edit-modal-x");
if (closeEditX) closeEditX.addEventListener("click", closeEditModal);

const closeEditBtn = document.getElementById("close-edit-modal-btn");
if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);

const editForm = document.getElementById("edit-challenge-form");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage("edit-modal-error");
    const saveBtn = document.getElementById("save-challenge-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const body = {
      title: document.getElementById("edit-title").value.trim(),
      location: document.getElementById("edit-location").value.trim(),
      deadline: document.getElementById("edit-deadline").value,
      team_size: document.getElementById("edit-team-size").value.trim(),
      mode: document.getElementById("edit-mode").value,
      category: document.getElementById("edit-category").value.trim(),
      organizer: document.getElementById("edit-organizer").value.trim(),
      description: document.getElementById("edit-description").value.trim(),
      deliverables: document.getElementById("edit-deliverables").value.trim(),
      submission_instructions: document.getElementById("edit-submission-instructions").value.trim(),
      eligibility: document.getElementById("edit-eligibility").value.trim(),
      evaluation_criteria: document.getElementById("edit-evaluation-criteria").value.trim(),
      prizes: document.getElementById("edit-prizes").value.trim(),
      contact_info: document.getElementById("edit-contact-info").value.trim()
    };

    try {
      await api(`/api/challenges/${challengeId}`, {
        method: "PUT",
        body
      });
      toast("Challenge details updated successfully.");
      closeEditModal();
      loadChallengeDetails();
    } catch (err) {
      showMessage("edit-modal-error", err.message || "Failed to update challenge details.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });
}

(async function init() {
  await initPage("challenges.html");
  loadChallengeDetails();
})();

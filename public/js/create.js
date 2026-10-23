// Create page: uploads a new creation (Photo, Video, Audio, Document, or Link).

const mediaTypeConfig = {
  image: {
    label: "Choose Photo / Image (JPG, PNG, GIF, WEBP, max 15 MB)",
    accept: "image/*,.jpg,.jpeg,.png,.gif,.webp,*/*",
    maxSize: 15 * 1024 * 1024,
    maxSizeLabel: "15 MB",
    typeTitle: "Photo",
    requiresFile: true
  },
  video: {
    label: "Choose Video File (MP4, WebM, MOV, MKV, max 100 MB)",
    accept: "video/*,.mp4,.webm,.mov,.mkv,.ogv,.avi,*/*",
    maxSize: 100 * 1024 * 1024,
    maxSizeLabel: "100 MB",
    typeTitle: "Video",
    requiresFile: true
  },
  audio: {
    label: "Choose Audio File (MP3, WAV, OGG, M4A, AAC, max 30 MB)",
    accept: "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,*/*",
    maxSize: 30 * 1024 * 1024,
    maxSizeLabel: "30 MB",
    typeTitle: "Audio",
    requiresFile: true
  },
  document: {
    label: "Choose Document File (PDF, Word DOC/DOCX, TXT, PPT, XLS, max 25 MB)",
    accept: ".pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.zip,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,*/*",
    maxSize: 25 * 1024 * 1024,
    maxSizeLabel: "25 MB",
    typeTitle: "Document",
    requiresFile: true
  },
  link: {
    label: "Optional Cover Image / Thumbnail (Photo, max 15 MB)",
    accept: "image/*,.jpg,.jpeg,.png,.gif,.webp,*/*",
    maxSize: 15 * 1024 * 1024,
    maxSizeLabel: "15 MB",
    typeTitle: "Link",
    requiresFile: false
  }
};

let currentObjectUrl = null;

function ensureMediaTypeOptions() {
  const mediaTypeSelect = document.getElementById("media-type");
  if (!mediaTypeSelect) return;

  const requiredOptions = [
    { value: "image", label: "Photo / Image (JPG, PNG, GIF, WEBP)" },
    { value: "video", label: "Video (MP4, WebM, MOV, MKV)" },
    { value: "audio", label: "Audio (MP3, WAV, OGG, M4A)" },
    { value: "document", label: "Document (PDF, Word DOC/DOCX, TXT, PPT, XLS)" },
    { value: "link", label: "Link / URL (Website, Project, Portfolio)" }
  ];

  const currentValues = Array.from(mediaTypeSelect.options).map(o => o.value);
  requiredOptions.forEach(opt => {
    if (!currentValues.includes(opt.value)) {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      mediaTypeSelect.appendChild(el);
    }
  });
}

function updateMediaTypeUI() {
  ensureMediaTypeOptions();

  const typeSelect = document.getElementById("media-type");
  const type = typeSelect ? typeSelect.value : "image";
  const cfg = mediaTypeConfig[type] || mediaTypeConfig.image;
  const label = document.getElementById("file-label");
  const input = document.getElementById("image");
  const linkWrap = document.getElementById("link-field-wrap");

  if (linkWrap) {
    if (type === "link") {
      linkWrap.classList.remove("hidden");
    } else {
      linkWrap.classList.add("hidden");
    }
  }

  if (label) label.textContent = cfg.label;
  if (input) input.accept = cfg.accept;

  // If link mode and URL already typed, update preview
  if (type === "link") {
    handleLinkInput();
  } else {
    const previewLink = document.getElementById("preview-link");
    if (previewLink) previewLink.classList.add("hidden");
  }

  // Re-check preview if a file is already picked
  if (input && input.files && input.files[0]) {
    handleFileSelected(input.files[0]);
  }
}

function handleLinkInput() {
  const typeSelect = document.getElementById("media-type");
  if (!typeSelect || typeSelect.value !== "link") return;

  const urlInput = document.getElementById("link-url");
  const previewWrap = document.getElementById("preview-wrap");
  const previewLink = document.getElementById("preview-link");
  const domainEl = document.getElementById("preview-link-domain");
  const urlEl = document.getElementById("preview-link-url");
  const badgeEl = document.getElementById("preview-badge");
  const sizeEl = document.getElementById("preview-size");

  const val = urlInput ? urlInput.value.trim() : "";
  if (!val) {
    if (previewLink) previewLink.classList.add("hidden");
    const fileInput = document.getElementById("image");
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      if (previewWrap) previewWrap.classList.add("hidden");
    }
    return;
  }

  let formattedUrl = val;
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = "https://" + formattedUrl;
  }

  let domain = "";
  try {
    const parsed = new URL(formattedUrl);
    domain = parsed.hostname;
  } catch (e) {
    domain = val;
  }

  if (domainEl) domainEl.textContent = domain || "External Link";
  if (urlEl) urlEl.textContent = formattedUrl;
  if (badgeEl) badgeEl.textContent = "Link / URL";
  if (sizeEl) sizeEl.textContent = "Web Resource";

  if (previewWrap) previewWrap.classList.remove("hidden");
  if (previewLink) previewLink.classList.remove("hidden");
}

function handleFileSelected(file) {
  const previewWrap = document.getElementById("preview-wrap");
  const previewImg = document.getElementById("preview-img");
  const previewVideo = document.getElementById("preview-video");
  const previewAudio = document.getElementById("preview-audio");
  const previewDoc = document.getElementById("preview-doc");
  const previewBadge = document.getElementById("preview-badge");
  const previewSize = document.getElementById("preview-size");

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  if (previewImg) { previewImg.classList.add("hidden"); previewImg.src = ""; }
  if (previewVideo) { previewVideo.classList.add("hidden"); previewVideo.src = ""; }
  if (previewAudio) { previewAudio.classList.add("hidden"); previewAudio.src = ""; }
  if (previewDoc) { previewDoc.classList.add("hidden"); }

  if (!file) {
    const typeSelect = document.getElementById("media-type");
    if (!typeSelect || typeSelect.value !== "link") {
      if (previewWrap) previewWrap.classList.add("hidden");
    }
    return;
  }

  ensureMediaTypeOptions();

  const ext = file.name.split('.').pop().toLowerCase();
  const isVideo = file.type.startsWith("video/") || ['mp4', 'webm', 'mov', 'mkv', 'ogv', 'avi', 'm4v'].includes(ext);
  const isAudio = file.type.startsWith("audio/") || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
  const isDoc = file.type.startsWith("application/") || file.type.startsWith("text/") || ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'csv'].includes(ext);

  const typeSelect = document.getElementById("media-type");
  const currentSelectedType = typeSelect ? typeSelect.value : "image";

  let detectedType = "image";
  if (isVideo) detectedType = "video";
  else if (isAudio) detectedType = "audio";
  else if (isDoc) detectedType = "document";

  // If user explicitly chose link and uploaded an image cover, keep type as link
  let activeType = currentSelectedType;
  if (currentSelectedType !== "link") {
    activeType = detectedType;
    if (typeSelect) {
      typeSelect.value = activeType;
    }
  }

  const cfg = mediaTypeConfig[activeType] || mediaTypeConfig.image;
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (previewSize) previewSize.textContent = `${sizeMB} MB / max ${cfg.maxSizeLabel}`;

  if (file.size > cfg.maxSize) {
    showMessage("message", `The selected ${cfg.typeTitle.toLowerCase()} is ${sizeMB} MB, which exceeds the ${cfg.maxSizeLabel} limit. Please choose a smaller file.`);
    if (previewWrap && activeType !== "link") previewWrap.classList.add("hidden");
    return;
  } else {
    hideMessage("message");
  }

  currentObjectUrl = URL.createObjectURL(file);
  if (previewBadge && activeType !== "link") {
    previewBadge.textContent = `${cfg.typeTitle}: ${file.name}`;
  }
  if (previewWrap) previewWrap.classList.remove("hidden");

  if (activeType === "video" || (activeType !== "link" && detectedType === "video")) {
    if (previewVideo) {
      previewVideo.src = currentObjectUrl;
      previewVideo.classList.remove("hidden");
    }
  } else if (activeType === "audio" || (activeType !== "link" && detectedType === "audio")) {
    if (previewAudio) {
      previewAudio.src = currentObjectUrl;
      previewAudio.classList.remove("hidden");
    }
  } else if (activeType === "document" || (activeType !== "link" && detectedType === "document")) {
    if (previewDoc) {
      const docNameEl = document.getElementById("preview-doc-name");
      const docInfoEl = document.getElementById("preview-doc-info");
      const docIconEl = document.getElementById("preview-doc-icon");
      if (docNameEl) docNameEl.textContent = file.name;
      if (docInfoEl) docInfoEl.textContent = `${sizeMB} MB · ${ext.toUpperCase()}`;
      if (docIconEl) {
        docIconEl.textContent = ext.substring(0, 4).toUpperCase();
        if (ext === "pdf") {
          docIconEl.style.background = "#ef4444";
        } else if (ext === "doc" || ext === "docx") {
          docIconEl.style.background = "#2563eb";
        } else if (ext === "xls" || ext === "xlsx" || ext === "csv") {
          docIconEl.style.background = "#10b981";
        } else if (ext === "ppt" || ext === "pptx") {
          docIconEl.style.background = "#f59e0b";
        } else {
          docIconEl.style.background = "var(--blue-primary)";
        }
      }
      previewDoc.classList.remove("hidden");
    }
  } else {
    if (previewImg) {
      previewImg.src = currentObjectUrl;
      previewImg.classList.remove("hidden");
    }
  }
}

(async function start() {
  await initPage("");
  const categories = await api("/api/categories");
  const categorySelect = document.getElementById("category");
  if (categorySelect) {
    categorySelect.innerHTML = categories.map(c => `<option>${esc(c)}</option>`).join("");
  }

  ensureMediaTypeOptions();

  const mediaTypeSelect = document.getElementById("media-type");
  if (mediaTypeSelect) {
    mediaTypeSelect.addEventListener("change", updateMediaTypeUI);
  }

  const linkInput = document.getElementById("link-url");
  if (linkInput) {
    linkInput.addEventListener("input", handleLinkInput);
  }

  const fileInput = document.getElementById("image");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => handleFileSelected(e.target.files[0]));
  }
  updateMediaTypeUI();
})();

document.getElementById("create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("message");

  const title = document.getElementById("title").value.trim();
  const fileInput = document.getElementById("image");
  const file = fileInput ? fileInput.files[0] : null;
  const linkInput = document.getElementById("link-url");
  const linkUrl = linkInput ? linkInput.value.trim() : "";

  let selectedType = document.getElementById("media-type") ? document.getElementById("media-type").value : "image";

  // Auto-detect type if user selected a document, video, or audio file without changing the dropdown
  if (file && selectedType !== "link") {
    const ext = file.name.split('.').pop().toLowerCase();
    const isVideo = file.type.startsWith("video/") || ['mp4', 'webm', 'mov', 'mkv', 'ogv', 'avi', 'm4v'].includes(ext);
    const isAudio = file.type.startsWith("audio/") || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
    const isDoc = file.type.startsWith("application/") || file.type.startsWith("text/") || ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'csv'].includes(ext);
    if (isDoc) selectedType = "document";
    else if (isVideo) selectedType = "video";
    else if (isAudio) selectedType = "audio";
  }

  const cfg = mediaTypeConfig[selectedType] || mediaTypeConfig.image;

  if (!title) return showMessage("message", "Please enter a title.");

  if (selectedType === "link") {
    if (!linkUrl) {
      return showMessage("message", "Please enter a valid link / URL for your project or resource.");
    }
    let formattedUrl = linkUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }
    try {
      new URL(formattedUrl);
    } catch (e) {
      return showMessage("message", "Please enter a valid URL (e.g. https://example.com).");
    }
  } else {
    if (!file) {
      return showMessage("message", `Please choose a ${cfg.typeTitle.toLowerCase()} file to upload.`);
    }
  }

  if (file && file.size > cfg.maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return showMessage("message", `File is too large (${sizeMB} MB). Maximum size for ${cfg.typeTitle.toLowerCase()} is ${cfg.maxSizeLabel}.`);
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", document.getElementById("description").value);
  formData.append("category", document.getElementById("category").value);
  formData.append("media_type", selectedType);

  if (selectedType === "link") {
    formData.append("link_url", linkUrl);
  }

  if (file) {
    formData.append("image", file);
  }

  const button = document.getElementById("submit-btn");
  const originalText = button.textContent;
  button.disabled = true;

  if (file) {
    button.textContent = `Uploading ${cfg.typeTitle} (${(file.size / (1024 * 1024)).toFixed(1)} MB)... Please wait`;
  } else {
    button.textContent = "Publishing... Please wait";
  }

  try {
    await api("/api/creations", { method: "POST", body: formData });
    window.location.href = "home.html";
  } catch (error) {
    showMessage("message", error.message);
    button.disabled = false;
    button.textContent = originalText;
  }
});

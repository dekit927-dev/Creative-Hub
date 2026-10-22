// Create page: uploads a new creation (Photo, Video, or Audio).

const mediaTypeConfig = {
  image: {
    label: "Choose Photo / Image (JPG, PNG, GIF, WEBP, max 15 MB)",
    accept: "image/png,image/jpeg,image/gif,image/webp,image/*",
    maxSize: 15 * 1024 * 1024,
    maxSizeLabel: "15 MB",
    typeTitle: "Photo"
  },
  video: {
    label: "Choose Video File (MP4, WebM, MOV, MKV, max 100 MB)",
    accept: "video/mp4,video/webm,video/quicktime,video/*,.mkv",
    maxSize: 100 * 1024 * 1024,
    maxSizeLabel: "100 MB",
    typeTitle: "Video"
  },
  audio: {
    label: "Choose Audio File (MP3, WAV, OGG, M4A, AAC, max 30 MB)",
    accept: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/*",
    maxSize: 30 * 1024 * 1024,
    maxSizeLabel: "30 MB",
    typeTitle: "Audio"
  }
};

let currentObjectUrl = null;

function updateMediaTypeUI() {
  const typeSelect = document.getElementById("media-type");
  const type = typeSelect ? typeSelect.value : "image";
  const cfg = mediaTypeConfig[type] || mediaTypeConfig.image;
  const label = document.getElementById("file-label");
  const input = document.getElementById("image");

  if (label) label.textContent = cfg.label;
  if (input) input.accept = cfg.accept;

  // Re-check preview if a file is already picked
  if (input && input.files && input.files[0]) {
    handleFileSelected(input.files[0]);
  }
}

function handleFileSelected(file) {
  const previewWrap = document.getElementById("preview-wrap");
  const previewImg = document.getElementById("preview-img");
  const previewVideo = document.getElementById("preview-video");
  const previewAudio = document.getElementById("preview-audio");
  const previewBadge = document.getElementById("preview-badge");
  const previewSize = document.getElementById("preview-size");

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  if (previewImg) { previewImg.classList.add("hidden"); previewImg.src = ""; }
  if (previewVideo) { previewVideo.classList.add("hidden"); previewVideo.src = ""; }
  if (previewAudio) { previewAudio.classList.add("hidden"); previewAudio.src = ""; }

  if (!file) {
    if (previewWrap) previewWrap.classList.add("hidden");
    return;
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const isVideo = file.type.startsWith("video/") || ['mp4', 'webm', 'mov', 'mkv', 'ogv', 'avi', 'm4v'].includes(ext);
  const isAudio = file.type.startsWith("audio/") || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);

  let detectedType = "image";
  if (isVideo) detectedType = "video";
  else if (isAudio) detectedType = "audio";

  const typeSelect = document.getElementById("media-type");
  if (typeSelect) typeSelect.value = detectedType;

  const cfg = mediaTypeConfig[detectedType] || mediaTypeConfig.image;
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (previewSize) previewSize.textContent = `${sizeMB} MB / max ${cfg.maxSizeLabel}`;

  if (file.size > cfg.maxSize) {
    showMessage("message", `The selected ${cfg.typeTitle.toLowerCase()} is ${sizeMB} MB, which exceeds the ${cfg.maxSizeLabel} limit. Please choose a smaller file.`);
    if (previewWrap) previewWrap.classList.add("hidden");
    return;
  } else {
    hideMessage("message");
  }

  currentObjectUrl = URL.createObjectURL(file);
  if (previewBadge) previewBadge.textContent = `${cfg.typeTitle}: ${file.name}`;
  if (previewWrap) previewWrap.classList.remove("hidden");

  if (detectedType === "video") {
    if (previewVideo) {
      previewVideo.src = currentObjectUrl;
      previewVideo.classList.remove("hidden");
    }
  } else if (detectedType === "audio") {
    if (previewAudio) {
      previewAudio.src = currentObjectUrl;
      previewAudio.classList.remove("hidden");
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

  const mediaTypeSelect = document.getElementById("media-type");
  if (mediaTypeSelect) {
    mediaTypeSelect.addEventListener("change", updateMediaTypeUI);
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
  const file = document.getElementById("image").files[0];
  const selectedType = document.getElementById("media-type").value;
  const cfg = mediaTypeConfig[selectedType] || mediaTypeConfig.image;

  if (!title) return showMessage("message", "Please enter a title.");
  if (!file) return showMessage("message", `Please choose a ${cfg.typeTitle.toLowerCase()} file to upload.`);

  if (file.size > cfg.maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return showMessage("message", `File is too large (${sizeMB} MB). Maximum size for ${cfg.typeTitle.toLowerCase()} is ${cfg.maxSizeLabel}.`);
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", document.getElementById("description").value);
  formData.append("category", document.getElementById("category").value);
  formData.append("image", file);

  const button = document.getElementById("submit-btn");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = `Uploading ${cfg.typeTitle} (${(file.size / (1024 * 1024)).toFixed(1)} MB)... Please wait`;

  try {
    await api("/api/creations", { method: "POST", body: formData });
    window.location.href = "home.html";
  } catch (error) {
    showMessage("message", error.message);
    button.disabled = false;
    button.textContent = originalText;
  }
});

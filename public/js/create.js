// Create page: uploads a new creation.
(async function start() {
  await initPage("");
  const categories = await api("/api/categories");
  document.getElementById("category").innerHTML = categories.map(c => `<option>${esc(c)}</option>`).join("");
})();

document.getElementById("image").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const preview = document.getElementById("preview");
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
});

document.getElementById("create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("message");
  const title = document.getElementById("title").value.trim();
  const file = document.getElementById("image").files[0];
  if (!title) return showMessage("message", "Please enter a title.");
  if (!file) return showMessage("message", "Please choose an image.");

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", document.getElementById("description").value);
  formData.append("category", document.getElementById("category").value);
  formData.append("image", file);

  const button = document.getElementById("submit-btn");
  button.disabled = true;
  try {
    await api("/api/creations", { method: "POST", body: formData });
    window.location.href = "home.html";
  } catch (error) {
    showMessage("message", error.message);
    button.disabled = false;
  }
});

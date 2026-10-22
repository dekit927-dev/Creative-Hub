// Settings page: account, password, dark/light theme, notifications, logout.

function updateThemeUI(activeChoice) {
  const resolvedTheme = activeChoice === "system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : activeChoice;

  // Update card active classes
  document.querySelectorAll(".theme-card").forEach(card => {
    const isSelected = card.dataset.themeChoice === activeChoice;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  // Update quick toggle buttons
  const btnLight = document.getElementById("btn-toggle-light");
  const btnDark = document.getElementById("btn-toggle-dark");
  if (btnLight && btnDark) {
    btnLight.classList.toggle("active", resolvedTheme === "light");
    btnDark.classList.toggle("active", resolvedTheme === "dark");
  }

  // Update status badge
  const statusText = document.getElementById("theme-status-text");
  if (statusText) {
    if (activeChoice === "system") {
      statusText.textContent = `System (${resolvedTheme === "dark" ? "Dark" : "Light"})`;
    } else if (activeChoice === "dark") {
      statusText.textContent = "Dark Mode 🌙";
    } else {
      statusText.textContent = "Light Mode ☀️";
    }
  }
}

function applyThemeSetting(choice, announce = true) {
  localStorage.setItem("theme", choice);
  const resolved = choice === "system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : choice;

  document.documentElement.dataset.theme = resolved;
  updateThemeUI(choice);

  if (announce) {
    if (choice === "system") toast(`Theme set to System Default (${resolved === "dark" ? "Dark" : "Light"}) 💻`);
    else if (choice === "dark") toast("Switched to Dark Mode 🌙");
    else toast("Switched to Light Mode ☀️");
  }
}

(async function start() {
  await initPage("");
  document.getElementById("s-name").value = currentUser.full_name;
  document.getElementById("s-username").value = currentUser.username;
  document.getElementById("s-email").value = currentUser.email;
  document.getElementById("notif-toggle").checked = currentUser.notifications_enabled;

  const currentTheme = localStorage.getItem("theme") || "light";
  updateThemeUI(currentTheme);

  // Setup theme card click listeners
  document.querySelectorAll(".theme-card").forEach(card => {
    const choice = card.dataset.themeChoice;
    card.addEventListener("click", () => applyThemeSetting(choice, true));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        applyThemeSetting(choice, true);
      }
    });
  });

  // Setup quick switch buttons
  const btnLight = document.getElementById("btn-toggle-light");
  if (btnLight) btnLight.addEventListener("click", () => applyThemeSetting("light", true));

  const btnDark = document.getElementById("btn-toggle-dark");
  if (btnDark) btnDark.addEventListener("click", () => applyThemeSetting("dark", true));

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (localStorage.getItem("theme") === "system") {
        updateThemeUI("system");
      }
    });
  }
})();

document.getElementById("account-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("account-message");
  const body = {
    full_name: document.getElementById("s-name").value.trim(),
    username: document.getElementById("s-username").value.trim(),
    email: document.getElementById("s-email").value.trim(),
  };
  if (!body.full_name || !body.username || !body.email) return showMessage("account-message", "Please fill in all fields.");
  try {
    currentUser = await api("/api/settings/account", { method: "PUT", body });
    renderNavbar("");
    showMessage("account-message", "Account updated.", "success");
  } catch (error) { showMessage("account-message", error.message); }
});

document.getElementById("password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage("password-message");
  const body = {
    current_password: document.getElementById("p-current").value,
    new_password: document.getElementById("p-new").value,
    confirm_password: document.getElementById("p-confirm").value,
  };
  if (!body.current_password || !body.new_password) return showMessage("password-message", "Please fill in all fields.");
  try {
    await api("/api/settings/password", { method: "PUT", body });
    event.target.reset();
    showMessage("password-message", "Password changed.", "success");
  } catch (error) { showMessage("password-message", error.message); }
});

document.getElementById("notif-toggle").addEventListener("change", async (event) => {
  try {
    await api("/api/settings/notifications", { method: "PUT", body: { enabled: event.target.checked } });
    toast(event.target.checked ? "Notifications turned on" : "Notifications turned off");
  } catch (error) {
    event.target.checked = !event.target.checked;
    toast(error.message);
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

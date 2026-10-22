// Login and Register pages.
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (localStorage.getItem("token") && loginForm) window.location.href = "home.html";

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage("message");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return showMessage("message", "Please enter your email and password.");
    try {
      const result = await api("/api/login", { method: "POST", body: { email, password } });
      localStorage.setItem("token", result.token);
      window.location.href = "home.html";
    } catch (error) {
      showMessage("message", error.message);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage("message");
    const body = {
      full_name: document.getElementById("full_name").value.trim(),
      username: document.getElementById("username").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      confirm_password: document.getElementById("confirm_password").value,
    };
    if (!body.full_name || !body.username || !body.email || !body.password) {
      return showMessage("message", "Please fill in all fields.");
    }
    if (body.password !== body.confirm_password) return showMessage("message", "Passwords do not match.");
    try {
      await api("/api/register", { method: "POST", body });
      window.location.href = "login.html";
    } catch (error) {
      showMessage("message", error.message);
    }
  });
}

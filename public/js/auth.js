// Login and Register pages.
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (localStorage.getItem("token") && loginForm) window.location.href = "home.html";

// Check if redirected with status
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("verified") === "true") {
  showMessage("message", "Your email has been verified successfully! You can now log in.", "info");
} else if (urlParams.get("registered") === "true") {
  const emailParam = urlParams.get("email");
  if (emailParam && document.getElementById("email")) {
    document.getElementById("email").value = emailParam;
  }
  showMessage("message", "Account created successfully! We sent a verification link to your email. Please verify before logging in.", "info");
  const unverifiedBox = document.getElementById("unverified-box");
  if (unverifiedBox) unverifiedBox.classList.remove("hidden");
} else if (urlParams.get("reset") === "true") {
  showMessage("message", "Password has been reset successfully. Please log in with your new password.", "info");
}

let lastUnverifiedEmail = urlParams.get("email") || "";

if (loginForm) {
  const unverifiedBox = document.getElementById("unverified-box");
  const resendBtn = document.getElementById("login-resend-btn");

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      const email = (document.getElementById("email") ? document.getElementById("email").value.trim() : "") || lastUnverifiedEmail;
      if (!email) {
        showMessage("message", "Please enter your email address to receive a verification link.");
        return;
      }
      resendBtn.disabled = true;
      const originalText = resendBtn.textContent;
      resendBtn.textContent = "Sending...";
      try {
        const res = await api("/api/resend-verification", { method: "POST", body: { email } });
        toast(res.message || "Verification link sent to your email!");
        showMessage("message", res.message || "Verification link sent! Check your inbox.", "info");
      } catch (err) {
        showMessage("message", err.message || "Failed to resend verification email.");
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = originalText;
      }
    });
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage("message");
    if (unverifiedBox) unverifiedBox.classList.add("hidden");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return showMessage("message", "Please enter your email and password.");

    const submitBtn = loginForm.querySelector("button[type='submit']") || document.getElementById("submit-btn");
    const originalText = submitBtn ? submitBtn.innerHTML : "Log in";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Logging in...";
    }

    try {
      const result = await api("/api/login", { method: "POST", body: { email, password } });
      localStorage.setItem("token", result.token);
      window.location.href = "home.html";
    } catch (error) {
      showMessage("message", error.message);
      if (error.unverified) {
        lastUnverifiedEmail = error.email || email;
        if (unverifiedBox) unverifiedBox.classList.remove("hidden");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
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
    if (body.password.length < 6) return showMessage("message", "Password must be at least 6 characters.");

    const submitBtn = registerForm.querySelector("button[type='submit']") || document.getElementById("submit-btn");
    const originalText = submitBtn ? submitBtn.innerHTML : "Register";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Creating account...";
    }

    try {
      const result = await api("/api/register", { method: "POST", body });
      if (result && result.token) {
        localStorage.setItem("token", result.token);
        window.location.href = "home.html";
      } else {
        window.location.href = `login.html?registered=true&email=${encodeURIComponent(body.email)}`;
      }
    } catch (error) {
      let msg = error.message;
      if (msg && msg.toLowerCase().includes("already exists")) {
        msg = `An account with that email already exists. <a href="login.html?email=${encodeURIComponent(body.email)}" style="color:var(--blue-primary,#2563EB); font-weight:700; text-decoration:underline;">Click here to Log In</a>`;
      }
      showMessage("message", msg);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  });
}

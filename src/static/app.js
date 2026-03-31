document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");
  const authForms = document.getElementById("auth-forms");
  const signupAuthNote = document.getElementById("signup-auth-note");

  let currentUserEmail = null;

  function renderMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const authenticated = Boolean(currentUserEmail);
    signupForm.classList.toggle("hidden", !authenticated);
    signupAuthNote.classList.toggle("hidden", authenticated);
    logoutBtn.classList.toggle("hidden", !authenticated);
    authForms.classList.toggle("hidden", authenticated);

    if (authenticated) {
      authStatus.textContent = `Logged in as ${currentUserEmail}`;
      authStatus.className = "success";
      authStatus.classList.remove("hidden");
    } else {
      authStatus.textContent = "Not logged in";
      authStatus.className = "info";
      authStatus.classList.remove("hidden");
    }
  }

  async function fetchCurrentUser() {
    try {
      const response = await fetch("/auth/me");
      const result = await response.json();
      currentUserEmail = result.authenticated ? result.email : null;
      updateAuthUI();
    } catch (error) {
      currentUserEmail = null;
      updateAuthUI();
      console.error("Error fetching current user:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentUserEmail && currentUserEmail === email
                          ? `<button class="delete-btn" data-activity="${name}">Unregister</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        renderMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        renderMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      renderMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        renderMessage("Registration successful. You can now log in.", "success");
        registerForm.reset();
      } else {
        renderMessage(result.detail || "Registration failed.", "error");
      }
    } catch (error) {
      renderMessage("Failed to register. Please try again.", "error");
      console.error("Error registering:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        currentUserEmail = result.email;
        updateAuthUI();
        renderMessage(result.message, "success");
        loginForm.reset();
        fetchActivities();
      } else {
        renderMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      renderMessage("Failed to login. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
      });
      const result = await response.json();

      if (response.ok) {
        currentUserEmail = null;
        updateAuthUI();
        renderMessage(result.message, "success");
        fetchActivities();
      } else {
        renderMessage(result.detail || "Logout failed.", "error");
      }
    } catch (error) {
      renderMessage("Failed to logout. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        renderMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        renderMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      renderMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchCurrentUser();
  fetchActivities();
});

function showRegister() {
  localStorage.setItem("authView", "register");
  document.getElementById("login-form").classList.remove("active");
  document.getElementById("register-form").classList.add("active");
}

function showLogin() {
  localStorage.setItem("authView", "login");
  document.getElementById("register-form").classList.remove("active");
  document.getElementById("login-form").classList.add("active");
}

function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (email === "" || password === "") {
        alert("Email and Password are required!");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }

    if (!validatePassword(password)) {
        return; 
    }

    fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(async res => {
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        // 1. Store User Identity
        localStorage.setItem("userEmail", data.user_email);
        localStorage.setItem("firstName", data.firstname);
        localStorage.setItem("lastName", data.lastname);
        
        // Save names for the Dashboard Header
        if (data.firstname && data.lastname) {
            localStorage.setItem("firstName", data.firstname);
            localStorage.setItem("lastName", data.lastname);
        }

        // 2. MODIFICATION: Hydrate LocalStorage with Cloud Data
        // This ensures habits, progress, and notes follow the user to any device
        if (data.cloudData) {
            if (data.cloudData.habits) {
                localStorage.setItem("habits", JSON.stringify(data.cloudData.habits));
            }
            if (data.cloudData.progressData) {
                localStorage.setItem("progressData", JSON.stringify(data.cloudData.progressData));
            }
            if (data.cloudData.dailyNotes) {
                localStorage.setItem("dailyNotes", JSON.stringify(data.cloudData.dailyNotes));
            }
        }

        // Redirect to dashboard
        window.location.href = "../dashboard/index.html";
    })
    .catch(() => alert("Server error"));
}
function register() {
   console.log("Register clicked");

  const firstname = document.getElementById("register-first-name").value.trim();
  const lastname  = document.getElementById("register-last-name").value.trim();
  const bday      = document.getElementById("register-date-of-birth").value;
  const phnum     = document.getElementById("register-number").value.trim();
  const email     = document.getElementById("register-email").value.trim();
  const password  = document.getElementById("register-password").value.trim();

  // 1️⃣ Basic empty check
  if (!firstname || !lastname || !bday || !phnum || !email || !password) {
    alert("All fields are required!");
    return;
  }

  // 2️⃣ Phone validation
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phnum)) {
    alert("Please enter a valid 10-digit phone number!");
    return;
  }

  // 3️⃣ Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address!");
    return;
  }

  // 4️⃣ Password validation (your separate rules)
  if (!validatePassword(password)) {
    return;
  }

  fetch("http://127.0.0.1:5000/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstname,
      lastname,
      bday,
      phnum,
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.message === "Registration successful") {
      showLogin();
    }
  })
  .catch(() => alert("Server error"));

  
  
  
  // showLogin(); // switch to login form
}


function validatePassword(password) {

  if (password.length < 8) {
    alert("Password must be at least 8 characters long");
    return false;
  }

  if (!/[A-Z]/.test(password)) {
    alert("Password must contain at least one uppercase letter");
    return false;
  }

  if (!/[a-z]/.test(password)) {
    alert("Password must contain at least one lowercase letter");
    return false;
  }

  if (!/\d/.test(password)) {
    alert("Password must contain at least one number");
    return false;
  }

  if (!/[@$!%*?&]/.test(password)) {
    alert("Password must contain at least one special character (@ $ ! % * ? &)");
    return false;
  }

  return true; // password is valid
}

document.addEventListener("DOMContentLoaded", () => {
  const view = localStorage.getItem("authView");
  if (view === "register") {
    showRegister();
  } else {
    showLogin();
  }
});



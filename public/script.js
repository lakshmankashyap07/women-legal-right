// 🌐 Backend URL - Automatically switch between localhost and production URL
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
  ? "http://localhost:5000"
  : ""; // Empty string means use relative path (same domain as frontend)

// 🔹 Section switching (Login / Signup / Forgot / Dashboard)
function showSection(sectionId) {
  // Hide all auth form sections
  document.querySelectorAll(".auth-form-section").forEach(div => {
    div.style.display = "none";
  });
  
  const dashboard = document.querySelector(".dashboard-layout");
  const authContainer = document.getElementById("authContainer");

  if (sectionId === "chatPage") {
    if (authContainer) authContainer.style.display = "none";
    if (dashboard) dashboard.style.display = "flex";
    loadChatHistory();
  } else {
    if (dashboard) dashboard.style.display = "none";
    if (authContainer) authContainer.style.display = "flex";
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "block";
  }
}

// ============================
// 🔹 LOGIN
// ============================
async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("⚠️ Please fill all fields!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.message === "Login successful") {
        // Store user data in localStorage and ProfileService
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', data.user?.name || 'User');
        localStorage.setItem('userId', data.user?.id || '');
        localStorage.setItem('userRole', data.user?.role || 'user');
        localStorage.setItem('userLastLogin', data.user?.lastLogin || '');
        localStorage.setItem('userCreatedAt', data.user?.createdAt || '');
        
        // 🔹 Sync user data (Profile & Chat) from server
        await syncUserData(email);

        // Also save to ProfileService if available
        if (typeof ProfileService !== 'undefined') {
          const profile = ProfileService.load();
          profile.email = email;
          profile.firstName = data.user?.name?.split(' ')[0] || 'User';
          ProfileService.save(profile);
        }
        
        alert("✅ Login successful!");
        showSection("chatPage");
      } else {
        alert(data.error || "❌ Login failed!");
      }
    } catch (e) {
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("⚠️ Server error while login");
    alert(`⚠️ Server error while login: ${err.message}`);
  }
}

// ============================
// 🔹 SIGNUP
// ============================
async function signup() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!name || !email || !password) {
    alert("⚠️ Please fill all fields!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.message) {
        alert("🎉 Signup successful! You can now login.");
        showSection("loginPage");
      } else {
        alert(data.error || "Signup failed!");
      }
    } catch (e) {
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("⚠️ Server error while signup");
    alert(`⚠️ Server error while signup: ${err.message}`);
  }
}

// ============================
// 🔹 FORGOT PASSWORD
// ============================
async function forgotPassword() {
  const email = document.getElementById("forgotEmail").value.trim();

  if (!email) {
    alert("⚠️ Please enter your email!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      alert(data.message || data.error);
      if (data.message) {
        // Store email to use in the next step
        localStorage.setItem('resetEmail', email);
        showSection("resetPage");
      }
    } catch (e) {
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    alert("⚠️ Server error while password reset");
    alert(`⚠️ Server error while password reset: ${err.message}`);
  }
}

// ============================
// 🔹 RESEND OTP
// ============================
async function resendOTP() {
  const email = localStorage.getItem('resetEmail');
  if (!email) {
    alert("⚠️ No email found. Please start the process again.");
    showSection("forgotPage");
    return;
  }

  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = "Sending...";
  btn.style.pointerEvents = "none";

  // Reuse forgotPassword logic but keep user on reset page
  document.getElementById("forgotEmail").value = email;
  await forgotPassword();
  
  btn.textContent = "OTP Resent!";
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.pointerEvents = "auto";
  }, 3000);
}

// ============================
// 🔹 GUEST LOGIN
// ============================
function continueAsGuest() {
  localStorage.setItem('userEmail', 'guest@example.com');
  localStorage.setItem('userName', 'Guest User');
  localStorage.setItem('userRole', 'guest');
  alert("👋 Welcome! You are continuing as a Guest.");
  showSection("chatPage");
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const type = field.getAttribute('type') === 'password' ? 'text' : 'password';
  field.setAttribute('type', type);
}

// ============================
// 🔹 RESET PASSWORD (New)
// ============================
async function handleResetPassword() {
  const email = localStorage.getItem('resetEmail');
  const token = document.getElementById("resetOtp").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const confirmPassword = document.getElementById("resetConfirmPassword").value.trim();

  if (!token || !newPassword || !confirmPassword) {
    alert("⚠️ Please fill all fields!");
    return;
  }
  if (newPassword !== confirmPassword) {
    alert("⚠️ Passwords do not match!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword })
    });

    const data = await res.json();
    alert(data.message || data.error);
    if (data.message) {
      localStorage.removeItem('resetEmail');
      showSection("loginPage");
    }
  } catch (err) {
    console.error("Reset password error:", err);
    alert("⚠️ Server error while resetting password");
    alert(`⚠️ Server error while resetting password: ${err.message}`);
  }
}

// ============================
// 🔹 Helper function to check if user is near bottom
// ============================
function isNearBottom(chatBox) {
  return chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 50; // 50px threshold
}

// ============================
// 🔹 AI Chatbot
// ============================
async function sendMessage() {
  const input = document.getElementById("userInput").value.trim();
  if (!input) return;

  const chatBox = document.getElementById("chatBox");

  // 🧍 User message
  const userDiv = document.createElement("div");
  userDiv.className = "user";
  userDiv.textContent = input;
  chatBox.appendChild(userDiv);
  saveChatToStorage('user', input);

  // 🤖 Bot reply (temporary loading message)
  const botDiv = document.createElement("div");
  botDiv.className = "bot";
  botDiv.textContent = "Thinking...";
  chatBox.appendChild(botDiv);

  // Always auto-scroll to the latest message
  botDiv.scrollIntoView({ behavior: 'smooth' });
  document.getElementById("userInput").value = "";

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    const data = await res.json();
    botDiv.textContent = data.reply || "Sorry, I couldn’t understand.";
    saveChatToStorage('bot', botDiv.textContent);
  } catch (err) {
    console.error("Chatbot error:", err);
    botDiv.textContent = "⚠️ Server error while getting AI reply.";
    saveChatToStorage('bot', botDiv.textContent);
  }

  // Always auto-scroll to the latest message
  botDiv.scrollIntoView({ behavior: 'smooth' });
}

// 🔹 Press Enter to send message (guarded for pages without chat input)
const topUserInput = document.getElementById("userInput");
if (topUserInput) {
  topUserInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });
}

// ============================
// 🔹 Audio Recording
// ============================
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
  const recordBtn = document.getElementById("recordBtn");

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      recordBtn.textContent = "⏹️ Stop";
      recordBtn.style.background = "#ff0000";
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("⚠️ Could not access microphone. Please check permissions.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = "🎤 Record";
    recordBtn.style.background = "#ffd700";
  }
}

async function sendAudio(audioBlob) {
  const chatBox = document.getElementById("chatBox");

  // 🧍 User message
  const userDiv = document.createElement("div");
  userDiv.className = "user";
  userDiv.textContent = "🎤 Audio message sent";
  chatBox.appendChild(userDiv);
  saveChatToStorage('user', userDiv.textContent);

  // 🤖 Bot reply (temporary loading message)
  const botDiv = document.createElement("div");
  botDiv.className = "bot";
  botDiv.textContent = "Processing audio...";
  chatBox.appendChild(botDiv);

  // Always auto-scroll to the latest message
  botDiv.scrollIntoView({ behavior: 'smooth' });

  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    botDiv.textContent = data.reply || "Sorry, I couldn’t process the audio.";
    saveChatToStorage('bot', botDiv.textContent);
  } catch (err) {
    console.error("Audio send error:", err);
    botDiv.textContent = "⚠️ Server error while processing audio.";
    saveChatToStorage('bot', botDiv.textContent);
  }

  // Always auto-scroll to the latest message
  botDiv.scrollIntoView({ behavior: 'smooth' });
}

// ============================
// 🔹 Voice Typing (Speech-to-Text)
// ============================
let recognition;
let isListening = false;
let originalInputValue = '';
let silenceTimer;

function toggleVoiceTyping() {
  const voiceBtn = document.getElementById("voiceBtn");
  const userInput = document.getElementById("userInput");

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("⚠️ Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    return;
  }

  if (!recognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true; // Allow continuous speech for longer statements
    recognition.interimResults = true; // Show interim results for real-time feedback
    recognition.lang = 'en-US'; // You can change this to other languages if needed

    recognition.onstart = () => {
      isListening = true;
      originalInputValue = userInput.value; // Store original input
      voiceBtn.textContent = "🎤 Listening...";
      voiceBtn.style.background = "#ff0000";
      startSilenceTimer(); // Start timer to detect silence
    };

    recognition.onresult = (event) => {
      resetSilenceTimer(); // Reset timer on speech detection

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update input with original value + final transcript + interim (grayed out)
      userInput.value = originalInputValue + (originalInputValue ? ' ' : '') + finalTranscript + interimTranscript;
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.textContent = "🎤 Voice";
      voiceBtn.style.background = "";
      clearTimeout(silenceTimer); // Clear timer
      // Keep the final transcript in the input
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert("⚠️ Speech recognition error: " + event.error);
      isListening = false;
      voiceBtn.textContent = "🎤 Voice";
      voiceBtn.style.background = "";
      clearTimeout(silenceTimer);
    };
  }

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function startSilenceTimer() {
  clearTimeout(silenceTimer); // Clear any existing timer
  silenceTimer = setTimeout(() => {
    if (isListening) {
      recognition.stop(); // Stop recognition after 2 seconds of silence
    }
  }, 2000); // 2 seconds of silence
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isListening) {
      recognition.stop(); // Stop recognition after 2 seconds of silence
    }
  }, 2000);
}

// ============================
// 🔹 File Upload
// ============================
// fileInput may not exist on all pages; guard
const fileInputEl = document.getElementById("fileInput");
if (fileInputEl) {
  fileInputEl.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      sendFile(file);
    }
  });
}

async function sendFile(file) {
  const chatBox = document.getElementById("chatBox");

  // 🧍 User message
  const userDiv = document.createElement("div");
  userDiv.className = "user";
  userDiv.textContent = `📎 File uploaded: ${file.name}`;
  chatBox.appendChild(userDiv);
  saveChatToStorage('user', userDiv.textContent);

  // 🤖 Bot reply (temporary loading message)
  const botDiv = document.createElement("div");
  botDiv.className = "bot";
  botDiv.textContent = "Processing file...";
  chatBox.appendChild(botDiv);

  if (isNearBottom(chatBox)) {
    botDiv.scrollIntoView({ behavior: 'smooth' });
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    botDiv.textContent = data.reply || "Sorry, I couldn’t process the file.";
    saveChatToStorage('bot', botDiv.textContent);
  } catch (err) {
    console.error("File send error:", err);
    botDiv.textContent = "⚠️ Server error while processing file.";
    saveChatToStorage('bot', botDiv.textContent);
  }

  if (isNearBottom(chatBox)) {
    botDiv.scrollIntoView({ behavior: 'smooth' });
  }
}

// ============================
// 🔹 Profile Modal (localStorage)
// ============================
function getProfile() {
  try { return JSON.parse(localStorage.getItem('wlr_profile') || '{}'); } catch(e) { return {}; }
}

function saveProfileToStorage(profile) {
  try {
    localStorage.setItem('wlr_profile', JSON.stringify(profile));
    const email = localStorage.getItem('userEmail');
    if (email) {
      localStorage.setItem(`wlr_profile_${email}`, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn("LocalStorage full or error:", e);
  }
}

// 🔹 Sync Profile & Chat from Server
async function syncUserData(email) {
  try {
    // 1. Fetch Profile
    const profileRes = await fetch(`${API_URL}/get-profile?email=${encodeURIComponent(email)}`);
    if (profileRes.ok) {
      const fullProfile = await profileRes.json();
      if (fullProfile && Object.keys(fullProfile).length > 0) {
        try {
          // Store the entire fetched profile object. This is now the single source of truth.
          localStorage.setItem('wlr_profile', JSON.stringify(fullProfile));
          localStorage.setItem(`wlr_profile_${email}`, JSON.stringify(fullProfile));

          // Also update individual legacy items for broader compatibility
          if (fullProfile.fullName) localStorage.setItem('userName', fullProfile.fullName);
          if (fullProfile.createdAt) localStorage.setItem('userCreatedAt', fullProfile.createdAt);
          if (fullProfile.lastLogin) localStorage.setItem('userLastLogin', fullProfile.lastLogin);
          
        } catch (e) { console.warn("Sync storage error:", e); }
        updateProfileUI();
      }
    }
    // 2. Fetch Chat History
    const chatRes = await fetch(`${API_URL}/get-chat-history?email=${encodeURIComponent(email)}`);
    if (chatRes.ok) {
      const history = await chatRes.json();
      if (Array.isArray(history) && history.length > 0) {
        localStorage.setItem(`chatHistory_${email}`, JSON.stringify(history));
        if (document.getElementById('chatBox')) loadChatHistory();
      }
    }
  } catch (e) {
    console.warn("Sync data error (backend may not support persistence yet):", e);
  }
}

async function updateProfileOnServer(profile) {
  const email = localStorage.getItem('userEmail');
  if (!email) return;
  try {
    await fetch(`${API_URL}/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, profile })
    });
  } catch (e) {
    console.warn("Profile update error:", e);
  }
}

function updateProfileUI() {
  const profile = getProfile();
  const btn = document.getElementById('profileBtn');
  if (!btn) return;
  if (profile.photo) {
    btn.innerHTML = '';
    const img = document.createElement('img');
    img.src = profile.photo;
    img.style.width = '36px'; img.style.height = '36px'; img.style.borderRadius = '50%';
    img.style.objectFit = 'cover';
    img.alt = 'Profile';
    btn.appendChild(img);
  } else {
    const storedName = localStorage.getItem('userName');
    const name = profile.fullName || (profile.firstName ? (profile.firstName + ' ' + (profile.lastName || '')) : '') || storedName || 'User';
    const initials = getInitials(name);
    btn.textContent = initials || '👤';
  }
}

// 🔹 Helper for Initials
function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function openProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  // Show modal and a loading state
  modal.classList.remove('hidden');
  const viewMode = document.getElementById('profileViewMode');
  const editMode = document.getElementById('profileEditMode');
  viewMode.style.display = 'block';
  editMode.style.display = 'none';

  // Set loading placeholders to provide feedback to the user
  document.getElementById('viewProfileName').textContent = 'Loading...';
  document.getElementById('viewProfileEmail').textContent = '...';
  document.getElementById('viewProfileCreated').textContent = '-';
  document.getElementById('viewProfileLogin').textContent = '-';
  document.getElementById('viewProfilePhone').textContent = '-';

  const email = localStorage.getItem('userEmail');
  if (!email || email === 'guest@example.com') {
    document.getElementById('viewProfileName').textContent = 'Guest User';
    document.getElementById('viewProfileEmail').textContent = 'Not logged in';
    return;
  }

  // Fetch latest data from server to ensure profile is up-to-date
  await syncUserData(email);

  // Now populate with the real, freshly fetched data
  const profile = getProfile(); // This gets the full, fresh profile

  const fullName = profile.fullName || 'User';
  document.getElementById('viewProfileName').textContent = fullName;
  document.getElementById('viewProfileEmail').textContent = profile.email || email;
  document.getElementById('viewProfileCreated').textContent = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A';
  document.getElementById('viewProfileLogin').textContent = profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Just now';
  document.getElementById('viewProfilePhone').textContent = profile.phone || 'Not set';

  // Handle profile image or initials
  const viewImg = document.getElementById('viewProfileImg');
  const viewInitials = document.getElementById('viewProfileInitials');
  if (profile.photo) {
    if (viewImg) { viewImg.src = profile.photo; viewImg.style.display = 'block'; }
    if (viewInitials) viewInitials.style.display = 'none';
  } else {
    if (viewImg) viewImg.style.display = 'none';
    if (viewInitials) { viewInitials.style.display = 'flex'; viewInitials.textContent = getInitials(fullName); }
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal) return;
  modal.classList.add('hidden');
}

// Switch to Edit Mode
function toggleEditMode() {
  document.getElementById('profileViewMode').style.display = 'none';
  document.getElementById('profileEditMode').style.display = 'block';
  
  const profile = getProfile();
  const email = profile.email || localStorage.getItem('userEmail') || '';
  const fullName = profile.fullName || '';

  document.getElementById('editProfileName').value = fullName;
  document.getElementById('editProfileEmail').value = email;
  document.getElementById('editProfilePhone').value = profile.phone || '';

  // Image Preview in Edit
  const editImg = document.getElementById('editProfilePreview');
  const editInitials = document.getElementById('editProfileInitials');
  if (profile.photo) { editImg.src = profile.photo; editImg.style.display = 'block'; editInitials.style.display='none'; }
  else { editImg.style.display='none'; editInitials.style.display='flex'; editInitials.textContent = getInitials(fullName); }
}

// 🔹 Image Compression Helper
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

// Save profile from modal inputs
async function saveProfile() {
  const profile = getProfile();
  const newName = document.getElementById('editProfileName').value.trim();
  const newEmail = document.getElementById('editProfileEmail').value.trim();
  const newPhone = document.getElementById('editProfilePhone').value.trim();

  // Check email change for verification simulation
  const currentEmail = localStorage.getItem('userEmail');
  if (newEmail && newEmail !== currentEmail) {
    alert(`📧 Verification email sent to ${newEmail}. Please verify to update your login email.`);
    // In a real app, we wouldn't update localStorage email until verified.
    // For this demo, we'll update it.
    localStorage.setItem('userEmail', newEmail);
  }

  profile.fullName = newName;
  profile.phone = newPhone;
  
  // Update legacy fields for compatibility
  const nameParts = newName.split(' ');
  profile.firstName = nameParts[0] || '';
  profile.lastName = nameParts.slice(1).join(' ') || '';

  const fileInput = document.getElementById('profileImageInput');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      // 🔹 Upload image to server instead of LocalStorage
      const formData = new FormData();
      formData.append('profileImage', fileInput.files[0]);

      const uploadRes = await fetch(`${API_URL}/upload-profile-image`, {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (uploadData.imageUrl) {
        profile.photo = uploadData.imageUrl;
      }
      
      saveProfileToStorage(profile);
      updateProfileOnServer(profile);
      updateProfileUI();
      openProfileModal(); // Return to view mode with updated data
    } catch (e) {
      console.error("Image upload failed:", e);
      alert("Failed to upload image. Server might be offline.");
    }
  } else {
    saveProfileToStorage(profile);
    updateProfileOnServer(profile);
    updateProfileUI();
    openProfileModal(); // Return to view mode
  }
}

// ============================
// 🔹 Theme toggle (light/dark)
// ============================
function getTheme() {
  return localStorage.getItem('wlr_theme') || 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.classList.add('dark-theme');
  else document.documentElement.classList.remove('dark-theme');
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? '🌞' : '🌓';
}

function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('wlr_theme', next);
  applyTheme(next);
}

// ============================
// 🔹 Navigation Active State
// ============================
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
}

// ============================
// 🔹 Admin Access Control
// ============================
function checkAdminAccess() {
  const role = localStorage.getItem('userRole');
  const adminBtn = document.getElementById('nav-admin');
  if (adminBtn) {
    adminBtn.style.display = (role === 'admin') ? 'flex' : 'none';
  }
  
  const path = window.location.pathname.split('/').pop();
  if ((path === 'admin.html' || path === 'admin') && role !== 'admin') {
    window.location.href = 'index.html';
  }
}

// Complaint form handler (attached to file-complaint.html)
window.handleComplaintSubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('complaintName').value || '';
  const category = document.getElementById('complaintCategory').value || '';
  const issue = document.getElementById('complaintIssueType').value || '';
  const description = document.getElementById('complaintDescription').value || '';

  // Save to LocalStorage for Admin Panel
  const email = localStorage.getItem('userEmail') || 'guest@example.com';
  const complaintData = {
    id: `OFC-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`,
    name: name,
    email: email,
    category: category,
    subject: issue,
    description: description,
    submittedAt: new Date().toISOString(),
    status: 'Pending'
  };
  const key = `officialComplaints_${email}`;
  const complaints = JSON.parse(localStorage.getItem(key) || '[]');
  complaints.unshift(complaintData);
  localStorage.setItem(key, JSON.stringify(complaints));

  // Generate PDF using jsPDF (script included in file-complaint.html)
  try {
    const { jsPDF } = window.jspdf || window.jspdf || {};
    const doc = new (jsPDF || window.jspdf.jsPDF)();
    doc.setFontSize(16);
    doc.text('Official Complaint', 20, 20);
    doc.setFontSize(11);
    doc.text(`Name: ${name}`, 20, 32);
    doc.text(`Category: ${category}`, 20, 40);
    doc.text(`Issue: ${issue}`, 20, 48);
    const splitDesc = doc.splitTextToSize(`Description:\n${description}`, 170);
    doc.text(splitDesc, 20, 60);

    // Create blob from PDF
    const pdfBlob = doc.output('blob');

    const recipients = [
      'lakshmankashyap.yt@gmail.com',
      'Kriyay3@gmail.com',
      'myadav07012006@gmail.com',
      'awasthimanjari50@gmail.com'
    ];

    const formData = new FormData();
    formData.append('to', JSON.stringify(recipients));
    formData.append('subject', `Complaint: ${issue || 'No Subject'}`);
    formData.append('text', `Name: ${name}\nCategory: ${category}\nIssue: ${issue}\n\nDescription:\n${description}`);
    formData.append('attachment', pdfBlob, 'complaint.pdf');

    const resp = await fetch(`${API_URL}/send-email`, {
      method: 'POST',
      body: formData
    });

    if (resp.ok) {
      alert('✅ Complaint submitted and emailed to our support team. A PDF has been generated for your records.');
      // Trigger download as well
      doc.save('complaint.pdf');
      document.getElementById('complaintForm')?.reset();
    } else {
      console.error('Failed to send complaint email', await resp.text());
      alert('⚠️ Failed to send complaint. Please try again later.');
    }
  } catch (err) {
    console.error('Error generating/sending complaint:', err);
    alert('⚠️ An error occurred while sending your complaint.');
  }
}

// Enhanced category toggle with single-open behavior
function toggleCategory(header) {
  const content = header.nextElementSibling;
  if (!content) return;

  const isExpanded = header.getAttribute('aria-expanded') === 'true';
  const allHeaders = document.querySelectorAll('.category-header');

  // Close all other sections
  allHeaders.forEach(otherHeader => {
    if (otherHeader !== header) {
      otherHeader.setAttribute('aria-expanded', 'false');
      otherHeader.classList.remove('active');
      otherHeader.style.backgroundColor = ''; // Remove highlight
      
      const otherContent = otherHeader.nextElementSibling;
      if (otherContent) {
        otherContent.style.maxHeight = '0px';
        const icon = otherHeader.querySelector('.toggle-icon');
        if (icon) icon.style.transform = 'rotate(0deg)';
      }
    }
  });

  // Toggle current section
  if (isExpanded) {
    header.setAttribute('aria-expanded', 'false');
    header.classList.remove('active');
    header.style.backgroundColor = '';
    content.style.maxHeight = '0px';
    const icon = header.querySelector('.toggle-icon');
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    header.setAttribute('aria-expanded', 'true');
    header.classList.add('active');
    header.style.backgroundColor = '#f0f8ff'; // Highlight active
    content.style.maxHeight = content.scrollHeight + "px";
    const icon = header.querySelector('.toggle-icon');
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
}

// Function to ask chatbot about a specific legal category
function askChatbot(categoryName) {
  // Navigate to chat page with pre-filled question
  const question = `I need information about ${categoryName} rights for women.`;
  localStorage.setItem('wlr_chat_question', question);
  window.location.href = 'index.html';
}

// Function to open dedicated category pages (placeholder for future implementation)
function openCategoryPage(categorySlug) {
  // For now, show a message. In a real implementation, this would navigate to a dedicated page
  alert(`Detailed information for ${categorySlug.replace('-', ' ')} will be available soon. This feature is under development.`);
  
  // Future implementation could be:
  // window.location.href = `${categorySlug}.html`;
}

// Emergency / SOS handler - navigate to help/emergency contacts
// Open enhanced Emergency Modal with multiple features
function showEmergency() {
  // Create modal if not exists
  if (!document.getElementById('wlrEmergencyModal')) {
    createEmergencyModal();
  } else {
    // Update panic mode banner if modal already exists
    updateEmergencyModalPanicBanner();
  }
  const modal = document.getElementById('wlrEmergencyModal');
  if (!modal) return;
  // Prevent background scrolling while modal is open
  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
}

function createEmergencyModal() {
  const existing = document.getElementById('wlrEmergencyModal');
  if (existing) return;

  const modal = document.createElement('div');
  modal.id = 'wlrEmergencyModal';
  // High z-index to ensure modal overlays sidebar; fixed inset covers viewport
  modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);z-index:100000;font-family:inherit';

  // The box is centered by the overlay's flexbox, with max-height and internal scroll
  modal.innerHTML = `
  <div id="wlrEmergencyBox" style="width:92%;max-width:720px;box-sizing:border-box;background:#fff;border-radius:10px;padding:16px;box-shadow:0 8px 40px rgba(0,0,0,0.4);position:relative;max-height:calc(100vh - 40px);overflow-y:auto;margin:auto;">
    <button id="wlrCloseEmergency" style="position:absolute;right:12px;top:12px;background:#eee;border:none;padding:8px;border-radius:6px;cursor:pointer">✕</button>
    <h2 style="margin:0 0 8px;">🚨 Emergency</h2>
  
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <button class="call-btn" data-number="112" style="flex:1;background:#e53935;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">📞 112</button>
      <button class="call-btn" data-number="181" style="flex:1;background:#d32f2f;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">👩‍⚖️ 181</button>
      <button class="call-btn" data-number="1091" style="flex:1;background:#b71c1c;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">🚔 1091</button>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="wlrTapToCall" style="flex:1;background:#ff5252;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">Tap to Call Now</button>
      <button id="wlrCopyNumber" style="flex:1;background:#f5f5f5;padding:12px;border:none;border-radius:8px;cursor:pointer">Copy Number</button>
      <button id="wlrAutoCopy" style="flex:1;background:#f5f5f5;padding:12px;border:none;border-radius:8px;cursor:pointer">Auto-copy Helpline</button>
    </div>

    <hr />

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="wlrShareLocationBtn" style="flex:1;background:#1976d2;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">📍 Share My Location</button>
      <button id="wlrWhatsAppLocation" style="flex:1;background:#25D366;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">Send via WhatsApp</button>
      <button id="wlrCopyLocation" style="flex:1;background:#f5f5f5;padding:12px;border:none;border-radius:8px;cursor:pointer">Copy Location</button>
    </div>

    <div style="margin-bottom:8px;">
      <label style="display:block;margin-bottom:6px;font-weight:600">SOS Message (editable):</label>
      <textarea id="wlrSosMessage" rows="2" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd">I am in danger. Please help me. My location: [Location]</textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="wlrSendSos" style="flex:1;background:#d84315;color:#fff;padding:10px;border:none;border-radius:8px;cursor:pointer">Send SOS to Contacts</button>
        <button id="wlrEditContacts" style="flex:1;background:#f5f5f5;padding:10px;border:none;border-radius:8px;cursor:pointer">Edit Contacts</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="wlrStartRecord" style="flex:1;background:#424242;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">🎤 Start Recording</button>
      <button id="wlrCapturePhoto" style="flex:1;background:#616161;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">📸 Capture Photo</button>
      <button id="wlrStartVideo" style="flex:1;background:#000;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer">🎥 Record Video</button>
    </div>

    

    <div style="display:flex;gap:8px;margin-top:8px;">
      <button id="wlrFakeScreen" style="flex:1;background:#9e9e9e;color:#fff;padding:10px;border:none;border-radius:8px;cursor:pointer">Hide App / Fake Screen</button>
      <button id="wlrPanicMode" style="flex:1;background:#37474f;color:#fff;padding:10px;border:none;border-radius:8px;cursor:pointer">Activate Panic Mode</button>
    </div>

    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="wlrNearbyPolice" style="flex:1;background:#1e88e5;color:#fff;padding:10px;border:none;border-radius:8px;cursor:pointer">Find Nearby Police</button>
      <button id="wlrNearbyHospital" style="flex:1;background:#43a047;color:#fff;padding:10px;border:none;border-radius:8px;cursor:pointer">Find Nearby Hospital</button>
      <button id="wlrFileComplaintGuide" style="flex:1;background:#ffb300;color:#000;padding:10px;border:none;border-radius:8px;cursor:pointer">File Complaint Now</button>
    </div>

    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
      <div id="wlrAutoTimerArea" style="color:#555">Auto-send: <span id="wlrAutoTimerStatus">Off</span></div>
      <div style="display:flex;gap:8px;">
        <button id="wlrStartAutoTimer" style="background:#ef6c00;color:#fff;padding:8px;border:none;border-radius:6px;cursor:pointer">Start 30s Timer</button>
        <button id="wlrCancelAutoTimer" style="background:#eee;padding:8px;border:none;border-radius:6px;cursor:pointer">Cancel</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(modal);

  // Elements
  const closeBtn = document.getElementById('wlrCloseEmergency');
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; stopAllMedia(); document.body.style.overflow = ''; });

  // Close when clicking on overlay outside the box
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.style.display = 'none'; stopAllMedia(); document.body.style.overflow = ''; }
  });

  // Call buttons
  modal.querySelectorAll('.call-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.number;
      copyToClipboard(num);
      // Try to invoke phone call
      window.location.href = `tel:${num}`;
    });
  });

  document.getElementById('wlrTapToCall').addEventListener('click', () => {
    // default to women's police helpline
    window.location.href = 'tel:1091';
  });

  document.getElementById('wlrCopyNumber').addEventListener('click', () => {
    copyToClipboard('1091');
    alert('1091 copied to clipboard');
  });

  document.getElementById('wlrAutoCopy').addEventListener('click', () => {
    // copy all helplines
    const all = '112, 181, 1091';
    copyToClipboard(all);
    alert('Emergency numbers copied: ' + all);
  });

  // Location sharing
  document.getElementById('wlrShareLocationBtn').addEventListener('click', async () => {
    const link = await getLocationLink();
    if (link) {
      document.getElementById('wlrSosMessage').value = document.getElementById('wlrSosMessage').value.replace('[Location]', link);
      alert('Location added to message.');
    }
  });

  document.getElementById('wlrWhatsAppLocation').addEventListener('click', async () => {
    const link = await getLocationLink();
    if (!link) return;
    const text = encodeURIComponent(document.getElementById('wlrSosMessage').value.replace('[Location]', link));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  });

  document.getElementById('wlrCopyLocation').addEventListener('click', async () => {
    const link = await getLocationLink();
    if (link) { copyToClipboard(link); alert('Location copied to clipboard'); }
  });

  // SOS send
  document.getElementById('wlrSendSos').addEventListener('click', () => {
    const msg = document.getElementById('wlrSosMessage').value;
    sendSosToSavedContacts(msg);
  });

  document.getElementById('wlrEditContacts').addEventListener('click', () => {
    openContactsEditor(modal);
  });

  // Recording
  document.getElementById('wlrStartRecord').addEventListener('click', () => {
    const btn = document.getElementById('wlrStartRecord');
    if (btn.dataset.recording === '1') { stopRecording(); btn.textContent = '🎤 Start Recording'; btn.dataset.recording='0'; }
    else { startRecording(); btn.textContent = '⏹️ Stop Recording'; btn.dataset.recording='1'; }
  });

  document.getElementById('wlrCapturePhoto').addEventListener('click', () => capturePhoto());
  document.getElementById('wlrStartVideo').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.recording === '1') { stopVideoRecording(); btn.textContent='🎥 Record Video'; btn.dataset.recording='0'; }
    else { startVideoRecording(); btn.textContent='⏹️ Stop Video'; btn.dataset.recording='1'; }
  });

  document.getElementById('wlrFakeScreen').addEventListener('click', () => toggleFakeScreen());
  document.getElementById('wlrPanicMode').addEventListener('click', () => togglePanicMode());

  document.getElementById('wlrNearbyPolice').addEventListener('click', () => findNearby('police station'));
  document.getElementById('wlrNearbyHospital').addEventListener('click', () => findNearby('hospital'));
  document.getElementById('wlrFileComplaintGuide').addEventListener('click', () => {
    window.open('https://www.indialawoffices.com/legal-articles/first-information-report-fir', '_blank');
    window.open('https://uppolice.gov.in/', '_blank');
    window.open('http://mahilaayog.up.gov.in/contact.html', '_blank');
  });

  document.getElementById('wlrStartAutoTimer').addEventListener('click', () => startAutoTimer(30));
  document.getElementById('wlrCancelAutoTimer').addEventListener('click', () => cancelAutoTimer());

  // Initialize saved contacts storage if not present
  if (!localStorage.getItem('wlr_emergency_contacts')) {
    localStorage.setItem('wlr_emergency_contacts', JSON.stringify(['', '', '']));
  }
}

function updateEmergencyModalPanicBanner() {
  const modal = document.getElementById('wlrEmergencyModal');
  if (!modal) return;
  
  const box = modal.querySelector('#wlrEmergencyBox');
  if (!box) return;
  
  // Remove existing panic banner
  const existingBanner = box.querySelector('.panic-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  // Add new panic banner if panic mode is active
  if (wlrPanicActive) {
    const title = box.querySelector('h2');
    if (title) {
      const banner = document.createElement('div');
      banner.className = 'panic-banner';
      banner.style.cssText = 'background:#ffebee;border:2px solid #f44336;border-radius:8px;padding:12px;margin-bottom:12px;text-align:center;font-weight:bold;color:#d32f2f;';
      banner.textContent = '🚨 PANIC MODE ACTIVE - EMERGENCY FEATURES ENABLED 🚨';
      title.insertAdjacentElement('afterend', banner);
    }
  }
}

// Utility: copy to clipboard
function copyToClipboard(text) {
  if (!navigator.clipboard) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch(e){} ta.remove();
  } else navigator.clipboard.writeText(text).catch(()=>{});
}

// Utility: get location link (Google Maps) and return it
async function getLocationLink() {
  if (!('geolocation' in navigator)) { alert('Geolocation not supported'); return null; }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude;
      const link = `https://www.google.com/maps?q=${lat},${lon}`;
      resolve(link);
    }, err => { alert('Could not get location: ' + err.message); resolve(null); }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

// Send SOS to saved contacts (opens SMS composer for each contact)
function sendSosToSavedContacts(message) {
  const contacts = JSON.parse(localStorage.getItem('wlr_emergency_contacts') || '[]');
  const numbers = contacts.filter(n => n && n.trim().length>0);
  if (numbers.length === 0) {
    if (confirm('No emergency contacts set. Open editor now?')) {
      const modal = document.getElementById('wlrEmergencyModal');
      openContactsEditor(modal);
    }
    return;
  }  
  numbers.forEach(num => {
    // Use sms: URI; body parameter encoding differs across platforms
    const body = encodeURIComponent(message);
    const uri = `sms:${num}?body=${body}`;
    window.open(uri);
  });
  alert('Opened SMS composer for saved contacts. Please send the messages from your phone.');
}

function openContactsEditor(parentModal) {
  const editor = document.createElement('div');
  editor.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:10000';
  editor.innerHTML = `
    <div style="width:92%;max-width:520px;background:#fff;padding:16px;border-radius:10px;">
      <h3>Edit Emergency Contacts</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <input id="wlrContact1" placeholder="Contact 1 (number)" />
        <input id="wlrContact2" placeholder="Contact 2 (number)" />
        <input id="wlrContact3" placeholder="Contact 3 (number)" />
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
        <button id="wlrSaveContacts">Save</button>
        <button id="wlrCloseContacts">Close</button>
      </div>
    </div>`;
  document.body.appendChild(editor);
  const saved = JSON.parse(localStorage.getItem('wlr_emergency_contacts')||'["","",""]');
  document.getElementById('wlrContact1').value = saved[0]||'';
  document.getElementById('wlrContact2').value = saved[1]||'';
  document.getElementById('wlrContact3').value = saved[2]||'';

  document.getElementById('wlrCloseContacts').addEventListener('click', () => editor.remove());
  document.getElementById('wlrSaveContacts').addEventListener('click', () => {
    const arr = [document.getElementById('wlrContact1').value.trim(), document.getElementById('wlrContact2').value.trim(), document.getElementById('wlrContact3').value.trim()];
    localStorage.setItem('wlr_emergency_contacts', JSON.stringify(arr));
    alert('Contacts saved');
    editor.remove();
  });
}

// Recording helpers
let wlrMediaRecorder, wlrAudioChunks = [], wlrAudioStream;
async function startRecording() {
  try {
    wlrAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    wlrMediaRecorder = new MediaRecorder(wlrAudioStream);
    wlrAudioChunks = [];
    wlrMediaRecorder.ondataavailable = e => wlrAudioChunks.push(e.data);
    wlrMediaRecorder.onstop = async () => {
      const blob = new Blob(wlrAudioChunks, { type: 'audio/webm' });
      saveEvidenceFile(blob, 'audio');
      wlrAudioStream.getTracks().forEach(t => t.stop());
    };
    wlrMediaRecorder.start();
    alert('Recording started silently');
  } catch (e) { console.error(e); alert('Could not start recording: ' + e.message); }
}

function stopRecording() { if (wlrMediaRecorder && wlrMediaRecorder.state !== 'inactive') wlrMediaRecorder.stop(); }

// Photo capture
let wlrVideoStream, wlrVideoRecorder, wlrRecordedChunks = [];
async function capturePhoto() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video'); video.srcObject = stream; await video.play();
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    // create blob
    const res = await fetch(dataUrl); const blob = await res.blob();
    saveEvidenceFile(blob, 'photo');
    stream.getTracks().forEach(t => t.stop());
    alert('Photo captured and saved');
  } catch (e) { console.error(e); alert('Could not capture photo: ' + e.message); }
}

// Video recording
async function startVideoRecording() {
  try {
    wlrVideoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    wlrRecordedChunks = [];
    wlrVideoRecorder = new MediaRecorder(wlrVideoStream);
    wlrVideoRecorder.ondataavailable = e => wlrRecordedChunks.push(e.data);
    wlrVideoRecorder.onstop = async () => {
      const blob = new Blob(wlrRecordedChunks, { type: 'video/webm' });
      saveEvidenceFile(blob, 'video');
      wlrVideoStream.getTracks().forEach(t => t.stop());
    };
    wlrVideoRecorder.start();
    alert('Video recording started');
  } catch (e) { console.error(e); alert('Could not start video: ' + e.message); }
}

function stopVideoRecording() { if (wlrVideoRecorder && wlrVideoRecorder.state !== 'inactive') wlrVideoRecorder.stop(); }

// Save evidence locally and try to upload to server
async function saveEvidenceFile(blob, kind) {
  try {
    // Filename with timestamp
    const name = `wlr_${kind}_${new Date().toISOString().replace(/[:.]/g,'-')}.${blob.type.split('/')[1] || 'dat'}`;
    // Download locally
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();

    // Try upload to backend if API available
    try {
      const fd = new FormData(); fd.append('file', blob, name); fd.append('kind', kind);
      fetch(`${API_URL}/uploadEvidence`, { method: 'POST', body: fd }).then(resp => console.log('Upload resp', resp.status)).catch(err => console.warn('Upload failed', err));
    } catch(e) { console.warn('Upload exception', e); }
  } catch (e) { console.error('saveEvidenceFile error', e); }
}

function stopAllMedia() { try { if (wlrAudioStream) wlrAudioStream.getTracks().forEach(t=>t.stop()); if (wlrVideoStream) wlrVideoStream.getTracks().forEach(t=>t.stop()); } catch(e){} }

// Fake screen (simple redirect or overlay calculator)
let wlrFakeOverlay;
function toggleFakeScreen() {
  if (wlrFakeOverlay) { wlrFakeOverlay.remove(); wlrFakeOverlay = null; return; }
  wlrFakeOverlay = document.createElement('div');
  wlrFakeOverlay.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:10001;display:flex;align-items:center;justify-content:center;font-size:20px';
  wlrFakeOverlay.innerHTML = `<div style="width:320px;background:#f3f3f3;border-radius:8px;padding:12px;box-shadow:0 4px 18px rgba(0,0,0,0.2);">
    <input style="width:100%;padding:8px;margin-bottom:8px;text-align:right;font-size:18px;background:#fff;border-radius:6px;border:1px solid #ddd" readonly value="123456789" />
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
      <button style="padding:12px">7</button><button style="padding:12px">8</button><button style="padding:12px">9</button>
      <button style="padding:12px">4</button><button style="padding:12px">5</button><button style="padding:12px">6</button>
      <button style="padding:12px">1</button><button style="padding:12px">2</button><button style="padding:12px">3</button>
      <button style="grid-column:1/3;padding:12px">0</button><button style="padding:12px">.</button>
    </div>
    <div style="text-align:right;margin-top:8px"><button id="wlrExitFake" style="padding:8px;border:none;background:#e0e0e0;border-radius:6px;">Exit</button></div>
  </div>`;
  document.body.appendChild(wlrFakeOverlay);
  document.getElementById('wlrExitFake').addEventListener('click', () => { if (wlrFakeOverlay) { wlrFakeOverlay.remove(); wlrFakeOverlay = null; } });
}

// Panic mode: mute page sounds and set silent flag
let wlrPanicActive = false;
function togglePanicMode() {
  wlrPanicActive = !wlrPanicActive;

  if (wlrPanicActive) {
    // Activate full panic mode with all features
    showEmergency();

    // Log the SOS alert to local storage for Admin Panel
    try {
      const sosLogs = JSON.parse(localStorage.getItem('sos_alerts_log') || '[]');
      sosLogs.push({
        timestamp: new Date().toISOString(),
        userEmail: localStorage.getItem('userEmail') || 'Unknown'
      });
      localStorage.setItem('sos_alerts_log', JSON.stringify(sosLogs));
    } catch(e) {}

    // Automatically send live location to admins
    getLocationLink().then(link => {
      const recipients = [
        'lakshmankashyap.yt@gmail.com',
        'Kriyay3@gmail.com',
        'myadav07012006@gmail.com',
        'awasthimanjari50@gmail.com'
      ];
      const uName = localStorage.getItem('userName') || 'User';
      const uEmail = localStorage.getItem('userEmail') || 'Unknown';
      const locationMsg = link ? `Location: ${link}` : 'Location: Unavailable (User denied permission or GPS error)';
      
      fetch(`${API_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject: `🚨 PANIC MODE ALERT: ${uName}`,
          text: `EMERGENCY ALERT\n\nUser: ${uName} (${uEmail})\nhas activated PANIC MODE.\n\nTime: ${new Date().toLocaleString()}\n${locationMsg}\n\nPlease take immediate action.`
        })
      }).catch(err => console.error('Failed to send panic email', err));
    });


    // Mute any audio elements for silent operation
    document.querySelectorAll('audio,video').forEach(el => el.muted = true);

    // Update panic mode button text if it exists
    const panicBtn = document.getElementById('wlrPanicMode');
    if (panicBtn) {
      panicBtn.textContent = 'Panic Mode: ACTIVE';
      panicBtn.style.background = '#d32f2f';
    }

    // Update settings toggle if it exists
    const settingsToggle = document.getElementById('panicModeSwitch');
    if (settingsToggle && !settingsToggle.checked) {
      settingsToggle.checked = true;
      if (typeof SettingsService !== 'undefined') {
        SettingsService.saveSetting('panicMode', true);
      }
    }

    // Show emergency guidance
    setTimeout(() => {
      // Update emergency modal if it's open
    updateEmergencyModalPanicBanner();

    // Show emergency guidance
    setTimeout(() => {
      alert(`🚨 EMERGENCY PANIC MODE ACTIVATED! 🚨

EMERGENCY FEATURES NOW ACTIVE:
• SOS Alert: Ready to send to saved contacts
• Live Location Sharing: Automatic location updates
• Emergency Helplines:
  - Women Helpline: 1091
  - Police: 100
  - Emergency: 112
• Quick Call: One-click calling to emergency services
• Silent Mode: All sounds muted for safety
• Emergency Guidance: Safety instructions provided

STAY SAFE! Help is on the way.`);
    }, 500);
    }, 500);

  } else {
    // Deactivate panic mode
    document.querySelectorAll('audio,video').forEach(el => el.muted = false);

    // Close emergency modal
    const modal = document.getElementById('wlrEmergencyModal');
    if (modal) {
      modal.style.display = 'none';
      if (typeof stopAllMedia === 'function') {
        stopAllMedia();
      }
      document.body.style.overflow = '';
    }

    // Update panic mode button text if it exists
    const panicBtn = document.getElementById('wlrPanicMode');
    if (panicBtn) {
      panicBtn.textContent = 'Activate Panic Mode';
      panicBtn.style.background = '#37474f';
    }

    // Update settings toggle if it exists
    const settingsToggle = document.getElementById('panicModeSwitch');
    if (settingsToggle && settingsToggle.checked) {
      settingsToggle.checked = false;
      if (typeof SettingsService !== 'undefined') {
        SettingsService.saveSetting('panicMode', false);
      }
    }

    // Update emergency modal if it's open
    updateEmergencyModalPanicBanner();

    alert('Panic mode deactivated. Stay safe.');
  }
}

// Find nearby via Google Maps
function findNearby(query) {
  if (!('geolocation' in navigator)) { window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}/`, '_blank'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lon},14z`;
    window.open(url, '_blank');
  }, err => { window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}/`, '_blank'); });
}

// Auto-timer to send SOS after N seconds
let wlrAutoTimerId = null;
function startAutoTimer(seconds) {
  cancelAutoTimer();
  const status = document.getElementById('wlrAutoTimerStatus');
  let remaining = seconds;
  status.textContent = `${remaining}s`;
  wlrAutoTimerId = setInterval(async () => {
    remaining -= 1; status.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(wlrAutoTimerId); wlrAutoTimerId = null; status.textContent = 'Sent';
      // send
      const link = await getLocationLink();
      const msg = document.getElementById('wlrSosMessage').value.replace('[Location]', link || '[Location unavailable]');
      sendSosToSavedContacts(msg);
    }
  }, 1000);
}

function cancelAutoTimer() { if (wlrAutoTimerId) clearInterval(wlrAutoTimerId); wlrAutoTimerId = null; const s = document.getElementById('wlrAutoTimerStatus'); if (s) s.textContent='Off'; }


// Logout function
function logout() {
  // Clear any session data
  localStorage.removeItem('wlr_profile');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userLastLogin');
  localStorage.removeItem('userCreatedAt');
  
  // Clear chat box UI to prevent data leak
  const chatBox = document.getElementById("chatBox");
  if (chatBox) chatBox.innerHTML = '';
  
  // Reset Profile UI to default
  const btn = document.getElementById('profileBtn');
  if (btn) btn.textContent = '👤';

  // Check if we're on the main page with auth sections
  if (document.getElementById('loginPage')) {
    // Show login section
    document.querySelector('.dashboard-layout').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    showSection('loginPage');
  } else {
    // Redirect to main page
    window.location.href = 'index.html';
  }
}

// ============================
// 🔹 Chat History Management
// ============================
function getChatHistoryKey() {
  const email = localStorage.getItem('userEmail');
  return email ? `chatHistory_${email}` : 'chatHistory';
}

function saveChatToStorage(sender, text) {
  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.push({ sender, text, timestamp: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(history));
}

function loadChatHistory() {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  
  chatBox.innerHTML = '';
  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.forEach(msg => {
    const div = document.createElement("div");
    div.className = msg.sender;
    div.textContent = msg.text;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

function clearChat() {
  if (confirm("Are you sure you want to clear the chat history?")) {
    const key = getChatHistoryKey();
    localStorage.removeItem(key);
    const chatBox = document.getElementById("chatBox");
    if (chatBox) chatBox.innerHTML = '';
  }
}

// 🔹 History Page Functions
function renderHistoryPage() {
  const datesList = document.getElementById('historyDatesList');
  const detailView = document.getElementById('historyDetailView');
  
  if (!datesList || !detailView) return;

  // Reset views
  datesList.style.display = 'block';
  detailView.style.display = 'none';
  
  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  renderHistoryList(history);
}

function renderHistoryList(historyData) {
  const datesList = document.getElementById('historyDatesList');
  if (!datesList) return;
  
  datesList.innerHTML = '';

  if (historyData.length === 0) {
    datesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-history empty-icon"></i>
        <h3 class="empty-title">No Chat History Found</h3>
        <p class="empty-desc">Start a conversation to see it here.</p>
        <a href="index.html" class="start-chat-btn">Start Chat</a>
      </div>
    `;
    return;
  }

  // Group by Date
  const groups = {};
  historyData.forEach(msg => {
    const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const dateKey = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  });

  // Sort dates (newest first)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const dateA = new Date(groups[a][0].timestamp);
    const dateB = new Date(groups[b][0].timestamp);
    return dateB - dateA;
  });

  sortedKeys.forEach(dateKey => {
    const msgs = groups[dateKey];
    const folder = document.createElement('div');
    folder.className = 'history-date-card';
    
    // Store messages in a way we can pass them, or just filter again. Passing reference is easier.
    folder.onclick = () => openHistoryDate(dateKey, msgs);
    
    // Preview text (last message)
    const lastMsg = msgs[msgs.length - 1].text;
    const preview = lastMsg.length > 50 ? lastMsg.substring(0, 50) + '...' : lastMsg;

    folder.innerHTML = `
      <div class="date-info">
        <div class="date-icon">
            <i class="fas fa-calendar-alt"></i>
        </div>
        <div class="date-text">
          <h4 class="date-title">${dateKey}</h4>
          <span class="date-preview">${preview}</span>
        </div>
      </div>
      <div class="date-meta">
        <span class="msg-count">${msgs.length} msgs</span>
        <i class="fas fa-chevron-right" style="color:#ccc;"></i>
      </div>
    `;
    datesList.appendChild(folder);
  });
}

function openHistoryDate(dateKey, messages) {
  const datesList = document.getElementById('historyDatesList');
  const detailView = document.getElementById('historyDetailView');
  const title = document.getElementById('historyDetailTitle');
  const list = document.getElementById('historyMessagesList');

  datesList.style.display = 'none';
  detailView.style.display = 'flex';
  title.textContent = dateKey;
  list.innerHTML = '';

  // Sort messages by time ascending for reading
  const sortedMsgs = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  sortedMsgs.forEach(msg => {
    const item = document.createElement('div');
    const isUser = msg.sender === 'user';
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    item.className = `history-msg ${isUser ? 'user' : 'bot'}`;
    
    item.innerHTML = `
      ${msg.text}
      <span class="msg-time">${timeStr}</span>
    `;
    list.appendChild(item);
  });
  
  // Scroll to top
  list.scrollTop = 0;
}

function closeHistoryDate() {
  document.getElementById('historyDatesList').style.display = 'block';
  document.getElementById('historyDetailView').style.display = 'none';
}

function filterHistory(e) {
  const term = e.target.value.toLowerCase();
  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  
  if (!term) {
    renderHistoryList(history);
    return;
  }

  // Filter messages that contain the term
  const filtered = history.filter(msg => msg.text.toLowerCase().includes(term));
  
  // Render the filtered list (it will group them by date automatically)
  renderHistoryList(filtered);
}

function clearHistoryPage() {
  if (confirm("Are you sure you want to delete all history?")) {
    const key = getChatHistoryKey();
    localStorage.removeItem(key);
    renderHistoryPage();
  }
}

// ============================
// 🔹 PDF Download (History)
// ============================
function openDateSelectionModal() {
  const modal = document.getElementById('dateSelectionModal');
  const select = document.getElementById('historyDateSelect');
  if (!modal || !select) return;

  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  if (history.length === 0) {
    alert("No history available to download.");
    return;
  }

  // Extract unique dates (newest first)
  const uniqueDates = [];
  const seen = new Set();
  // Traverse history in reverse (newest first)
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!seen.has(dateStr)) {
      seen.add(dateStr);
      uniqueDates.push(dateStr);
    }
  }

  select.innerHTML = '<option value="all">All Dates</option>';
  uniqueDates.forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    select.appendChild(option);
  });

  modal.classList.remove('hidden');
}

function closeDateSelectionModal() {
  const modal = document.getElementById('dateSelectionModal');
  if (modal) modal.classList.add('hidden');
}

function confirmDownloadPDF() {
  const select = document.getElementById('historyDateSelect');
  if (select) {
    downloadHistoryPDF(select.value);
  }
  closeDateSelectionModal();
}

async function downloadHistoryPDF(dateFilter = 'all') {
  if (typeof window.jspdf === 'undefined') {
    alert("⚠️ PDF library is not loaded. Please check your internet connection or try refreshing the page.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Get profile data
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem('wlr_profile') || '{}');
  } catch (e) {
    console.error("Error loading profile", e);
  }
  
  const userName = (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'User').trim();
  const key = getChatHistoryKey();
  let history = JSON.parse(localStorage.getItem(key) || '[]');

  // Filter by date if requested
  if (dateFilter && dateFilter !== 'all') {
    history = history.filter(msg => {
      const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return dateStr === dateFilter;
    });
  }

  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80); // Dark blue
  doc.text('Women Legal Rights Chatbot', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(dateFilter !== 'all' ? `Conversation History - ${dateFilter}` : 'Conversation History', 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`User: ${userName}`, 14, 40);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 45);
  
  doc.setDrawColor(200);
  doc.line(14, 50, 196, 50);

  let y = 60;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const maxWidth = 180;
  let lastDate = '';

  if (history.length === 0) {
    doc.text('No conversation history found.', margin, y);
  } else {
    // Loop through history
    history.forEach(msg => {
      // Check page break
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Date Header
      if (dateStr !== lastDate) {
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(100); // Grey
        doc.text(dateStr, margin, y);
        doc.line(margin, y + 1, 196, y + 1);
        y += 10;
        lastDate = dateStr;
      }
      
      const isUser = msg.sender === 'user';
      const senderName = isUser ? (userName || 'You') : 'Chatbot';
      const color = isUser ? [0, 123, 255] : [40, 167, 69]; // Blue for user, Green for bot
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Sender Header
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...color);
      doc.text(senderName, margin, y);
      
      // Timestamp
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150);
      const timeWidth = doc.getTextWidth(timeStr);
      doc.text(timeStr, 196 - timeWidth, y);
      
      y += 5;
      
      // Message Body
      doc.setFontSize(10);
      doc.setTextColor(0);
      const textLines = doc.splitTextToSize(msg.text, maxWidth);
      doc.text(textLines, margin, y);
      
      y += (textLines.length * 5) + 8; // Spacing between messages
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
    doc.text('Generated by Women Legal Rights Chatbot', 14, pageHeight - 10);
  }

  doc.save('wlr_chat_history.pdf');
}

// ============================
// 🔹 Page Initializer Router
// ============================

document.addEventListener('DOMContentLoaded', function() {
  // --- Common Initializations for ALL pages ---
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for reset token first
  if (urlParams.get('view') === 'chat' && localStorage.getItem('userEmail')) {
    showSection('chatPage');
  } else if (localStorage.getItem('userEmail') && document.getElementById('loginPage')) {
    showSection('chatPage');
  }

  updateProfileUI();
  applyTheme(getTheme());
  setActiveNavLink();
  checkAdminAccess();

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', openProfileModal);
  }

  const settingsEditProfileBtn = document.getElementById('settingsEditProfileBtn');
  if (settingsEditProfileBtn) settingsEditProfileBtn.addEventListener('click', openProfileModal);

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const emergencyBtn = document.getElementById('emergencyBtn');
  if (emergencyBtn) emergencyBtn.addEventListener('click', showEmergency);

  const closeBtn = document.getElementById('closeProfileBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);

  // New Profile Event Listeners
  // Edit button
const editBtn = document.getElementById('editProfileBtn');
if (editBtn) {
  editBtn.addEventListener('click', toggleEditMode);
}

// Cancel Edit button
const cancelEditBtn = document.getElementById('cancelEditBtn');
if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', function() {
    document.getElementById('profileEditMode').style.display = 'none';
    document.getElementById('profileViewMode').style.display = 'block';
  });
}

// Save button
const saveBtn = document.getElementById('saveProfileBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', saveProfile);
}

// Profile Image Upload
const imgInput = document.getElementById('profileImageInput');
if (imgInput) {
  imgInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (ev) {
      const previewImg = document.getElementById('editProfilePreview');
      const initials = document.getElementById('editProfileInitials');

      previewImg.src = ev.target.result;
      previewImg.style.display = 'block';
      initials.style.display = 'none';
    };

    reader.readAsDataURL(file);
  });
}
  // --- Page-Specific Initializations ---
  const path = window.location.pathname.split('/').pop() || 'index.html';

  if (path === 'index.html' || path === '') {
    initChatPage();
  } else if (path === 'resources.html') {
    initResourcesPage();
  } else if (path === 'history.html') {
    initHistoryPage();
  } else if (path === 'help.html') {
    initHelpPage();
  } else if (path === 'legal-rights.html') {
    initLegalRightsPage();
  }
});

function initChatPage() {
  loadChatHistory();
  const userInput = document.getElementById('userInput');
  if (userInput) {
    userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }
  const fileInputEl = document.getElementById("fileInput");
  if (fileInputEl) {
    fileInputEl.addEventListener("change", function(event) {
      const file = event.target.files[0];
      if (file) sendFile(file);
    });
  }
}

function initHistoryPage() {
  renderHistoryPage();
  loadStreakData();
  const historySearch = document.getElementById('historySearch');
  if (historySearch) {
    historySearch.addEventListener('input', filterHistory);
  }
  const clearHistoryBtn = document.querySelector('.clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistoryPage);
  }
}

// ============================
// 🔹 Streak Counter Logic
// ============================
async function loadStreakData() {
  const email = localStorage.getItem('userEmail');
  if (!email || email === 'guest@example.com') {
    computeLocalStreak();
    return;
  }

  try {
    // Example API fetch. Replace with real backend if needed:
    // const res = await fetch(`${API_URL}/api/user/streak?email=${encodeURIComponent(email)}`);
    // const data = await res.json();
    // renderStreakUI(data);
    
    // Fallback to computing streak from local chat history data
    computeLocalStreak();
  } catch (e) {
    console.warn("Failed to fetch streak from backend, falling back to local data.", e);
    computeLocalStreak();
  }
}

function computeLocalStreak() {
  const key = getChatHistoryKey();
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  
  if (history.length === 0) {
    renderStreakUI({ currentStreak: 0, bestStreak: 0, lastActiveDate: null, activeDates: [] });
    return;
  }
  
  // Extract unique dates of activity based on chat messages
  const activeDates = [...new Set(history.map(msg => new Date(msg.timestamp).toDateString()))]
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b - a); // Newest first
    
  let currentStreak = 0;
  let bestStreak = parseInt(localStorage.getItem('bestStreak') || '0');
  
  if (activeDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(activeDates[0]);
    lastActive.setHours(0, 0, 0, 0);
    
    const diffTime = today - lastActive;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) { // If they chatted today or yesterday
      currentStreak = 1;
      for (let i = 0; i < activeDates.length - 1; i++) {
        const d1 = new Date(activeDates[i]);
        d1.setHours(0,0,0,0);
        const d2 = new Date(activeDates[i+1]);
        d2.setHours(0,0,0,0);
        
        if ((d1 - d2) / (1000 * 60 * 60 * 24) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }
  
  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
    localStorage.setItem('bestStreak', bestStreak);
  }
  
  renderStreakUI({ 
    currentStreak, 
    bestStreak, 
    lastActiveDate: activeDates[0] || null,
    activeDates: activeDates.map(d => {
      const localDate = new Date(d);
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      return localDate.toISOString().split('T')[0];
    })
  });
}

function renderStreakUI(streakData) {
  const display = document.getElementById('streakModalDisplay');
  const bestDisplay = document.getElementById('streakModalBest');
  const matrix = document.getElementById('streakMatrix');
  
  if (!display || !bestDisplay || !matrix) return;
  
  // Play glow animation if streak is new & > 0
  if (streakData.currentStreak > 0 && streakData.currentStreak > parseInt(localStorage.getItem('lastViewedStreak') || '0')) {
    const modalContent = document.querySelector('#streakModal .modal-content');
    if (modalContent) {
      modalContent.classList.add('streak-glow');
      setTimeout(() => modalContent.classList.remove('streak-glow'), 1500);
    }
    localStorage.setItem('lastViewedStreak', streakData.currentStreak);
  }

  display.innerHTML = `🔥 ${streakData.currentStreak}-Day Streak!`;
  bestDisplay.textContent = streakData.bestStreak;
  
  // Generate Github-style matrix grid (10 weeks = 70 days)
  matrix.innerHTML = '';
  const totalDays = 70;
  const today = new Date();
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (totalDays - 1));
  
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    
    const adjustedD = new Date(d);
    adjustedD.setMinutes(adjustedD.getMinutes() - adjustedD.getTimezoneOffset());
    const dateStr = adjustedD.toISOString().split('T')[0];
    
    const dayBox = document.createElement('div');
    dayBox.className = 'streak-day matrix-cell';
    dayBox.title = d.toLocaleDateString();
    
    if (streakData.activeDates && streakData.activeDates.includes(dateStr)) {
      dayBox.classList.add('active');
    }
    
    matrix.appendChild(dayBox);
  }
}

function openStreakModal() {
  computeLocalStreak(); // Refresh data accurately before opening
  const modal = document.getElementById('streakModal');
  if (modal) modal.classList.remove('hidden');
}

function closeStreakModal() {
  const modal = document.getElementById('streakModal');
  if (modal) modal.classList.add('hidden');
}

function initHelpPage() {
  // FAQ Accordion
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const answer = this.nextElementSibling;
      const icon = this.querySelector('i');
      const isActive = answer.style.display === 'block';
      
      answer.style.display = isActive ? 'none' : 'block';
      icon.style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  });

  // Contact Form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('contactName').value;
      const email = document.getElementById('contactEmail').value;
      const subject = document.getElementById('contactSubject').value;
      const message = document.getElementById('contactMessage').value;
      const recipients = ['lakshmankashyap.yt@gmail.com', 'Kriyay3@gmail.com', 'myadav07012006@gmail.com', 'awasthimanjari50@gmail.com'];
          
          // Save to LocalStorage for Admin Panel
          const techIssueData = {
            id: `TECH-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`,
            name: name,
            email: email,
            category: 'Technical Support',
            subject: subject,
            description: message,
            submittedAt: new Date().toISOString(),
            status: 'Pending'
          };
          const currentUserEmail = localStorage.getItem('userEmail') || email;
          const key = `supportRequests_${currentUserEmail}`;
          const techIssues = JSON.parse(localStorage.getItem(key) || '[]');
          techIssues.unshift(techIssueData);
          localStorage.setItem(key, JSON.stringify(techIssues));

      try {
        await fetch(`${API_URL}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipients, subject: `Support Request: ${subject}`, text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}` })
        });
        alert('Thank you! Your message has been forwarded to our support team.');
        contactForm.reset();
      } catch (err) {
        console.error("Error sending contact form:", err);
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
      }
    });
  }
}

function initLegalRightsPage() {
  const categoryHeaders = document.querySelectorAll('.category-header');
  categoryHeaders.forEach(header => {
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('tabindex', '0');

    const icon = header.querySelector('.toggle-icon');
    if (icon) icon.style.transition = 'transform 0.3s ease';

    header.addEventListener('click', () => toggleCategory(header));
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCategory(this);
      }
    });
  });
}

// ============================
// 📚 Resources Page Logic
// ============================

const resourcesData = [
  // Documents
  { id: 'doc1', type: 'document', title: 'FIR Complaint Template', desc: 'Standard format for filing a First Information Report (FIR) with the police.', filePath: 'templates/fir-template.txt' },
  { id: 'doc2', type: 'document', title: 'Domestic Violence Complaint', desc: 'Template for reporting domestic abuse incidents under the DV Act.', filePath: 'templates/domestic-violence-template.txt' },
  { id: 'doc3', type: 'document', title: 'Workplace Harassment Form', desc: 'Formal complaint structure for Internal Complaints Committee (ICC).', filePath: 'templates/workplace-harassment-template.txt' },
  { id: 'doc4', type: 'document', title: 'Cyber Crime Report Format', desc: 'Format for reporting online harassment, stalking, or fraud.', filePath: 'templates/cybercrime-template.txt' },
  
  // Government Links
  { id: 'gov1', type: 'government', title: 'National Commission for Women', desc: 'Official body for protecting and promoting women\'s interests in India.', link: 'https://www.ncw.gov.in/' },
  { id: 'gov2', type: 'government', title: 'Cyber Crime Portal', desc: 'Report cyber crimes online via the Ministry of Home Affairs.', link: 'https://cybercrime.gov.in' },
  { id: 'gov3', type: 'government', title: 'NALSA (Legal Aid)', desc: 'Free legal services for eligible women and marginalized groups.', link: 'https://nalsa.gov.in' },
  
  // Articles
  { id: 'art1', type: 'article', title: 'Domestic Violence Act 2005', desc: 'Understanding your rights against physical, emotional, and economic abuse.', content: 'The Protection of Women from Domestic Violence Act 2005 is an Act of the Parliament of India enacted to protect women from domestic violence. It covers physical, emotional, sexual, verbal, and economic abuse.' },
  { id: 'art2', type: 'article', title: 'Zero FIR Explained', desc: 'Learn how you can file an FIR in any police station regardless of jurisdiction.', content: 'A Zero FIR can be filed in any police station irrespective of the place of incident or jurisdiction. The police station registering the Zero FIR is required to transfer it to the jurisdictional police station for investigation.' },
  { id: 'art3', type: 'article', title: 'Workplace Harassment (POSH)', desc: 'Key features of the Prevention of Sexual Harassment (POSH) Act.', content: 'The POSH Act mandates that every employer must constitute an Internal Complaints Committee (ICC) at each office or branch with 10 or more employees. It defines sexual harassment and provides a redressal mechanism.' },
  
  // Videos
  { id: 'vid1', type: 'video', title: 'Know Your Rights: FIR', desc: 'Video guide on how to file an FIR correctly.', link: 'https://www.youtube.com/live/40e9sFm9Nko?si=RFesbQb5ak1w5ujB' }, // Placeholder ID
  { id: 'vid2', type: 'video', title: 'Women Safety Laws', desc: 'Overview of major safety laws every woman should know.', link: 'https://youtu.be/h4HgIwaXshg?si=lpfQoQQVK2nVMNul' }
];

function initResourcesPage() {
  // Check if we're on the resources page by verifying the main container exists
  const grid = document.getElementById('resourcesGrid');
  if (!grid) return; // Not on resources page or grid doesn't exist
  
  // Only initialize if the new filter/search elements exist (from script.js design)
  const searchInput = document.getElementById('resourceSearchInput');
  const filterChips = document.querySelectorAll('.filter-chip');
  
  if (searchInput && filterChips.length > 0) {
    // New design initialization
    renderResources('all');

    // Filter Buttons
    filterChips.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all
        filterChips.forEach(b => b.classList.remove('active'));
        // Add to clicked
        e.target.classList.add('active');
        // Render
        const activeCategory = e.target.dataset.category;
        const searchTerm = document.getElementById('resourceSearchInput').value.toLowerCase();
        renderResources(activeCategory, searchTerm);
      });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const activeCategory = document.querySelector('.filter-chip.active');
      const category = activeCategory ? activeCategory.dataset.category : 'all';
      renderResources(category, term);
    });
  }
  
  // The resources.html page has its own inline JavaScript that handles:
  // - Search functionality (id="resourceSearch")  
  // - Category filters (commented out)
  // - Bookmark functionality
  // - Document downloads
  // - Emergency buttons
  // This function only handles the alternative implementation if it exists
}

function renderResources(category, searchTerm = '') {
  const grid = document.getElementById('resourcesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const savedIds = JSON.parse(localStorage.getItem('wlr_saved_resources') || '[]');

  const filtered = resourcesData.filter(item => {
    // Category Filter
    if (category === 'saved') {
      if (!savedIds.includes(item.id)) return false;
    } else if (category !== 'all' && item.type !== category) {
      return false;
    }

    // Search Filter
    if (searchTerm) {
      const match = item.title.toLowerCase().includes(searchTerm) || item.desc.toLowerCase().includes(searchTerm);
      if (!match) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">No resources found matching your criteria.</div>`;
    return;
  }
  filtered.forEach(item => {
    const isSaved = savedIds.includes(item.id);
    const card = document.createElement('div');
    card.className = 'res-card';
    
    let actionHtml = '';
    let icon = '';

    switch(item.type) {
      case 'document':
        icon = '📄';
        actionHtml = `<button onclick="downloadResource('${item.filePath}', '${item.title}')" class="btn-res download"><i class="fas fa-download"></i> Download Template</button>`;
        break;
      case 'government':
        icon = '🏛️';
        actionHtml = `<a href="${item.link}" target="_blank" class="btn-res link"><i class="fas fa-external-link-alt"></i> Visit Website</a>`;
        break;
      case 'article':
        icon = '📖';
        actionHtml = `<button onclick="readArticle('${item.id}')" class="btn-res read"><i class="fas fa-book-open"></i> Read More</button>`;
        break;
      case 'video':
        icon = '🎥';
        actionHtml = `<a href="${item.link}" target="_blank" class="btn-res link"><i class="fas fa-play"></i> Watch Video</a>`;
        break;
    }

    card.innerHTML = `
      <div class="res-content">
        <div class="res-type">${icon} ${item.type}</div>
        <h3 class="res-title">${item.title}</h3>
        <p class="res-desc">${item.desc}</p>
      </div>
      <div class="res-action">
        ${actionHtml}
      </div>
    `;
    grid.appendChild(card);
  });
}

function toggleResourceSave(id) {
  let savedIds = JSON.parse(localStorage.getItem('wlr_saved_resources') || '[]');
  if (savedIds.includes(id)) {
    savedIds = savedIds.filter(sid => sid !== id);
  } else {
    savedIds.push(id);
  }
  localStorage.setItem('wlr_saved_resources', JSON.stringify(savedIds));
  
  // Re-render to update UI
  const activeCategory = document.querySelector('.filter-chip.active').dataset.category;
  const searchTerm = document.getElementById('resourceSearchInput').value.toLowerCase();
  renderResources(activeCategory, searchTerm);
}

async function downloadResource(filePath, title) {
  if (typeof window.jspdf === 'undefined') {
    alert("⚠️ PDF library is not loaded. Please check your internet connection.");
    return;
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    const text = await response.text();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    
    const lines = doc.splitTextToSize(text, maxLineWidth);
    doc.text(lines, margin, 20);
    
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("⚠️ Error downloading template. Please try again.");
  }
}

function readArticle(id) {
  const item = resourcesData.find(r => r.id === id);
  if (!item) return;
  
  // Simple modal for reading
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;padding:25px;border-radius:12px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;position:relative;">
      <button id="closeArticleBtn" style="position:absolute;right:15px;top:15px;border:none;background:none;font-size:1.5rem;cursor:pointer;">&times;</button>
      <h2 style="margin-top:0;color:#333;">${item.title}</h2>
      <div style="line-height:1.6;color:#555;">
        <p>${item.content}</p>
        <p><em>(Full legal text would appear here in a production environment.)</em></p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  document.getElementById('closeArticleBtn').onclick = close;
  modal.onclick = (e) => { if(e.target === modal) close(); };
}

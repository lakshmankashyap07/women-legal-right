// ================================
// Women Legal Chatbot - Server.js (with CSV + Gemini AI)
// ================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const stringSimilarity = require("string-similarity"); // Moved to top
require("dotenv").config();

const app = express();

// ✅ Allow CORS for frontend (for both PC and phone)
app.use(cors({
  origin: true, // allow all origins including null (file:// protocol)
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ✅ Serve static files from public directory
app.use(express.static('public'));

// ✅ Multer for file uploads
// Configure storage to preserve file extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage: storage });

// ✅ Global Variables
let legalData = [];
let genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

// ✅ MongoDB Connection
// ✅ MongoDB Connection (Vercel safe)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/womenlegalchatbot';

  try {
    const db = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Add a timeout to prevent hanging on connection attempts
      serverSelectionTimeoutMS: 5000
    });

    isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    // Re-throw the error to be handled by the calling middleware
    throw err;
  }
};

// ✅ Connect to DB on every request (Vercel/Serverless requirement)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (dbError) {
    // If the database connection fails, send a service unavailable error
    console.error('DATABASE CONNECTION FAILED FOR REQUEST:', dbError.message);
    res.status(503).json({ error: 'Could not connect to the database. The service is temporarily unavailable.' });
  }
});

// ✅ Serve Uploads Directory (for profile images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  profile: { type: Object, default: {} },
  resetToken: String,
  resetTokenExpiry: Date,
  resetOtpAttempts: { type: Number, default: 0 },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: String,
  twoFactorCodeExpiry: Date,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

// ✅ Gmail Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ============================
// 🔹 Signup
// ============================
app.post("/signup", async (req, res) => {
  console.log("📝 Signup request:", req.body);
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required!" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists!" });

    const hashedPass = await bcrypt.hash(password, 10);
    
    const adminEmails = [
      "lakshmankashyap.yt@gmail.com",
      "kriyay3@gmail.com",
      "myadav07012006@gmail.com",
      "awasthimanjari50@gmail.com"
    ];
    const role = adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
    const user = new User({ name, email, password: hashedPass, role });
    await user.save();

    console.log("✅ User registered:", email);
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("🔥 Signup error:", err.message);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// ============================
// 🔹 Login
// ============================
app.post("/login", async (req, res) => {
  console.log("📩 Login request:", req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required!" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User not found!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ error: "Invalid password!" });

    // Check if user should be admin (for existing users)
    const adminEmails = [
      "lakshmankashyap.yt@gmail.com",
      "kriyay3@gmail.com",
      "myadav07012006@gmail.com",
      "awasthimanjari50@gmail.com"
    ];
    if (adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (excluding password) for frontend
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      lastLogin: user.lastLogin,
      createdAt: user.createdAt || user._id.getTimestamp()
    };

    console.log("✅ Login successful:", email);
    res.json({ message: "Login successful", user: userData });
  } catch (err) {
    console.error("🔥 Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ============================
// 🔹 Forgot Password
// ============================
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    user.resetOtpAttempts = 0;
    await user.save();

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("⚠️ SMTP not configured. OTP:", otp);
      return res.json({
        message: "OTP generated! Check server console (SMTP not configured)."
      });
    }

    await transporter.sendMail({
      from: `"Women Legal Bot" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Code — Women Legal Rights",
      html: `<p>You requested a password reset.</p>
             <p>Your verification code is:</p>
             <h2 style="color: #0066cc;">${otp}</h2>
             <p>This code is valid for 5 minutes.</p>`
    });

    console.log("✉️ Reset email sent:", email);
    res.json({ message: "Verification code sent to your email!" });
  } catch (err) {
    console.error("🔥 Forgot-password error:", err.message);
    res.status(500).json({ error: "Server error in forgot-password" });
  }
});

// ============================
// 🔹 Validate Token
// ============================
app.get("/validate-reset", async (req, res) => {
  const { token, email } = req.query;
  try {
    const user = await User.findOne({ email, resetToken: token });
    if (!user || user.resetTokenExpiry < Date.now())
      return res.status(400).json({ valid: false, error: "Invalid or expired token" });
    res.json({ valid: true });
  } catch (err) {
    console.error("validate-reset error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// 🔹 Reset Password
// ============================
app.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    // Check expiry
    if (!user.resetToken || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check attempts
    if (user.resetOtpAttempts >= 3) {
      return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP
    if (user.resetToken !== token) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    console.log("✅ Password reset successful for:", email);
    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("🔥 Reset-password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// 🔹 Profile Persistence
// ============================
app.post("/update-profile", async (req, res) => {
  try {
    const { email, profile } = req.body;
    if (!email || !profile) return res.status(400).json({ error: "Missing email or profile data" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.profile = profile;
    // Sync name if present
    if (profile.fullName) user.name = profile.fullName;
    
    await user.save();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("🔥 Update profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/get-profile", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Select all fields except sensitive ones
    const user = await User.findOne({ email }).select('-password -resetToken -resetTokenExpiry -twoFactorCode -twoFactorCodeExpiry -resetOtpAttempts');
    if (!user) return res.status(404).json({ error: "User not found" });

    // Combine base user data with the profile sub-document for a complete view.
    const userProfileData = {
      fullName: user.name,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      ...(user.profile || {}), // Spread fields from the profile object
    };

    res.json(userProfileData);
  } catch (err) {
    console.error("🔥 Get profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Upload Profile Image Endpoint
app.post("/upload-profile-image", upload.single('profileImage'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    // Return the full URL to the image
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error("🔥 Image upload error:", err.message);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// ============================
// 🔹 Profile Management
// ============================
app.get("/profile", async (req, res) => {
  try {
    // In a real app, you'd get user ID from session/token
    // For now, return a placeholder profile
    const profile = {
      firstName: "User",
      lastName: "",
      email: "",
      gender: "",
      location: "",
      bio: "",
      picture: null
    };
    res.json(profile);
  } catch (err) {
    console.error("🔥 Profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/profile", async (req, res) => {
  try {
    const profileData = req.body;
    // In a real app, save to database with user authentication
    console.log("📝 Profile update:", profileData);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("🔥 Profile update error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// 🔹 Admin: Get Users
// ============================
app.get("/admin/users", async (req, res) => {
  try {
    const { email, page = 1, limit = 10 } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Admin email is required for authorization." });
    }

    // NOTE: For a production app, authentication should be handled via JWT or sessions,
    // not by passing an email in the query string, which is insecure.
    const adminUser = await User.findOne({ email });
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find()
      .select('-password -resetToken -resetTokenExpiry -twoFactorCode -twoFactorCodeExpiry -resetOtpAttempts') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalUsers = await User.countDocuments();

    res.json({
      users,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
      totalUsers,
    });
  } catch (err) {
    console.error("🔥 Admin get users error:", err.message);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

// ============================
// 🔹 Change Password
// ============================
app.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required!" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found!" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect!" });
    }

    // Hash new password and save
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    console.log("✅ Password changed successfully for:", email);
    res.json({ message: "Password changed successfully!" });
  } catch (err) {
    console.error("🔥 Change password error:", err.message);
    res.status(500).json({ error: "Server error during password change" });
  }
});

// ============================
// 🔹 Send 2FA Code
// ============================
app.post("/send-2fa", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required!" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found!" });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

    // Save code to user document
    user.twoFactorCode = verificationCode;
    user.twoFactorCodeExpiry = expiryTime;
    await user.save();

    console.log("📧 2FA Code for", email, ":", verificationCode);

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("⚠️ SMTP not configured. 2FA code:", verificationCode);
      return res.json({
        message: "Verification code generated! Check the server console for the code (SMTP not configured for development).",
        devCode: verificationCode // Only for development
      });
    }

    // Send email with verification code
    await transporter.sendMail({
      from: `"Women Legal Bot" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Two-Factor Authentication Code — Women Legal Rights",
      html: `<p>Your verification code for Two-Factor Authentication is:</p>
             <h2 style="color: #0066cc; font-weight: bold;">${verificationCode}</h2>
             <p>This code is valid for 10 minutes.</p>
             <p>If you didn't request this, please ignore this email.</p>`
    });

    console.log("✉️ 2FA code email sent to:", email);
    res.json({ message: "Verification code sent to your email!" });
  } catch (err) {
    console.error("🔥 Send 2FA error:", err.message);
    res.status(500).json({ error: "Server error sending 2FA code" });
  }
});

// ============================
// 🔹 Verify 2FA Code
// ============================
app.post("/verify-2fa", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required!" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found!" });
    }

    // Check if code matches and is not expired
    if (user.twoFactorCode !== code) {
      return res.status(400).json({ error: "Invalid verification code!" });
    }

    if (Date.now() > user.twoFactorCodeExpiry) {
      return res.status(400).json({ error: "Verification code has expired! Request a new code." });
    }

    // Enable 2FA and clear the code
    user.twoFactorEnabled = true;
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpiry = undefined;
    await user.save();

    console.log("✅ 2FA enabled for:", email);
    res.json({ message: "Two-Factor Authentication has been successfully enabled!" });
  } catch (err) {
    console.error("🔥 Verify 2FA error:", err.message);
    res.status(500).json({ error: "Server error verifying 2FA code" });
  }
});

// ============================
// 🔹 Health Check
// ============================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    csvDataLoaded: legalData.length,
    aiEnabled: !!genAI
  });
});
const loadCSVData = () => {
  // Check if CSV file exists
  if (!fs.existsSync("legal_faq.csv")) {
    console.log("⚠️ legal_faq.csv not found. AI-only mode enabled.");
    genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
    return;
  }

  const tempLegalData = [];
  // Load legal_faq.csv
  fs.createReadStream("legal_faq.csv")
    .pipe(csv())
    .on("data", (row) => {
      // Normalize row to consistent format
      const normalized = {
        keyword: row.question_keyword || row.keywords || row.keyword || "",
        question: row.question || row.question_en || row.question_keyword || row.keywords || row.keyword || "",
        answer: row.answer || row.answer_en || "",
        law_reference: row.law_reference || ""
      };
      tempLegalData.push(normalized);
    })
    .on("end", () => {
      legalData = tempLegalData;
      console.log("✅ CSV data loaded:", legalData.length, "rows from legal_faq.csv");
      genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
    })
    .on("error", (err) => {
      console.error("❌ Error loading CSV:", err.message);
      genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
    });
};

loadCSVData(); // Load data on startup

// ============================
// 🔹 Gemini AI Chat + CSV Fallback
// ============================

app.post("/chat", upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'file', maxCount: 1 }]), async (req, res) => {
  let message = req.body.message;
  let audio = req.files && req.files.audio ? req.files.audio[0] : null;
  let file = req.files && req.files.file ? req.files.file[0] : null;

  console.log("💬 Chat request:", { message: message?.substring(0, 100), audio: !!audio, file: !!file });

  try {
    if (!message && !audio && !file) {
      return res.status(400).json({ reply: "Please provide a message, audio, or file." });
    }

    // Handle audio or file input (for now, just acknowledge)
    if (audio) {
      message = "User sent an audio message.";
    } else if (file) {
      message = `User uploaded a file: ${file.originalname}`;
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({ reply: "Please enter a message." });
    }

    // Step 1: Try smart matching from CSV using string similarity on questions
    if (legalData.length > 0) {
      const allQuestions = legalData.map((q) => q.question.toLowerCase());
      const bestMatch = stringSimilarity.findBestMatch(message.toLowerCase(), allQuestions);
      const best = bestMatch.bestMatch;

      if (best.rating > 0.3) { // Lower threshold for better matching
        const found = legalData[bestMatch.bestMatchIndex];
        console.log("📄 Matched CSV:", found.question);

        let reply = `${found.answer}`;
        if (found.law_reference) reply += `\n📘 Related Law: ${found.law_reference}`;
        return res.json({ reply });
      }
    }

    // Step 2: If no CSV match, fallback to Gemini AI
    if (!genAI) {
      return res.json({ reply: "AI service is currently unavailable. Please try again later or contact support." });
    }

    // 🧠 Strong System Instruction for Persona & Safety
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "You are a dedicated legal assistant for women in India. Your name is 'Women Legal Bot'. You provide accurate, empathetic, and safe legal guidance regarding Indian laws (IPC, CrPC, Domestic Violence Act, POSH, etc.). \n\nGuidelines:\n1. **Empathy First**: Always acknowledge the user's distress if apparent.\n2. **Legal Accuracy**: Cite relevant Indian laws/sections where applicable (e.g., 'Section 498A of IPC').\n3. **Safety Priority**: If the user is in immediate danger, urge them to call 112 or 181 immediately.\n4. **Conciseness**: Keep answers easy to understand, avoiding overly complex jargon.\n5. **Scope**: If asked about non-legal topics, politely decline and offer legal help instead."
    });

    // 🗣️ Start Chat with History (Natural Conversation)
    const history = req.body.history || [];
    const chat = model.startChat({ history: history });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const reply = response.text();

    console.log("🤖 Gemini Reply:", reply.substring(0, 100) + "...");
    res.json({ reply });
  } catch (err) {
    console.error("🔥 Chat error:", err.message);
    res.status(500).json({ reply: "I'm experiencing technical difficulties. Please try again in a moment." });
  }
});

  // ============================
  // 🔹 Send Email Endpoint (supports JSON body or multipart with `attachment`)
  // ============================
  app.post('/send-email', upload.single('attachment'), async (req, res) => {
    try {
      // Support both JSON and multipart/form-data
      let to = req.body.to || req.body.recipients || req.body.email;
      const subject = req.body.subject || 'Support Request from Women Legal Bot';
      const text = req.body.text || req.body.message || '';
      const html = req.body.html || text.replace(/\n/g, '<br/>');

      if (!to) return res.status(400).json({ error: 'No recipients provided' });

      // Normalize `to` into an array or comma-separated string acceptable by nodemailer
      if (typeof to === 'string') {
        // try parse JSON array
        try {
          const parsed = JSON.parse(to);
          if (Array.isArray(parsed)) to = parsed;
        } catch (e) {
          // fallback to comma separated
          to = to.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const attachments = [];
      if (req.file) {
        attachments.push({ filename: req.file.originalname || req.file.filename, path: req.file.path });
      }

      await transporter.sendMail({
        from: `"Women Legal Bot" <${process.env.SMTP_USER || 'no-reply@womenlegal.local'}>`,
        to,
        subject,
        text,
        html,
        attachments
      });

      console.log('✉️ Sent support email to:', Array.isArray(to) ? to.join(',') : to);
      res.json({ message: 'Email sent successfully' });
    } catch (err) {
      console.error('🔥 send-email error:', err);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

// ✅ Catch-all handler: serve index.html for client-side routing
app.get('*', (req, res) => {
  // Only serve index.html for routes that don't match files
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`);
    console.log(`📧 SMTP configured: ${!!process.env.SMTP_USER}`);
    
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log(`🤖 AI enabled: ${!!apiKey} (Key loaded starts with: ${apiKey ? apiKey.substring(0, 6) + '...' : 'None'})`);
    console.log(`📄 CSV data loaded: ${legalData.length} entries`);
  });
}

module.exports = app;
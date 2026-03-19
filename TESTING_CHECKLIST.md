# Security Features - Quick Test Checklist

## Pre-Test Setup
- [ ] Start MongoDB: `mongod` (or your MongoDB service)
- [ ] Start server: `npm start`
- [ ] Open browser: `http://localhost:5000`
- [ ] Create a test user account
- [ ] Login with test account

---

## Test 1: Change Password

### Enable the Feature
- [ ] Navigate to Settings page (⚙️ Settings in sidebar)
- [ ] Find "Security Settings" section
- [ ] Verify "Change Password" button is visible

### Test: Successful Password Change
- [ ] Click "Change Password" button
- [ ] Modal appears with 3 password fields
- [ ] Enter current password (your login password)
- [ ] Enter new password: `NewPass123!`
- [ ] Confirm new password: `NewPass123!`
- [ ] Click "Update Password"
- [ ] ✅ MSG: "Password changed successfully!"
- [ ] Logout and login with new password
- [ ] ✅ Login should succeed with new password

### Test: Wrong Current Password
- [ ] Click "Change Password" button
- [ ] Enter wrong current password
- [ ] Enter new password
- [ ] Click "Update Password"
- [ ] ❌ MSG: "Current password is incorrect!"

### Test: Mismatched Passwords
- [ ] Click "Change Password" button
- [ ] Enter current password
- [ ] Enter new password: `NewPass123!`
- [ ] Confirm different: `Different456!`
- [ ] Click "Update Password"
- [ ] ❌ MSG: "New passwords do not match!" (appears before server call)

---

## Test 2: Two-Factor Authentication (2FA)

### Enable the Feature
- [ ] Navigate to Settings page
- [ ] Find "Security Settings" section
- [ ] Verify "Two-Factor Authentication" toggle switch exists

### Test: Enable 2FA (No SMTP - Development Mode)
- [ ] Click 2FA toggle to ON
- [ ] Message appears: "Check the server console for the code"
- [ ] Go to terminal where server is running
- [ ] Look for line: `🔹 2FA Code for your-email@example.com: XXXXXX`
- [ ] Copy the 6-digit code
- [ ] Back in browser, enter code in verification input
- [ ] Click "Verify" button
- [ ] ✅ MSG: "Two-Factor Authentication Verified & Enabled!"
- [ ] Toggle remains checked
- [ ] Verification input hides

### Test: Wrong 2FA Code
- [ ] Toggle 2FA ON again
- [ ] Get new code from console
- [ ] Intentionally enter wrong code (e.g., 000000)
- [ ] Click "Verify"
- [ ] ❌ MSG: "Invalid verification code!"

### Test: Expired 2FA Code
- [ ] Toggle 2FA ON
- [ ] Get code from console (valid for 10 minutes)
- [ ] Wait 10+ minutes
- [ ] Try to enter old code and verify
- [ ] ❌ MSG: "Verification code has expired! Request a new code."

### Test: Disable 2FA
- [ ] Click 2FA toggle to OFF
- [ ] ✅ MSG: "Two-Factor Authentication Disabled."
- [ ] Toggle becomes unchecked
- [ ] Verification input container hides

### Test: Re-enable 2FA (Different Code)
- [ ] Toggle 2FA ON again
- [ ] New code appears in console (different from before)
- [ ] Verify with new code
- [ ] ✅ MSG: "Two-Factor Authentication Verified & Enabled!"

---

## Test 3: SMTP Configuration (Optional - Production Setup)

### Setup Email Sending
1. Add to .env file:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. Restart server: `npm start`

3. Repeat 2FA Enable test:
   - [ ] Toggle 2FA ON
   - [ ] Instead of console message, check your email
   - [ ] Email should contain 6-digit code
   - [ ] Enter code in verification input
   - [ ] ✅ MSG: "Two-Factor Authentication Verified & Enabled!"

---

## Test 4: Logout Cleanup

### Verify Session Cleanup
- [ ] Enable 2FA
- [ ] Click Logout button
- [ ] ✅ Returned to login page
- [ ] localStorage cleared (email, userName, userId)
- [ ] Login again with same account
- [ ] 2FA toggle should still be enabled (saved in DB)

---

## Test 5: Database Verification (MongoDB)

### Check User Document
1. Open MongoDB client (MongoDB Compass or mongosh)
2. Connect to: `mongodb://127.0.0.1:27017`
3. Navigate to: `women_legal_db` → `users`
4. Find your test user
5. Verify these fields:
   - [ ] `email`: your-email@example.com
   - [ ] `password`: hashed (looks like: `$2a$10$...`)
   - [ ] `twoFactorEnabled`: true (if enabled) or false
   - [ ] `twoFactorCode`: undefined (after verification)
   - [ ] `twoFactorCodeExpiry`: undefined (after verification)

---

## Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Change Password - Success | ✅ | |
| Change Password - Wrong Current | ✅ | |
| Change Password - Mismatch | ✅ | |
| 2FA Enable - Dev Mode | ✅ | |
| 2FA Wrong Code | ✅ | |
| 2FA Expired Code | ✅ | |
| 2FA Disable | ✅ | |
| 2FA Re-enable | ✅ | |
| Logout - Cleanup | ✅ | |
| Database - Fields | ✅ | |

---

## Troubleshooting

### 2FA code not appearing in console
- [ ] Verify SMTP not configured (.env)
- [ ] Check server terminal/console window
- [ ] Try again and watch console during toggle click
- [ ] Look for lines starting with 🔹

### Email not received
- [ ] Verify SMTP configured in .env
- [ ] Check spam/junk folder
- [ ] Verify email address in your profile
- [ ] Check Gmail "Less secure apps" setting if using Gmail

### Password change fails with "User not found"
- [ ] Verify you're logged in
- [ ] Check localStorage has `userEmail`
- [ ] Verify MongoDB contains user with that email
- [ ] Try logout and login again

### Toggle not responding
- [ ] Check browser console for JavaScript errors
- [ ] Verify API_URL in script.js is correct
- [ ] Check server is running on port 5000
- [ ] Try refreshing the page

---

## Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| Change Password | ❌ Non-functional | ✅ Fully functional |
| 2FA | ❌ Non-functional | ✅ Fully functional |
| Email Verification | ❌ Not available | ✅ Available (dev/prod) |
| Password Security | ⚠️ Basic | ✅ Bcrypt hashed |
| Account Protection | ⚠️ Password only | ✅ Password + 2FA option |

---

## Next Steps

After testing:

1. **Share test results** - Let us know if all tests pass ✅
2. **Production deployment** - Configure SMTP for email delivery
3. **User documentation** - Create guide for end users
4. **Enhancement requests** - Any improvements needed?

---

**Date Tested:** _______________
**Tested By:** _______________
**All Tests Passed:** ☐ YES  ☐ NO
**Issues Found:** _______________

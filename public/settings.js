/**
 * Settings Service
 * Handles data persistence using localStorage.
 */
const SettingsService = {
    getSettings() {
        return {
            darkMode: localStorage.getItem('darkMode') === 'true',
            fontSize: localStorage.getItem('fontSize') || 'medium',
            chatNotifications: localStorage.getItem('chatNotifications') !== 'false',
            legalUpdates: localStorage.getItem('legalUpdates') !== 'false',
            saveHistory: localStorage.getItem('saveHistory') !== 'false',
            twoFactorAuth: localStorage.getItem('twoFactorAuth') === 'true',
            panicMode: localStorage.getItem('panicMode') === 'true',
            language: localStorage.getItem('language') || 'en',
            jurisdiction: localStorage.getItem('jurisdiction') || 'all'
        };
    },

    saveSetting(key, value) {
        localStorage.setItem(key, value);
    },

    getChatHistory() {
        const email = localStorage.getItem('userEmail');
        const key = email ? `chatHistory_${email}` : 'chatHistory';
        return localStorage.getItem(key) || '';
    },

    clearChatHistory() {
        const email = localStorage.getItem('userEmail');
        const key = email ? `chatHistory_${email}` : 'chatHistory';
        localStorage.removeItem(key);
    },

    deleteAllData() {
        localStorage.clear();
    }
};

/**
 * UI Controller
 * Handles DOM interactions and updates.
 */
const SettingsUI = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadInitialState();
        this.loadAccountHistory();
    },

    cacheDOM() {
        this.dom = {
            themeSwitch: document.getElementById('themeSwitch'),
            fontSizeSelect: document.getElementById('fontSizeSelect'),
            chatNotifications: document.getElementById('chatNotifications'),
            legalUpdates: document.getElementById('legalUpdates'),
            saveHistory: document.getElementById('saveHistory'),
            twoFactorSwitch: document.getElementById('2faSwitch'),
            twoFactorContainer: document.getElementById('2fa-verification-container'),
            panicModeSwitch: document.getElementById('panicModeSwitch'),
            languageSelect: document.getElementById('language-select'),
            jurisdictionSelect: document.getElementById('jurisdictionSelect'),
            
            exportDataBtn: document.getElementById('exportDataBtn'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            // Note: ID in HTML was updated to match these
            clearHistoryBtnAlt: document.getElementById('clearHistoryBtn'), 
            deleteAccountBtn: document.getElementById('deleteAccountBtn')
        };
    },

    bindEvents() {
        // 1. Dark Mode
        this.dom.themeSwitch?.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            SettingsService.saveSetting('darkMode', isEnabled);
            this.applyTheme(isEnabled);
        });

        // 2. Font Size
        this.dom.fontSizeSelect?.addEventListener('change', (e) => {
            const size = e.target.value;
            SettingsService.saveSetting('fontSize', size);
            this.applyFontSize(size);
        });

        // 3. Chat History Toggle
        this.dom.saveHistory?.addEventListener('change', (e) => {
            SettingsService.saveSetting('saveHistory', e.target.checked);
        });

        // 4. Export Data
        this.dom.exportDataBtn?.addEventListener('click', () => this.handleExportData());

        // 5. Clear History
        const clearBtn = this.dom.clearHistoryBtn || this.dom.clearHistoryBtnAlt;
        clearBtn?.addEventListener('click', () => this.handleClearHistory());

        // 6. Delete Account
        this.dom.deleteAccountBtn?.addEventListener('click', () => this.handleDeleteAccount());

        // 7. Two-Factor Auth
        this.dom.twoFactorSwitch?.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            SettingsService.saveSetting('twoFactorAuth', isEnabled);
            this.toggle2FAUI(isEnabled);
        });

        // 8. Panic Mode
        this.dom.panicModeSwitch?.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            SettingsService.saveSetting('panicMode', isEnabled);
            this.togglePanicMode(isEnabled);
        });

        // Others
        this.dom.chatNotifications?.addEventListener('change', (e) => 
            SettingsService.saveSetting('chatNotifications', e.target.checked));
        
        this.dom.legalUpdates?.addEventListener('change', (e) => 
            SettingsService.saveSetting('legalUpdates', e.target.checked));
            
        this.dom.languageSelect?.addEventListener('change', (e) => 
            SettingsService.saveSetting('language', e.target.value));

        this.dom.jurisdictionSelect?.addEventListener('change', (e) => 
            SettingsService.saveSetting('jurisdiction', e.target.value));
    },

    loadInitialState() {
        const settings = SettingsService.getSettings();

        // Apply Theme
        if (this.dom.themeSwitch) this.dom.themeSwitch.checked = settings.darkMode;
        this.applyTheme(settings.darkMode);

        // Apply Font Size
        if (this.dom.fontSizeSelect) this.dom.fontSizeSelect.value = settings.fontSize;
        this.applyFontSize(settings.fontSize);

        // Apply Toggles
        if (this.dom.chatNotifications) this.dom.chatNotifications.checked = settings.chatNotifications;
        if (this.dom.legalUpdates) this.dom.legalUpdates.checked = settings.legalUpdates;
        if (this.dom.saveHistory) this.dom.saveHistory.checked = settings.saveHistory;
        if (this.dom.panicModeSwitch) this.dom.panicModeSwitch.checked = settings.panicMode;
        
        // Apply 2FA
        if (this.dom.twoFactorSwitch) this.dom.twoFactorSwitch.checked = settings.twoFactorAuth;
        this.toggle2FAUI(settings.twoFactorAuth);

        if (this.dom.languageSelect) this.dom.languageSelect.value = settings.language;
        if (this.dom.jurisdictionSelect) this.dom.jurisdictionSelect.value = settings.jurisdiction;
    },

    loadAccountHistory() {
        const lastLogin = localStorage.getItem('userLastLogin');
        const createdAt = localStorage.getItem('userCreatedAt');
        
        const lastLoginEl = document.getElementById('lastLoginInfo');
        const createdEl = document.getElementById('accountCreatedInfo');

        if (lastLoginEl && lastLogin) {
            lastLoginEl.textContent = new Date(lastLogin).toLocaleString();
        }
        if (createdEl && createdAt) {
            createdEl.textContent = new Date(createdAt).toLocaleDateString();
        }
    },

    applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    },

    applyFontSize(size) {
        const sizes = {
            'small': '14px',
            'medium': '16px',
            'large': '18px'
        };
        document.body.style.fontSize = sizes[size] || '16px';
    },

    toggle2FAUI(isEnabled) {
        if (this.dom.twoFactorContainer) {
            this.dom.twoFactorContainer.style.display = isEnabled ? 'block' : 'none';
        }
    },

    togglePanicMode(isEnabled) {
        // Update the global panic mode state
        if (typeof wlrPanicActive !== 'undefined') {
            wlrPanicActive = isEnabled;
        }
        
        if (isEnabled) {
            // Activate panic mode - show emergency modal with all features
            if (typeof showEmergency === 'function') {
                showEmergency();
            }
            
            // Automatically send live location to admins
            if (typeof getLocationLink === 'function') {
                getLocationLink().then(link => {
                    const recipients = [
                        'lakshmankashyap.yt@gmail.com',
                        'Kriyay3@gmail.com',
                        'myadav07012006@gmail.com',
                        'awasthimanjari50@gmail.com'
                    ];
                    const uName = localStorage.getItem('userName') || 'Anonymous';
                    const uEmail = localStorage.getItem('userEmail') || 'Unknown';
                    const apiUrl = (typeof API_URL !== 'undefined') ? API_URL : "http://localhost:5000";
                    const locationMsg = link ? `Location: ${link}` : 'Location: Unavailable (User denied permission or GPS error)';

                    fetch(`${apiUrl}/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: recipients,
                            subject: `🚨 PANIC MODE ALERT: ${uName}`,
                            text: `EMERGENCY ALERT\n\nUser: ${uName} (${uEmail})\nhas activated PANIC MODE via Settings.\n\nTime: ${new Date().toLocaleString()}\n${locationMsg}\n\nPlease take immediate action.`
                        })
                    }).catch(err => console.error('Failed to send panic email', err));
                });
            }

            // Mute audio elements
            document.querySelectorAll('audio,video').forEach(el => el.muted = true);
            alert('🚨 PANIC MODE ACTIVATED!\n\nEmergency features enabled:\n• SOS alerts ready\n• Location sharing active\n• Helpline numbers displayed\n• Silent mode on\n• Emergency guidance available');
        } else {
            // Deactivate panic mode
            document.querySelectorAll('audio,video').forEach(el => el.muted = false);
            // Close emergency modal if open
            const modal = document.getElementById('wlrEmergencyModal');
            if (modal) {
                modal.style.display = 'none';
                if (typeof stopAllMedia === 'function') {
                    stopAllMedia();
                }
                document.body.style.overflow = '';
            }
            alert('Panic mode deactivated.');
        }
    },

    handleExportData() {
        const data = SettingsService.getChatHistory();
        if (!data || data === '[]' || data === '{}') {
            alert('No chat history available to export.');
            return;
        }

        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    handleClearHistory() {
        if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
            SettingsService.clearChatHistory();
            alert('Chat history cleared successfully.');
            location.reload();
        }
    },

    handleDeleteAccount() {
        if (confirm('WARNING: This will permanently delete your account and all local data. Are you sure?')) {
            SettingsService.deleteAllData();
            alert('Account deleted. Redirecting to login...');
            window.location.href = 'index.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SettingsUI.init();
});

/* ===== Profile Modal & Persistence ===== */
const ProfileService = {
    load() {
        try {
            return JSON.parse(localStorage.getItem('userProfile') || '{}');
        } catch (e) {
            return {};
        }
    },
    save(profile) {
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }
};

function showProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    populateProfileForm();

    // Populate View Data (Account Created & Last Login)
    const created = localStorage.getItem('userCreatedAt');
    const lastLogin = localStorage.getItem('userLastLogin');
    
    const createdEl = document.getElementById('viewProfileCreated');
    if (createdEl) createdEl.textContent = created ? new Date(created).toLocaleDateString() : 'N/A';
    
    const loginEl = document.getElementById('viewProfileLogin');
    if (loginEl) loginEl.textContent = lastLogin ? new Date(lastLogin).toLocaleString() : 'Just now';

    modal.classList.remove('hidden');
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function populateProfileForm() {
    const p = ProfileService.load();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('profileFirstName', p.firstName || '');
    setVal('profileLastName', p.lastName || '');
    setVal('profileUsername', p.username || '');
    setVal('profileEmail', p.email || '');
    setVal('profileContact', p.contact || '');
    setVal('profileLocation', p.location || '');

    const preview = document.getElementById('profilePreviewImg');
    const initials = document.getElementById('profileInitials');
    if (p.profileImage) {
        preview.src = p.profileImage;
        preview.style.display = 'block';
        if (initials) initials.style.display = 'none';
    } else {
        preview.style.display = 'none';
        if (initials) {
            initials.style.display = 'flex';
            initials.textContent = getInitials((p.firstName || '') + ' ' + (p.lastName || '')) || '👤';
        }
    }
}

function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,1).toUpperCase();
    return (parts[0].slice(0,1) + parts[parts.length-1].slice(0,1)).toUpperCase();
}

function setupProfileHandlers() {
    const closeBtn = document.getElementById('closeProfileBtn');
    const cancelBtn = document.getElementById('cancelProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const imageInput = document.getElementById('profileImageInput');
    const profileBtn = document.getElementById('profileBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeProfileModal);

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const dataUrl = evt.target.result;
                const preview = document.getElementById('profilePreviewImg');
                const initials = document.getElementById('profileInitials');
                if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
                if (initials) initials.style.display = 'none';
                // Temporarily store on the input element for save
                imageInput.dataset.preview = dataUrl;
            };
            reader.readAsDataURL(file);
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', () => {
        const firstName = (document.getElementById('profileFirstName') || {}).value || '';
        const lastName = (document.getElementById('profileLastName') || {}).value || '';
        const username = (document.getElementById('profileUsername') || {}).value || '';
        const email = (document.getElementById('profileEmail') || {}).value || '';
        const contact = (document.getElementById('profileContact') || {}).value || '';
        const location = (document.getElementById('profileLocation') || {}).value || '';
        const imageInputEl = document.getElementById('profileImageInput');
        const previewData = imageInputEl && imageInputEl.dataset && imageInputEl.dataset.preview;

        // Basic email validation
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        const profile = {
            firstName, lastName, username, email, contact, location,
            profileImage: previewData || ProfileService.load().profileImage || null
        };

        ProfileService.save(profile);
        updateNavbarProfile();
        closeProfileModal();
        alert('Profile saved locally.');
    });

    // Clicking the top-right navbar profile toggles modal as a convenience
    if (profileBtn) profileBtn.addEventListener('click', showProfileModal);
}

function updateNavbarProfile() {
    const p = ProfileService.load();
    const profileBtn = document.getElementById('profileBtn');
    if (!profileBtn) return;
    if (p.profileImage) {
        profileBtn.style.background = 'transparent';
        profileBtn.innerHTML = `<img src="${p.profileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        const initials = getInitials((p.firstName || '') + ' ' + (p.lastName || '')) || '👤';
        profileBtn.textContent = initials;
        profileBtn.style.fontSize = '0.95rem';
    }
}

// expose global showProfileModal for inline onclick in HTML
window.showProfileModal = showProfileModal;

document.addEventListener('DOMContentLoaded', () => {
    setupProfileHandlers();
    updateNavbarProfile();
});
/* 
─────────────────────────────────────────────
   TrustBridge Auth System  (auth.js)
   Shared across all pages.
   Credentials are persisted in localStorage.
   
───────────────────────────────────────────── 
*/

(function () {
  // ── STORAGE HELPERS 
──────────────────────────

  function getUsers() {
    try { return JSON.parse(localStorage.getItem('tb_users') || '{}'); } 
catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem('tb_users', JSON.stringify(users));
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('tb_current_user') || 
'null'); } catch { return null; }
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem('tb_current_user', 
JSON.stringify(user));
    else localStorage.removeItem('tb_current_user');
  }

  // ── PUBLIC API 
────────────────────────────────

  window.TBAuth = {
    isLoggedIn() { return !!getCurrentUser(); },
    getUser()    { return getCurrentUser(); },

    register(username, email, password) {
      username = username.trim();
      email    = email.trim().toLowerCase();

      if (!username || !email || !password) return { ok: false, err: 'All 
fields are required.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, 
err: 'Invalid email address.' };
      if (password.length < 6) return { ok: false, err: 'Password must be 
at least 6 characters.' };
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return { ok: false, err: 
'Username must be 3–20 characters (letters, numbers, underscores).' };

      const users = getUsers();
      for (const key in users) {
        if (users[key].username.toLowerCase() === username.toLowerCase()) 
return { ok: false, err: 'Username already taken.' };
        if (users[key].email === email) return { ok: false, err: 'An 
account with that email already exists.' };
      }

      const id = 'u_' + Date.now();
      users[id] = { id, username, email, password, createdAt: Date.now(), 
transactions: [] };
      saveUsers(users);

      const user = { id, username, email };
      setCurrentUser(user);
      return { ok: true, user };
    },

    login(identifier, password) {
      identifier = identifier.trim().toLowerCase();
      if (!identifier || !password) return { ok: false, err: 'Please enter 
your credentials.' };

      const users = getUsers();
      let found = null;
      for (const key in users) {
        const u = users[key];
        if ((u.username.toLowerCase() === identifier || u.email === 
identifier) && u.password === password) {
          found = u; break;
        }
      }

      if (!found) return { ok: false, err: 'Invalid username/email or 
password.' };

      const user = { id: found.id, username: found.username, email: 
found.email };
      setCurrentUser(user);
      return { ok: true, user };
    },

    logout() {
      setCurrentUser(null);
    },

    // Save a transaction ID to the current user's account
    saveTransaction(txId, txData) {
      const current = getCurrentUser();
      if (!current) return;
      const users = getUsers();
      if (!users[current.id]) return;
      if (!users[current.id].transactions) users[current.id].transactions 
= [];
      // avoid duplicates
      const idx = users[current.id].transactions.findIndex(t => t.id === 
txId);
      if (idx >= 0) users[current.id].transactions[idx] = { id: txId, 
...txData };
      else users[current.id].transactions.push({ id: txId, ...txData });
      saveUsers(users);
    },

    // Get all transactions for the current user
    getTransactions() {
      const current = getCurrentUser();
      if (!current) return [];
      const users = getUsers();
      return (users[current.id]?.transactions) || [];
    },

    // Check if a txId belongs to current user
    ownsTransaction(txId) {
      return this.getTransactions().some(t => t.id === txId);
    }
  };

  // ── AUTH MODAL HTML 
───────────────────────────

  const modalHTML = `
<div id="tb-auth-overlay" 
style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(7,26,53,0.85);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;" 
class="tb-hidden">
  <div 
style="background:white;border-radius:20px;width:100%;max-width:420px;box-shadow:0 
40px 100px rgba(0,0,0,0.4);overflow:hidden;">
    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid #e8edf5;">
      <button id="tb-tab-login" onclick="TBAuthUI.showTab('login')" 
style="flex:1;padding:1.1rem;border:none;background:none;font-family:'DM 
Sans',sans-serif;font-size:0.92rem;font-weight:700;color:#2477d4;border-bottom:3px 
solid #2477d4;cursor:pointer;transition:all 0.2s;">Sign In</button>
      <button id="tb-tab-register" onclick="TBAuthUI.showTab('register')" 
style="flex:1;padding:1.1rem;border:none;background:none;font-family:'DM 
Sans',sans-serif;font-size:0.92rem;font-weight:600;color:#8a99b3;border-bottom:3px 
solid transparent;cursor:pointer;transition:all 0.2s;">Create 
Account</button>
    </div>

    <div style="padding:2rem 2rem 1.5rem;">
      <!-- Logo -->
      <div 
style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1.5rem;">
        <div 
style="width:34px;height:34px;background:linear-gradient(135deg,#2477d4,#0ea8a8);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 24 24" width="18" height="18" 
fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 
9-12V5L12 1zm0 4.9l5 2.23V11c0 3.46-2.38 6.69-5 
7.93-2.62-1.24-5-4.47-5-7.93V8.13L12 5.9z"/></svg>
        </div>
        <span style="font-family:'Playfair 
Display',serif;font-size:1.3rem;font-weight:700;color:#0d2b52;">Trust<span 
style="color:#0ea8a8;">Bridge</span></span>
      </div>

      <!-- Error banner -->
      <div id="tb-auth-error" 
style="display:none;background:#fff5f5;border:1px solid 
#feb2b2;border-radius:8px;padding:0.65rem 
1rem;margin-bottom:1rem;font-size:0.83rem;color:#c53030;"></div>

      <!-- LOGIN FORM -->
      <div id="tb-form-login">
        <div style="margin-bottom:1rem;">
          <label 
style="font-size:0.8rem;font-weight:700;color:#4a5568;display:block;margin-bottom:0.4rem;">Username 
or Email</label>
          <input id="tb-login-identifier" type="text" 
placeholder="your_username or email@example.com" autocomplete="username" 
style="width:100%;padding:0.75rem 1rem;border:1.5px solid 
#e8edf5;border-radius:8px;font-family:'DM 
Sans',sans-serif;font-size:0.9rem;outline:none;transition:border-color 
0.2s;" onfocus="this.style.borderColor='#2477d4'" 
onblur="this.style.borderColor='#e8edf5'">
        </div>
        <div style="margin-bottom:1.4rem;">
          <label 
style="font-size:0.8rem;font-weight:700;color:#4a5568;display:block;margin-bottom:0.4rem;">Password</label>
          <input id="tb-login-password" type="password" 
placeholder="••••••••" autocomplete="current-password" 
style="width:100%;padding:0.75rem 1rem;border:1.5px solid 
#e8edf5;border-radius:8px;font-family:'DM 
Sans',sans-serif;font-size:0.9rem;outline:none;transition:border-color 
0.2s;" onfocus="this.style.borderColor='#2477d4'" 
onblur="this.style.borderColor='#e8edf5'" 
onkeydown="if(event.key==='Enter')TBAuthUI.submitLogin()">
        </div>
        <button onclick="TBAuthUI.submitLogin()" 
style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#2477d4,#1a5faa);border:none;border-radius:8px;color:white;font-family:'DM 
Sans',sans-serif;font-size:0.95rem;font-weight:700;cursor:pointer;box-shadow:0 
4px 16px rgba(36,119,212,0.35);transition:all 0.2s;" 
onmouseover="this.style.transform='translateY(-1px)'" 
onmouseout="this.style.transform=''">Sign In</button>
      </div>

      <!-- REGISTER FORM -->
      <div id="tb-form-register" style="display:none;">
        <div style="margin-bottom:1rem;">
          <label 
style="font-size:0.8rem;font-weight:700;color:#4a5568;display:block;margin-bottom:0.4rem;">Username</label>
          <input id="tb-reg-username" type="text" 
placeholder="your_username" autocomplete="username" 
style="width:100%;padding:0.75rem 1rem;border:1.5px solid 
#e8edf5;border-radius:8px;font-family:'DM 
Sans',sans-serif;font-size:0.9rem;outline:none;transition:border-color 
0.2s;" onfocus="this.style.borderColor='#2477d4'" 
onblur="this.style.borderColor='#e8edf5'">
          <div 
style="font-size:0.73rem;color:#8a99b3;margin-top:0.3rem;">3–20 
characters. Letters, numbers, underscores only.</div>
        </div>
        <div style="margin-bottom:1rem;">
          <label 
style="font-size:0.8rem;font-weight:700;color:#4a5568;display:block;margin-bottom:0.4rem;">Email 
Address</label>
          <input id="tb-reg-email" type="email" 
placeholder="email@example.com" autocomplete="email" 
style="width:100%;padding:0.75rem 1rem;border:1.5px solid 
#e8edf5;border-radius:8px;font-family:'DM 
Sans',sans-serif;font-size:0.9rem;outline:none;transition:border-color 
0.2s;" onfocus="this.style.borderColor='#2477d4'" 
onblur="this.style.borderColor='#e8edf5'">
        </div>
        <div style="margin-bottom:1.4rem;">
          <label 
style="font-size:0.8rem;font-weight:700;color:#4a5568;display:block;margin-bottom:0.4rem;">Password</label>
          <input id="tb-reg-password" type="password" placeholder="At 
least 6 characters" autocomplete="new-password" 
style="width:100%;padding:0.75rem 1rem;border:1.5px solid 
#e8edf5;border-radius:8px;font-family:'DM 
Sans',sans-serif;font-size:0.9rem;outline:none;transition:border-color 
0.2s;" onfocus="this.style.borderColor='#2477d4'" 
onblur="this.style.borderColor='#e8edf5'" 
onkeydown="if(event.key==='Enter')TBAuthUI.submitRegister()">
        </div>
        <button onclick="TBAuthUI.submitRegister()" 
style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#2477d4,#1a5faa);border:none;border-radius:8px;color:white;font-family:'DM 
Sans',sans-serif;font-size:0.95rem;font-weight:700;cursor:pointer;box-shadow:0 
4px 16px rgba(36,119,212,0.35);transition:all 0.2s;" 
onmouseover="this.style.transform='translateY(-1px)'" 
onmouseout="this.style.transform=''">Create Account</button>
      </div>

      <button onclick="TBAuthUI.closeModal()" 
style="width:100%;margin-top:0.9rem;padding:0.6rem;background:none;border:none;color:#8a99b3;font-family:'DM 
Sans',sans-serif;font-size:0.83rem;cursor:pointer;">Cancel</button>
    </div>
  </div>
</div>`;

  // ── AUTH UI CONTROLLER 
─────────────────────────

  window.TBAuthUI = {
    _redirectAfterLogin: null,

    init(options = {}) {
      // Inject modal into body
      if (!document.getElementById('tb-auth-overlay')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      }
      this._redirectAfterLogin = options.redirectAfterLogin || null;
      this._requireAuth        = options.requireAuth || false;
      this._onLogin            = options.onLogin || null;

      this.renderNavButton();

      if (this._requireAuth && !TBAuth.isLoggedIn()) {
        this.openModal('login');
        // Hide page body so it's not visible behind the modal
        document.body.style.overflow = 'hidden';
      }
    },

    renderNavButton() {
      const container = document.getElementById('tb-nav-auth');
      if (!container) return;
      const user = TBAuth.getUser();
      if (user) {
        container.innerHTML = `
          <span 
style="font-size:0.82rem;color:rgba(255,255,255,0.65);font-weight:500;">Hi, 
<strong style="color:white;">${escHtml(user.username)}</strong></span>
          <button onclick="TBAuthUI.logout()" style="padding:0.45rem 
1.1rem;background:rgba(255,255,255,0.08);border:1px solid 
rgba(255,255,255,0.2);border-radius:6px;color:rgba(255,255,255,0.85);font-family:'DM 
Sans',sans-serif;font-size:0.83rem;font-weight:600;cursor:pointer;transition:all 
0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" 
onmouseout="this.style.background='rgba(255,255,255,0.08)'">Sign 
Out</button>`;
      } else {
        container.innerHTML = `
          <button onclick="TBAuthUI.openModal('login')" 
style="padding:0.45rem 1.1rem;background:rgba(255,255,255,0.08);border:1px 
solid 
rgba(255,255,255,0.2);border-radius:6px;color:rgba(255,255,255,0.85);font-family:'DM 
Sans',sans-serif;font-size:0.83rem;font-weight:600;cursor:pointer;transition:all 
0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" 
onmouseout="this.style.background='rgba(255,255,255,0.08)'">Sign 
In</button>
          <button onclick="TBAuthUI.openModal('register')" 
style="padding:0.45rem 
1.1rem;background:linear-gradient(135deg,#2477d4,#1a5faa);border:none;border-radius:6px;color:white;font-family:'DM 
Sans',sans-serif;font-size:0.83rem;font-weight:600;cursor:pointer;box-shadow:0 
2px 10px rgba(36,119,212,0.4);transition:all 0.2s;" 
onmouseover="this.style.opacity='0.88'" 
onmouseout="this.style.opacity='1'">Create Account</button>`;
      }
    },

    openModal(tab = 'login') {
      const overlay = document.getElementById('tb-auth-overlay');
      overlay.classList.remove('tb-hidden');
      overlay.style.display = 'flex';
      this.showTab(tab);
      this.clearError();
      document.body.style.overflow = 'hidden';

      // Close on outside click
      overlay.onclick = (e) => { if (e.target === overlay && 
!this._requireAuth) this.closeModal(); };
    },

    closeModal() {
      const overlay = document.getElementById('tb-auth-overlay');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    },

    showTab(tab) {
      const loginForm    = document.getElementById('tb-form-login');
      const registerForm = document.getElementById('tb-form-register');
      const tabLogin     = document.getElementById('tb-tab-login');
      const tabReg       = document.getElementById('tb-tab-register');
      this.clearError();

      if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.style.color = '#2477d4'; tabLogin.style.borderBottomColor 
= '#2477d4'; tabLogin.style.fontWeight = '700';
        tabReg.style.color = '#8a99b3'; tabReg.style.borderBottomColor = 
'transparent'; tabReg.style.fontWeight = '600';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabReg.style.color = '#2477d4'; tabReg.style.borderBottomColor = 
'#2477d4'; tabReg.style.fontWeight = '700';
        tabLogin.style.color = '#8a99b3'; tabLogin.style.borderBottomColor 
= 'transparent'; tabLogin.style.fontWeight = '600';
      }
    },

    showError(msg) {
      const el = document.getElementById('tb-auth-error');
      el.textContent = msg;
      el.style.display = 'block';
    },

    clearError() {
      const el = document.getElementById('tb-auth-error');
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    },

    submitLogin() {
      const identifier = 
document.getElementById('tb-login-identifier').value;
      const password   = 
document.getElementById('tb-login-password').value;
      const result = TBAuth.login(identifier, password);
      if (!result.ok) { this.showError(result.err); return; }
      this.onAuthSuccess(result.user);
    },

    submitRegister() {
      const username = document.getElementById('tb-reg-username').value;
      const email    = document.getElementById('tb-reg-email').value;
      const password = document.getElementById('tb-reg-password').value;
      const result = TBAuth.register(username, email, password);
      if (!result.ok) { this.showError(result.err); return; }
      this.onAuthSuccess(result.user);
    },

    onAuthSuccess(user) {
      this.closeModal();
      this.renderNavButton();
      if (this._onLogin) this._onLogin(user);
      if (this._redirectAfterLogin) window.location.href = 
this._redirectAfterLogin;
    },

    logout() {
      TBAuth.logout();
      this.renderNavButton();
      // If page requires auth, redirect to index
      if (this._requireAuth) window.location.href = 'index.html';
    }
  };

  function escHtml(str) {
    return 
String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();

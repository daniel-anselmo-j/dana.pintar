// ═══════════════════════════════════════════════════════════
//  js/auth.js — Authentication (Username-based)
// ═══════════════════════════════════════════════════════════

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  document.getElementById('form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('form-register').classList.toggle('active', tab === 'register');
  ['loginError','loginSuccess','regError','regSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
  setTimeout(() => {
    const firstInput = document.querySelector(`#form-${tab} input`);
    if (firstInput) firstInput.focus();
  }, 50);
}

// ── Login ────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const pass     = document.getElementById('loginPass').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.querySelector('#form-login .btn-gold');
  errEl.style.display = 'none';

  if (!username || !pass) {
    showAuthError('loginError', 'Username dan password wajib diisi.');
    return;
  }

  btn.textContent = 'Memproses…';
  btn.disabled    = true;

  try {
    const data = await auth.login(username, pass);
    await enterApp(data.user);
  } catch (e) {
    showAuthError('loginError', e.message || 'Login gagal. Coba lagi.');
  } finally {
    btn.textContent = 'Masuk ke Akun';
    btn.disabled    = false;
  }
}

// ── Register ─────────────────────────────────────────────
async function doRegister() {
  const first    = document.getElementById('regFirst').value.trim();
  const last     = document.getElementById('regLast').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const phone    = document.getElementById('regPhone').value.trim();
  const pass     = document.getElementById('regPass').value;
  const btn      = document.querySelector('#form-register .btn-gold');

  document.getElementById('regError').style.display   = 'none';
  document.getElementById('regSuccess').style.display = 'none';

  if (!first || !username || !pass) {
    showAuthError('regError', 'Nama depan, username, dan password wajib diisi.');
    return;
  }
  if (username.length < 3 || username.length > 30) {
    showAuthError('regError', 'Username harus 3–30 karakter.');
    return;
  }
  if (!/^[a-z0-9_]+$/i.test(username)) {
    showAuthError('regError', 'Username hanya boleh huruf, angka, dan underscore (_).');
    return;
  }
  if (pass.length < 6) {
    showAuthError('regError', 'Password minimal 6 karakter.');
    return;
  }

  btn.textContent = 'Mendaftarkan…';
  btn.disabled    = true;

  try {
    const full_name = (first + ' ' + last).trim();
    await auth.register(username, pass, full_name, phone);
    showAuthSuccess('regSuccess', '✅ Akun berhasil dibuat! Silakan masuk.');
    setTimeout(() => {
      switchAuthTab('login');
      document.getElementById('loginUsername').value = username;
      document.getElementById('loginPass').focus();
    }, 1500);
  } catch (e) {
    showAuthError('regError', e.message || 'Pendaftaran gagal. Coba lagi.');
  } finally {
    btn.textContent = 'Buat Akun Gratis';
    btn.disabled    = false;
  }
}

// ── Logout ───────────────────────────────────────────────
function doLogout() {
  if (window._simInterval) { clearInterval(window._simInterval); window._simInterval = null; }

  auth.logout();
  window.currentUser    = null;
  window.currentProfile = null;
  window.allFunds       = [];
  window._holdingsCache = [];
  window._currentView   = null;

  Object.values(window.charts || {}).forEach(c => { try { c.destroy(); } catch(e){} });
  window.charts = {};

  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');

  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPass').value     = '';
}

// ── Error helpers ────────────────────────────────────────
function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'shake 0.4s ease'; }, 10);
}

function showAuthSuccess(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

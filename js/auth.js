// ═══════════════════════════════════════════════════════════
//  js/auth.js — Authentication via Supabase Auth (Username-based)
//  Strategi: username dikonversi ke email virtual "username@danapintar.app"
//  sebelum dikirim ke Supabase. User tidak perlu tahu email ini.
// ═══════════════════════════════════════════════════════════

const USERNAME_DOMAIN = 'danapintar.app';

/** Konversi username → email virtual untuk Supabase */
function usernameToEmail(username) {
  return username.toLowerCase() + '@' + USERNAME_DOMAIN;
}

/** Validasi format username: huruf, angka, titik, underscore, strip; 3-30 karakter */
function isValidUsername(username) {
  return /^[a-z0-9._-]{3,30}$/i.test(username);
}

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
  const username = (document.getElementById('loginUsername').value || '').trim().toLowerCase();
  const pass     = document.getElementById('loginPass').value;
  const btn      = document.querySelector('#form-login .btn-gold');

  document.getElementById('loginError').style.display = 'none';

  if (!username || !pass) {
    showAuthError('loginError', 'Username dan password wajib diisi.');
    return;
  }
  if (!isValidUsername(username)) {
    showAuthError('loginError', 'Username tidak valid (3–30 karakter: huruf, angka, titik, underscore, strip).');
    return;
  }

  btn.textContent = 'Memproses…';
  btn.disabled = true;

  try {
    const email = usernameToEmail(username);
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

    if (error) {
      showAuthError('loginError', parseAuthError(error));
      return;
    }

    if (!data.user) {
      showAuthError('loginError', 'Login gagal. Silakan coba lagi.');
      return;
    }

    await enterApp(data.user);
  } catch (e) {
    showAuthError('loginError', 'Koneksi gagal. Periksa internet Anda.');
  } finally {
    btn.textContent = 'Masuk ke Akun';
    btn.disabled = false;
  }
}

// ── Register ─────────────────────────────────────────────
async function doRegister() {
  const first    = document.getElementById('regFirst').value.trim();
  const last     = document.getElementById('regLast').value.trim();
  const username = (document.getElementById('regUsername').value || '').trim().toLowerCase();
  const phone    = document.getElementById('regPhone').value.trim();
  const pass     = document.getElementById('regPass').value;
  const btn      = document.querySelector('#form-register .btn-gold');

  document.getElementById('regError').style.display   = 'none';
  document.getElementById('regSuccess').style.display = 'none';

  if (!first || !username || !pass) {
    showAuthError('regError', 'Nama depan, username, dan password wajib diisi.');
    return;
  }
  if (!isValidUsername(username)) {
    showAuthError('regError', 'Username hanya boleh berisi huruf, angka, titik, underscore, atau strip (3–30 karakter).');
    return;
  }
  if (pass.length < 6) {
    showAuthError('regError', 'Password minimal 6 karakter.');
    return;
  }

  btn.textContent = 'Mendaftarkan…';
  btn.disabled = true;

  try {
    const email    = usernameToEmail(username);
    const fullName = (first + ' ' + last).trim();

    const { data, error } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          username:  username,
          phone:     phone || '',
        },
        emailRedirectTo: undefined,
      }
    });

    if (error) {
      showAuthError('regError', parseAuthError(error, true));
      return;
    }

    if (data?.user && data.user.identities && data.user.identities.length > 0) {
      // Simpan username ke tabel profiles (tunggu trigger Supabase selesai buat row)
      await new Promise(r => setTimeout(r, 800));
      await sb.from('profiles').upsert({
        id:        data.user.id,
        username:  username,
        full_name: fullName,
        phone:     phone || '',
      }, { onConflict: 'id', ignoreDuplicates: false });

      showAuthSuccess('regSuccess', '✅ Akun berhasil dibuat! Mengalihkan ke halaman masuk…');
      setTimeout(() => {
        switchAuthTab('login');
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPass').focus();
      }, 1500);
    } else {
      showAuthError('regError', 'Username ini sudah digunakan. Silakan pilih username lain.');
    }

  } catch (e) {
    showAuthError('regError', 'Koneksi gagal: ' + (e.message || 'Coba lagi.'));
  } finally {
    btn.textContent = 'Buat Akun Gratis';
    btn.disabled = false;
  }
}

// ── Logout ───────────────────────────────────────────────
async function doLogout() {
  if (window._simInterval) { clearInterval(window._simInterval); window._simInterval = null; }

  await sb.auth.signOut();
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
  el.textContent     = msg;
  el.style.display   = 'block';
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'shake 0.4s ease'; }, 10);
}

function showAuthSuccess(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

function parseAuthError(error, isRegister = false) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Username atau password salah.';
  if (msg.includes('Email not confirmed'))
    return 'Akun belum diaktifkan. Hubungi admin.';
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return isRegister ? 'Username ini sudah digunakan. Silakan pilih username lain.' : 'Akun sudah terdaftar. Silakan masuk.';
  if (msg.includes('Password should be'))
    return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
  if (msg.includes('rate limit') || msg.includes('429'))
    return 'Terlalu banyak percobaan. Tunggu beberapa menit.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Koneksi gagal. Periksa internet Anda.';
  return msg || 'Terjadi kesalahan. Coba lagi.';
}

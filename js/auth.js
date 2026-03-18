// ═══════════════════════════════════════════════════════════
//  js/auth.js — Authentication via Supabase Auth
// ═══════════════════════════════════════════════════════════

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  document.getElementById('form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('form-register').classList.toggle('active', tab === 'register');
  // Clear all messages
  ['loginError','loginSuccess','regError','regSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
  // Focus first input
  setTimeout(() => {
    const firstInput = document.querySelector(`#form-${tab} input`);
    if (firstInput) firstInput.focus();
  }, 50);
}

// ── Login ────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn   = document.querySelector('#form-login .btn-gold');
  errEl.style.display = 'none';

  if (!email || !pass) {
    showAuthError('loginError', 'Email dan password wajib diisi.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError('loginError', 'Format email tidak valid.');
    return;
  }

  btn.textContent = 'Memproses…';
  btn.disabled = true;

  try {
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
  const first = document.getElementById('regFirst').value.trim();
  const last  = document.getElementById('regLast').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPass').value;
  const btn   = document.querySelector('#form-register .btn-gold');

  document.getElementById('regError').style.display   = 'none';
  document.getElementById('regSuccess').style.display = 'none';

  // Validasi client-side
  if (!first || !email || !pass) {
    showAuthError('regError', 'Nama depan, email, dan password wajib diisi.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError('regError', 'Format email tidak valid.');
    return;
  }
  if (pass.length < 6) {
    showAuthError('regError', 'Password minimal 6 karakter.');
    return;
  }

  btn.textContent = 'Mendaftarkan…';
  btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: (first + ' ' + last).trim(),
          phone: phone || '',
        },
        emailRedirectTo: undefined,
      }
    });

    if (error) {
      showAuthError('regError', parseAuthError(error));
      return;
    }

    if (data?.user && data.user.identities && data.user.identities.length > 0) {
      showAuthSuccess('regSuccess', '✅ Akun berhasil dibuat! Mengalihkan ke halaman masuk…');
      setTimeout(() => {
        switchAuthTab('login');
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPass').focus();
      }, 1500);
    } else {
      showAuthSuccess('regSuccess',
        '📧 Cek email Anda! Link konfirmasi telah dikirim ke ' + email + '. ' +
        'Klik link tersebut lalu kembali untuk masuk.'
      );
    }

  } catch (e) {
    if (e.message && (e.message.includes('500') || e.message.includes('smtp'))) {
      showAuthError('regError',
        'Server email bermasalah. Hubungi admin untuk mengaktifkan akun.'
      );
    } else {
      showAuthError('regError', 'Koneksi gagal: ' + (e.message || 'Coba lagi.'));
    }
  } finally {
    btn.textContent = 'Buat Akun Gratis';
    btn.disabled = false;
  }
}

// ── Logout ───────────────────────────────────────────────
async function doLogout() {
  // Stop NAV simulation
  if (window._simInterval) { clearInterval(window._simInterval); window._simInterval = null; }
  
  await sb.auth.signOut();
  window.currentUser    = null;
  window.currentProfile = null;
  window.allFunds       = [];
  window._holdingsCache = [];
  window._currentView   = null;

  // Destroy charts
  Object.values(window.charts || {}).forEach(c => { try { c.destroy(); } catch(e){} });
  window.charts = {};

  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');

  // Reset form fields
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value  = '';
}

// ── Error helpers ────────────────────────────────────────
function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
  // Shake animation
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'shake 0.4s ease'; }, 10);
}

function showAuthSuccess(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

function parseAuthError(error) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Email atau password salah.';
  if (msg.includes('Email not confirmed'))
    return 'Email belum dikonfirmasi. Cek inbox Anda dan klik link verifikasi.';
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'Email ini sudah terdaftar. Silakan masuk.';
  if (msg.includes('Password should be'))
    return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
  if (msg.includes('Unable to validate email') || msg.includes('smtp') || msg.includes('500'))
    return 'Server email bermasalah. Hubungi admin.';
  if (msg.includes('rate limit') || msg.includes('429'))
    return 'Terlalu banyak percobaan. Tunggu beberapa menit.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Koneksi gagal. Periksa internet Anda.';
  return msg || 'Terjadi kesalahan. Coba lagi.';
}

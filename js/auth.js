// ═══════════════════════════════════════════════════════════
//  js/auth.js — Authentication via Supabase Auth
// ═══════════════════════════════════════════════════════════

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  document.getElementById('form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('form-register').classList.toggle('active', tab === 'register');
  // Clear errors on tab switch
  ['loginError','loginSuccess','regError','regSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
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

  btn.textContent = 'Memproses…';
  btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

    if (error) {
      const msg = parseAuthError(error);
      showAuthError('loginError', msg);
      return;
    }

    // Cek apakah email belum dikonfirmasi
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
        // Tidak kirim redirect URL supaya tidak butuh email konfirmasi
        emailRedirectTo: undefined,
      }
    });

    if (error) {
      showAuthError('regError', parseAuthError(error));
      return;
    }

    // Jika email confirmation dimatikan → user langsung ada & bisa login
    if (data?.user && data.user.identities && data.user.identities.length > 0) {
      // Email confirmation OFF — langsung login
      showAuthSuccess('regSuccess', 'Akun berhasil dibuat! Mengalihkan ke halaman masuk…');
      setTimeout(() => {
        switchAuthTab('login');
        document.getElementById('loginEmail').value = email;
      }, 1500);
    } else {
      // Email confirmation ON — user perlu cek email
      showAuthSuccess('regSuccess',
        '📧 Cek email Anda! Link konfirmasi telah dikirim ke ' + email + '. ' +
        'Klik link tersebut lalu kembali untuk masuk.'
      );
    }

  } catch (e) {
    // Tangani error 500 (SMTP / server error)
    if (e.message && e.message.includes('500')) {
      showAuthError('regError',
        'Server email sedang bermasalah. ' +
        'Minta admin untuk mematikan "Email Confirmation" di Supabase Dashboard → Authentication → Settings.'
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
  await sb.auth.signOut();
  window.currentUser    = null;
  window.currentProfile = null;
  window.allFunds       = [];
  window._holdingsCache = [];

  Object.values(window.charts || {}).forEach(c => { try { c.destroy(); } catch(e){} });
  window.charts = {};

  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');
}

// ── Error helpers ────────────────────────────────────────
function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = 'block';
}

function showAuthSuccess(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = 'block';
}

function parseAuthError(error) {
  const msg = error.message || '';
  // Terjemahkan pesan error umum Supabase ke Bahasa Indonesia
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

// ═══════════════════════════════════════════════════════════
//  js/auth.js — Authentication via Supabase Auth
// ═══════════════════════════════════════════════════════════

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  document.getElementById('form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('form-register').classList.toggle('active', tab === 'register');
}

// ── Login ────────────────────────────────────────────────
async function doLogin() {
  const email  = document.getElementById('loginEmail').value.trim();
  const pass   = document.getElementById('loginPass').value;
  const errEl  = document.getElementById('loginError');
  const btn    = document.querySelector('#form-login .btn-gold');
  errEl.style.display = 'none';

  if (!email || !pass) {
    errEl.textContent = 'Email dan password wajib diisi.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Memproses…';
  btn.disabled = true;

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  btn.textContent = 'Masuk ke Akun';
  btn.disabled = false;

  if (error) {
    errEl.textContent = error.message.includes('Invalid login')
      ? 'Email atau password salah.'
      : error.message;
    errEl.style.display = 'block';
    return;
  }

  await enterApp(data.user);
}

// ── Register ─────────────────────────────────────────────
async function doRegister() {
  const first = document.getElementById('regFirst').value.trim();
  const last  = document.getElementById('regLast').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPass').value;
  const errEl = document.getElementById('regError');
  const sucEl = document.getElementById('regSuccess');
  const btn   = document.querySelector('#form-register .btn-gold');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!first || !email || !pass) {
    errEl.textContent = 'Nama depan, email, dan password wajib diisi.';
    errEl.style.display = 'block';
    return;
  }
  if (pass.length < 6) {
    errEl.textContent = 'Password minimal 6 karakter.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Mendaftarkan…';
  btn.disabled = true;

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: (first + ' ' + last).trim(),
        phone,
      }
    }
  });

  btn.textContent = 'Buat Akun Gratis';
  btn.disabled = false;

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }

  sucEl.textContent = 'Akun berhasil dibuat! Silakan masuk.';
  sucEl.style.display = 'block';
  setTimeout(() => switchAuthTab('login'), 1800);
}

// ── Logout ───────────────────────────────────────────────
async function doLogout() {
  await sb.auth.signOut();
  window.currentUser   = null;
  window.currentProfile = null;
  window.allFunds      = [];

  // Destroy charts
  Object.values(window.charts || {}).forEach(c => { try { c.destroy(); } catch(e){} });
  window.charts = {};

  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');
}

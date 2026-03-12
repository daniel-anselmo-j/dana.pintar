// ═══════════════════════════════════════════════════════════
//  js/supabase.js — Supabase Client
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://sycwptzzxcxrqrcjvhdj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3dwdHp6eGN4cnFyY2p2aGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDg2ODYsImV4cCI6MjA4ODg4NDY4Nn0.1MD7I0aFnEbPLWSp1tBkJLmaIO1ODXPJGGhLn3FbR2Q';

// Load Supabase SDK dynamically
async function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) { resolve(window.supabase); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload  = () => {
      window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      resolve(window._sb);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Global Supabase client (set after loadSupabase())
let sb = null;

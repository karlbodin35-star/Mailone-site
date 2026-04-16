// ════════════════════════════════════════════════════════════
// mailone.js — Shared utilities + Real API client
// ════════════════════════════════════════════════════════════

// ── THEME MANAGER ────────────────────────────────────────────
const ThemeManager = {
  STORAGE_KEY: 'mailone_theme',

  /** Apply saved theme on page load (also called by inline anti-flash script) */
  init() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      const theme = saved === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      this._updateButtons(theme);
    } catch (e) {}
  },

  /** Toggle between light and dark, persist to localStorage */
  toggle() {
    try {
      const current = this.get();
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(this.STORAGE_KEY, next);
      this._updateButtons(next);
    } catch (e) {}
  },

  /** Return current theme ('light' | 'dark') */
  get() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  /** Update all toggle button icons on the page */
  _updateButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre';
    });
  },
};

// Apply theme immediately at script load
ThemeManager.init();

const CONFIG = {
  API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://mailone-backend.vercel.app', // ← Remplacez par votre URL Vercel
};

// ── API CLIENT ───────────────────────────────────────────────
class APIError extends Error {
  constructor(message, status, code) {
    super(message); this.name = 'APIError'; this.status = status; this.code = code;
  }
}

const API = {
  async request(path, options = {}) {
    const token = localStorage.getItem('mailone_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...options.headers };
    try {
      const res = await fetch(`${CONFIG.API_URL}${path}`, { ...options, headers });
      const data = await res.json();
      if (res.status === 401 && data.code === 'TOKEN_EXPIRED') { Auth.logout(); return null; }
      if (!res.ok) throw new APIError(data.error || 'Erreur serveur', res.status, data.code);
      return data;
    } catch (err) {
      if (err instanceof APIError) throw err;
      if (err.name === 'TypeError') throw new APIError('Serveur inaccessible. Vérifiez votre connexion.', 0, 'NETWORK_ERROR');
      throw err;
    }
  },
  get(path)        { return this.request(path, { method: 'GET' }); },
  post(path, body) { return this.request(path, { method: 'POST',   body: JSON.stringify(body) }); },
  put(path, body)  { return this.request(path, { method: 'PUT',    body: JSON.stringify(body) }); },
  delete(path)     { return this.request(path, { method: 'DELETE' }); },
};

// ── AUTH ─────────────────────────────────────────────────────
const Auth = {
  getUser()    { const u = localStorage.getItem('mailone_user'); return u ? JSON.parse(u) : null; },
  getToken()   { return localStorage.getItem('mailone_token'); },
  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  setSession({ token, user }) {
    if (token) localStorage.setItem('mailone_token', token);
    if (user)  { localStorage.setItem('mailone_user', JSON.stringify(user)); localStorage.setItem('mailone_plan', user.plan || 'solo'); if (user.billing) localStorage.setItem('mailone_billing', user.billing); }
  },

  logout() {
    ['mailone_token','mailone_user','mailone_plan','mailone_billing'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname); return false; }
    return true;
  },

  redirectIfLoggedIn(dest = 'app.html') { if (this.isLoggedIn()) window.location.href = dest; },

  async refreshUser() {
    try { const d = await API.get('/api/auth/me'); if (d?.user) { this.setSession({ user: d.user }); return d.user; } }
    catch (err) { if (err.status === 401) this.logout(); }
    return null;
  },

  async register(payload) {
    const data = await API.post('/api/auth/register', payload);
    if (data?.token) this.setSession(data);
    return data;
  },

  async login(payload) {
    const data = await API.post('/api/auth/login', payload);
    if (data?.token) this.setSession(data);
    return data;
  },

  async forgotPassword(email)         { return API.post('/api/auth/forgot-password', { email }); },
  async resetPassword(token, password){ return API.post('/api/auth/reset-password',  { token, password }); },

  async updateProfile(data) {
    const result = await API.put('/api/auth/me', data);
    if (result?.user) this.setSession({ user: { ...this.getUser(), ...result.user } });
    return result;
  },

  async deleteAccount() { await API.delete('/api/auth/me'); this.logout(); },
};

// ── STRIPE ───────────────────────────────────────────────────
const StripeHelper = {
  async checkout(plan, billing) {
    try {
      showToast('💳', 'Redirection vers le paiement sécurisé…');
      const data = await API.post('/api/stripe/create-checkout-session', { plan, billing });
      if (data?.url) window.location.href = data.url;
    } catch (err) { showToast('⚠️', err.message || 'Erreur paiement.'); }
  },
  async openPortal() {
    try {
      showToast('💳', 'Redirection vers le portail de facturation…');
      const data = await API.post('/api/stripe/portal', {});
      if (data?.url) window.location.href = data.url;
    } catch (err) { showToast('⚠️', err.message || 'Erreur portail.'); }
  },
  async getSubscription() { try { return await API.get('/api/stripe/subscription'); } catch { return null; } },
};

// ── PLAN MANAGER ─────────────────────────────────────────────
const PlanManager = {
  PLANS: {
    solo:       { label:'Solo ✨',       mailboxes:1,  price:'99€/mois',    priceRaw:99   },
    team:       { label:'Équipe ⭐',     mailboxes:10, price:'900€/mois',   priceRaw:900  },
    enterprise: { label:'Entreprise 🏢', mailboxes:20, price:'1 780€/mois', priceRaw:1780 },
  },
  get()         { return localStorage.getItem('mailone_plan') || 'solo'; },
  set(plan)     { localStorage.setItem('mailone_plan', plan); },
  getBilling()  { return localStorage.getItem('mailone_billing') || 'monthly'; },
  getInfo(plan) { return this.PLANS[plan || this.get()] || this.PLANS.solo; },
};

// ── REFERRAL ─────────────────────────────────────────────────
const Referral = {
  async getMyCode()        { try { return await API.get('/api/referral/my-code'); } catch { return null; } },
  async getMyReferrals()   { try { return await API.get('/api/referral/my-referrals'); } catch { return { referrals: [] }; } },
  async validateCode(code) { try { return await API.get(`/api/referral/validate/${code}`); } catch { return { valid: false }; } },
  getCodeFromURL()         { return new URLSearchParams(window.location.search).get('ref') || null; },
};

// ── UTILS ─────────────────────────────────────────────────────
function showToast(ico, msg, duration = 3200) {
  let t = document.getElementById('global-toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'global-toast';
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1a1814;color:#f5f3ef;border-radius:10px;padding:11px 16px;font-size:12px;font-family:\'Instrument Sans\',sans-serif;display:flex;align-items:center;gap:8px;transform:translateY(70px);opacity:0;transition:all .3s cubic-bezier(.34,1.56,.64,1);z-index:9998;max-width:320px;border:1px solid rgba(255,255,255,.08)';
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${ico}</span><span>${msg}</span>`;
  t.style.transform = 'translateY(0)'; t.style.opacity = '1';
  setTimeout(() => { t.style.transform = 'translateY(70px)'; t.style.opacity = '0'; }, duration);
}

function setButtonLoading(btn, loading, text = 'Chargement…') {
  if (!btn) return;
  if (loading) { btn._orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span style="opacity:.6">${text}</span>`; }
  else { btn.disabled = false; btn.innerHTML = btn._orig || btn.innerHTML; }
}

function showFieldError(id, msg) {
  const el = document.getElementById(id); if (!el) return;
  el.style.borderColor = '#d93a28'; el.style.boxShadow = '0 0 0 3px rgba(217,58,40,.1)';
  let err = el.parentElement.querySelector('.field-error');
  if (!err) { err = document.createElement('div'); err.className = 'field-error'; err.style.cssText = 'font-size:11px;color:#d93a28;margin-top:4px'; el.parentElement.appendChild(err); }
  err.textContent = msg;
}

function clearFieldError(id) {
  const el = document.getElementById(id); if (!el) return;
  el.style.borderColor = ''; el.style.boxShadow = '';
  el.parentElement.querySelector('.field-error')?.remove();
}

const Cookies = {
  hasConsent() { return !!localStorage.getItem('mailone_cookies'); },
  setConsent(c) { localStorage.setItem('mailone_cookies', JSON.stringify({ choice: c, date: Date.now() })); },
  initBanner() { if (this.hasConsent()) return; setTimeout(() => document.getElementById('cookie-banner')?.classList.add('show'), 1500); },
};


// ── EMAIL DEOBFUSCATION ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.email-protect').forEach(el => {
    const u = el.dataset.u, d = el.dataset.d;
    if (u && d) {
      const a = document.createElement('a');
      a.href = 'mailto:' + u + '@' + d;
      a.textContent = u + '@' + d;
      a.style.cssText = el.closest('a')?.style.cssText || 'color:inherit;text-decoration:none;font-weight:600';
      el.replaceWith(a);
    }
  });
});

// ── COOKIE CONSENT CHECK ─────────────────────────────────
const CookieConsent = {
  hasAnalyticsConsent() {
    try {
      const d = JSON.parse(localStorage.getItem('mailone_cookies'));
      return d?.choice === 'all';
    } catch { return false; }
  },
  loadAnalytics() {
    if (!this.hasAnalyticsConsent()) return;
    // Insert your analytics script here when ready
    // e.g. Google Analytics, Plausible, etc.
  }
};
// Only load analytics if consent given
CookieConsent.loadAnalytics();

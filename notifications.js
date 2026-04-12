// ══════════════════════════════════════════════════════════════
// MAILONE — Gestionnaire de notifications push
// À inclure dans app.html via <script src="notifications.js">
// ══════════════════════════════════════════════════════════════

const PushManager = {

  // ── INITIALISER ──────────────────────────────────────────────
  async init() {
    // Vérifier que le navigateur supporte les notifications
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications');
      return false;
    }
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker non supporté');
      return false;
    }

    // Enregistrer le Service Worker
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[MailOne] Service Worker enregistré');
      this.registration = reg;
      return true;
    } catch (err) {
      console.error('[MailOne] SW erreur:', err);
      return false;
    }
  },

  // ── DEMANDER LA PERMISSION ───────────────────────────────────
  async requestPermission() {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // ── ACTIVER LES NOTIFICATIONS ─────────────────────────────────
  async enable() {
    const ready = await this.init();
    if (!ready) return false;

    const granted = await this.requestPermission();
    if (!granted) {
      showToast('⚠️', 'Notifications bloquées — autorisez-les dans les paramètres du navigateur');
      return false;
    }

    // Sauvegarder la préférence
    localStorage.setItem('mailone_notifs', 'true');
    showToast('🔔', 'Notifications activées — vous serez alerté des urgences !');
    return true;
  },

  // ── DÉSACTIVER ────────────────────────────────────────────────
  disable() {
    localStorage.setItem('mailone_notifs', 'false');
    showToast('🔕', 'Notifications désactivées');
  },

  // ── VÉRIFIER SI ACTIVÉ ────────────────────────────────────────
  isEnabled() {
    return localStorage.getItem('mailone_notifs') === 'true'
      && Notification.permission === 'granted';
  },

  // ── ENVOYER UNE NOTIFICATION LOCALE ──────────────────────────
  // (utilisé pour tester ou pour les alertes immédiates)
  async send({ title, body, urgent = false, url = '/app.html', tag = 'mailone' }) {
    if (!this.isEnabled()) return;
    if (!this.registration) await this.init();

    await this.registration.showNotification(title, {
      body,
      icon:    '/icon-192.png',
      badge:   '/icon-72.png',
      tag,
      vibrate: urgent ? [300, 100, 300, 100, 300] : [200],
      data:    { url },
      requireInteraction: urgent,
      actions: [
        { action: 'open',    title: '📬 Voir' },
        { action: 'dismiss', title: 'Plus tard' },
      ],
    });
  },

  // ── CHECKER LES NOUVELLES URGENCES ───────────────────────────
  // Appelé toutes les 5 minutes quand l'app est ouverte
  async checkNewUrgencies(mails) {
    if (!this.isEnabled()) return;

    const lastCheck = parseInt(localStorage.getItem('mailone_last_check') || '0');
    const now = Date.now();

    // Ne checker que si au moins 5 minutes se sont passées
    if (now - lastCheck < 5 * 60 * 1000) return;
    localStorage.setItem('mailone_last_check', now.toString());

    // Chercher les mails urgents non lus depuis la dernière vérification
    const newUrgencies = mails.filter(m =>
      m.category === 'urgent' &&
      !m.read &&
      new Date(m.time).getTime() > lastCheck
    );

    if (newUrgencies.length === 0) return;

    if (newUrgencies.length === 1) {
      const m = newUrgencies[0];
      await this.send({
        title:  `🚨 Urgence — ${m.sender}`,
        body:   m.summary || m.subject,
        urgent: true,
        tag:    'urgence-' + m.id,
      });
    } else {
      await this.send({
        title:  `🚨 ${newUrgencies.length} urgences non lues`,
        body:   `${newUrgencies.map(m => m.sender).join(', ')}`,
        urgent: true,
        tag:    'urgences-multiple',
      });
    }
  },
};

// ── BOUTON DANS L'APP ─────────────────────────────────────────
// Ajoute un bouton cloche dans la topbar
function injectNotifButton() {
  const topbar = document.querySelector('.topbar-right') ||
                 document.querySelector('.tb-right') ||
                 document.querySelector('[class*="topbar"]');

  if (!topbar) return;

  const btn = document.createElement('button');
  btn.id = 'notif-btn';
  btn.title = 'Notifications';
  btn.style.cssText = `
    padding: 6px 11px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: transparent;
    cursor: pointer;
    font-size: 16px;
    transition: all .15s;
    color: rgba(255,255,255,.5);
  `;

  const updateBtn = () => {
    btn.textContent = PushManager.isEnabled() ? '🔔' : '🔕';
    btn.title = PushManager.isEnabled() ? 'Notifications activées' : 'Activer les notifications';
    btn.style.color = PushManager.isEnabled()
      ? 'rgba(94,234,212,.8)'
      : 'rgba(255,255,255,.35)';
  };

  btn.onclick = async () => {
    if (PushManager.isEnabled()) {
      PushManager.disable();
    } else {
      await PushManager.enable();
    }
    updateBtn();
  };

  updateBtn();
  topbar.prepend(btn);
}

// ── AUTO-INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await PushManager.init();
  injectNotifButton();

  // Si déjà activé → proposer de continuer silencieusement
  if (PushManager.isEnabled()) {
    console.log('[MailOne] Notifications push actives');
  }

  // Vérifier les urgences toutes les 5 minutes
  setInterval(() => {
    // Récupère les mails depuis l'app si disponibles
    if (typeof MAILS !== 'undefined') {
      PushManager.checkNewUrgencies(MAILS);
    }
  }, 5 * 60 * 1000);
});

// ── POPUP D'ACTIVATION (premier lancement) ───────────────────
function showNotifPrompt() {
  if (localStorage.getItem('mailone_notifs_asked')) return;
  if (Notification.permission !== 'default') return;

  localStorage.setItem('mailone_notifs_asked', 'true');

  // Créer le popup
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1c18;
    border: 1px solid rgba(94,234,212,.2);
    border-radius: 16px;
    padding: 18px 22px;
    max-width: 360px;
    width: 90%;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
    animation: slideUp .4s cubic-bezier(.34,1.56,.64,1);
  `;

  popup.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px">
      <span style="font-size:28px;flex-shrink:0">🔔</span>
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#fff;margin-bottom:5px">
          Recevez les alertes urgences
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.55;margin-bottom:14px">
          Activez les notifications pour être alerté instantanément quand une urgence arrive — même quand MailOne n'est pas ouvert.
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="PushManager.enable().then(() => this.closest('div').parentElement.parentElement.remove())" style="padding:8px 16px;background:rgba(94,234,212,.15);color:#5eead4;border:1px solid rgba(94,234,212,.25);border-radius:8px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:12px;font-weight:700">
            🔔 Activer
          </button>
          <button onclick="this.closest('div').parentElement.parentElement.remove()" style="padding:8px 16px;background:transparent;color:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.1);border-radius:8px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:12px">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Auto-remove après 15 secondes
  setTimeout(() => popup.remove(), 15000);
}

// Afficher le popup 10 secondes après ouverture de l'app
setTimeout(showNotifPrompt, 10000);

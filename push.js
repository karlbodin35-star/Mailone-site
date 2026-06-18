// ════════════════════════════════════════════════════════════
// MailOne — Push Notifications (frontend)
// Inclure dans app.html après mailone.js
// ════════════════════════════════════════════════════════════
(function () {
  const VAPID_PUBLIC = 'BKrhoLOCvfHw1sgFlIeN_PzP_hfiOiLb2t9_SrMghIa34_xEXrxco_ve5U9LTEpuv6SYpWdhwBI7ELvLjtqG--k';

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function subscribe(reg) {
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      await API.post('/api/notifications/subscribe', { subscription: sub });
      localStorage.setItem('mailone_push', '1');
    } catch (err) {
      console.warn('[Push] Abonnement échoué:', err.message);
    }
  }

  async function init() {
    // Déjà abonné ou refusé → ne pas re-demander
    if (localStorage.getItem('mailone_push') === '1') return;
    if (Notification.permission === 'denied') return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Vérifier si déjà abonné dans le navigateur
    const existing = await reg.pushManager.getSubscription();
    if (existing) { localStorage.setItem('mailone_push', '1'); return; }

    // Attendre 30s avant de demander (évite le spam immédiat)
    setTimeout(async () => {
      if (Notification.permission === 'granted') {
        await subscribe(reg);
        return;
      }

      // Afficher un bandeau custom avant la vraie demande navigateur
      showPushBanner(async () => {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') await subscribe(reg);
      });
    }, 30000);
  }

  function showPushBanner(onAccept) {
    if (document.getElementById('push-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#18181b;color:#fff;border-radius:14px;padding:14px 18px;
      display:flex;align-items:center;gap:14px;z-index:9999;
      box-shadow:0 8px 32px rgba(0,0,0,.3);max-width:420px;width:calc(100% - 32px);
      border:1px solid rgba(255,255,255,.08);animation:slideUp .3s ease;
    `;
    banner.innerHTML = `
      <span style="font-size:24px">🔔</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;margin-bottom:2px">Activer les notifications</div>
        <div style="font-size:11px;color:rgba(255,255,255,.5)">Soyez alerté de vos nouveaux emails importants.</div>
      </div>
      <button id="push-accept" style="padding:8px 14px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">Activer</button>
      <button id="push-dismiss" style="width:28px;height:28px;background:rgba(255,255,255,.08);border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>
    `;

    if (!document.getElementById('push-anim')) {
      const style = document.createElement('style');
      style.id = 'push-anim';
      style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    document.getElementById('push-accept').addEventListener('click', () => {
      banner.remove();
      onAccept();
    });
    document.getElementById('push-dismiss').addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('mailone_push', 'dismissed');
    });
  }

  // Lancer après que la page soit chargée et l'utilisateur connecté
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

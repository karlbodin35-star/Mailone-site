// ══════════════════════════════════════════════════════════════
// MAX — Assistant Support MailOne (widget flottant universel)
// ══════════════════════════════════════════════════════════════
(function () {
  const API_URL = 'https://mailone-backend.vercel.app';

  const FAQS = [
    { label: 'Comment ça marche ?',    text: 'Comment fonctionne MailOne ?' },
    { label: 'Tarifs',                 text: 'Quels sont les plans et les tarifs ?' },
    { label: 'Essai gratuit',          text: 'Comment fonctionne l\'essai gratuit ?' },
    { label: 'Fonctionnalité Équipe',  text: 'Comment fonctionne la fonctionnalité équipe ?' },
    { label: 'Annuler',                text: 'Comment annuler mon abonnement ?' },
    { label: 'Mes données',            text: 'Qu\'arrive-t-il à mes données si je résilie ?' },
  ];

  // ── CSS ────────────────────────────────────────────────────
  const css = `
    #max-btn {
      position:fixed; bottom:22px; right:22px; z-index:9000;
      width:54px; height:54px; border-radius:50%; border:none;
      background:linear-gradient(135deg,#0d9373,#0a7a5e);
      color:#fff; font-size:22px; cursor:pointer;
      box-shadow:0 4px 20px rgba(13,147,115,.45);
      display:flex; align-items:center; justify-content:center;
      transition:transform .2s, box-shadow .2s;
    }
    #max-btn:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(13,147,115,.55); }
    #max-btn .max-notif {
      position:absolute; top:-3px; right:-3px;
      width:16px; height:16px; border-radius:50%;
      background:#ef4444; border:2px solid #fff;
      font-size:9px; font-weight:800; color:#fff;
      display:flex; align-items:center; justify-content:center;
    }
    #max-panel {
      position:fixed; bottom:86px; right:22px; z-index:9000;
      width:340px; max-height:520px; border-radius:18px;
      background:#fff; border:1px solid #e4e4e7;
      box-shadow:0 16px 60px rgba(0,0,0,.14);
      display:flex; flex-direction:column; overflow:hidden;
      transform:scale(.92) translateY(12px); opacity:0;
      pointer-events:none;
      transition:transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s;
    }
    #max-panel.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }
    .max-header {
      background:linear-gradient(135deg,#0d9373,#0a7a5e);
      padding:14px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0;
    }
    .max-av {
      width:36px; height:36px; border-radius:50%;
      background:rgba(255,255,255,.2); display:flex; align-items:center;
      justify-content:center; font-size:18px; flex-shrink:0;
    }
    .max-hinfo { flex:1 }
    .max-hname { font-family:'Space Grotesk',Arial,sans-serif; font-size:14px; font-weight:800; color:#fff }
    .max-hstatus { font-size:11px; color:rgba(255,255,255,.7); display:flex; align-items:center; gap:4px }
    .max-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; flex-shrink:0 }
    .max-close {
      width:28px; height:28px; border-radius:8px; border:none;
      background:rgba(255,255,255,.15); color:#fff; cursor:pointer;
      font-size:14px; display:flex; align-items:center; justify-content:center;
    }
    .max-close:hover { background:rgba(255,255,255,.25) }
    .max-msgs {
      flex:1; overflow-y:auto; padding:14px 14px 4px;
      display:flex; flex-direction:column; gap:10px; min-height:0;
    }
    .max-msg { display:flex; flex-direction:column; gap:3px; max-width:88% }
    .max-msg.bot { align-self:flex-start }
    .max-msg.usr { align-self:flex-end; align-items:flex-end }
    .max-bubble {
      padding:9px 12px; border-radius:12px; font-size:13px; line-height:1.55;
      font-family:'DM Sans',Arial,sans-serif;
    }
    .max-msg.bot .max-bubble { background:#f4f4f5; color:#18181b; border-bottom-left-radius:3px }
    .max-msg.usr .max-bubble { background:#0d9373; color:#fff; border-bottom-right-radius:3px }
    .max-meta { font-size:10px; color:#a1a1aa }
    .max-typing .max-bubble { display:flex; align-items:center; gap:4px; min-width:44px }
    .max-typing .max-bubble span {
      width:6px; height:6px; border-radius:50%; background:#a1a1aa;
      animation:maxBounce 1.1s infinite;
    }
    .max-typing .max-bubble span:nth-child(2) { animation-delay:.18s }
    .max-typing .max-bubble span:nth-child(3) { animation-delay:.36s }
    @keyframes maxBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    .max-faqs {
      padding:8px 14px; display:flex; flex-wrap:wrap; gap:5px; flex-shrink:0;
      border-top:1px solid #f4f4f5;
    }
    .max-faq {
      padding:4px 10px; border-radius:20px; border:1px solid #e4e4e7;
      background:#fafafa; font-size:11px; font-family:'DM Sans',Arial,sans-serif;
      color:#52525b; cursor:pointer; transition:all .15s; white-space:nowrap;
    }
    .max-faq:hover { background:#0d9373; color:#fff; border-color:#0d9373 }
    .max-input-row {
      padding:10px 12px; border-top:1px solid #e4e4e7; display:flex; gap:7px;
      align-items:center; flex-shrink:0; background:#fff;
    }
    .max-inp {
      flex:1; padding:8px 11px; border:1px solid #e4e4e7; border-radius:10px;
      font-family:'DM Sans',Arial,sans-serif; font-size:13px; color:#18181b;
      background:#fafafa; outline:none; transition:border-color .15s;
    }
    .max-inp:focus { border-color:#0d9373; background:#fff }
    .max-send {
      width:34px; height:34px; border-radius:10px; border:none;
      background:#0d9373; color:#fff; cursor:pointer; font-size:15px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:background .15s;
    }
    .max-send:hover { background:#0a7a5e }
    .max-send:disabled { background:#d4d4d8; cursor:default }
    @media (max-width:400px) {
      #max-panel { width:calc(100vw - 20px); right:10px; bottom:80px }
    }
  `;

  // ── Injecter le CSS ─────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── Injecter le HTML ────────────────────────────────────────
  const html = `
    <button id="max-btn" aria-label="Ouvrir le support MAX" title="Support MailOne">
      <span id="max-btn-ico">🤖</span>
      <span class="max-notif" id="max-notif" style="display:none">1</span>
    </button>
    <div id="max-panel" role="dialog" aria-label="MAX — Support MailOne">
      <div class="max-header">
        <div class="max-av">🤖</div>
        <div class="max-hinfo">
          <div class="max-hname">MAX</div>
          <div class="max-hstatus"><span class="max-dot"></span>Assistant MailOne · En ligne</div>
        </div>
        <button class="max-close" id="max-close-btn" aria-label="Fermer">✕</button>
      </div>
      <div class="max-msgs" id="max-msgs"></div>
      <div class="max-faqs" id="max-faqs"></div>
      <div class="max-input-row">
        <input class="max-inp" id="max-inp" type="text" placeholder="Posez votre question à MAX…" autocomplete="off" maxlength="500">
        <button class="max-send" id="max-send" aria-label="Envoyer">↑</button>
      </div>
    </div>
  `;
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  // ── État ────────────────────────────────────────────────────
  let open = false;
  let history = [];
  let streaming = false;
  let greeted = false;

  const panel   = document.getElementById('max-panel');
  const msgs    = document.getElementById('max-msgs');
  const inp     = document.getElementById('max-inp');
  const sendBtn = document.getElementById('max-send');
  const btn     = document.getElementById('max-btn');
  const notif   = document.getElementById('max-notif');
  const faqs    = document.getElementById('max-faqs');

  // ── Afficher les FAQ chips ──────────────────────────────────
  function renderFaqs() {
    faqs.innerHTML = FAQS.map(f =>
      `<button class="max-faq" onclick="window._maxSend(${JSON.stringify(f.text)})">${f.label}</button>`
    ).join('');
  }
  renderFaqs();

  // ── Ajouter un message ──────────────────────────────────────
  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `max-msg ${role === 'user' ? 'usr' : 'bot'}`;
    div.innerHTML = `<div class="max-bubble">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'max-msg bot max-typing';
    div.id = 'max-typing';
    div.innerHTML = `<div class="max-bubble"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('max-typing');
    if (t) t.remove();
  }

  // ── Envoyer un message ──────────────────────────────────────
  async function sendMsg(text) {
    if (streaming || !text?.trim()) return;
    const content = text.trim();
    inp.value = '';
    streaming = true;
    sendBtn.disabled = true;

    addMsg('user', content);
    showTyping();

    try {
      const token = localStorage.getItem('mailone_token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const res = await fetch(`${API_URL}/api/support/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: content, history }),
      });

      if (!res.ok) throw new Error('Erreur réseau');

      removeTyping();

      // Créer la bulle de réponse
      const botDiv = document.createElement('div');
      botDiv.className = 'max-msg bot';
      const bubble = document.createElement('div');
      bubble.className = 'max-bubble';
      botDiv.appendChild(bubble);
      msgs.appendChild(botDiv);

      // Lire le stream SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parser les events SSE Anthropic
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.type === 'content_block_delta' && json.delta?.text) {
                fullText += json.delta.text;
                bubble.innerHTML = fullText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
                msgs.scrollTop = msgs.scrollHeight;
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Sauvegarder dans l'historique
      history.push({ role: 'user', content });
      history.push({ role: 'assistant', content: fullText });
      if (history.length > 16) history = history.slice(-16);

    } catch (err) {
      removeTyping();
      addMsg('bot', 'Désolé, je rencontre un problème. Contactez support@mailone.app si ça persiste.');
    } finally {
      streaming = false;
      sendBtn.disabled = false;
      inp.focus();
    }
  }

  // ── Exposer pour les FAQ buttons ───────────────────────────
  window._maxSend = (text) => sendMsg(text);

  // ── Ouvrir / fermer ─────────────────────────────────────────
  function togglePanel() {
    open = !open;
    panel.classList.toggle('open', open);
    notif.style.display = 'none';
    if (open) {
      if (!greeted) {
        greeted = true;
        setTimeout(() => {
          addMsg('bot', 'Bonjour ! Je suis MAX, votre assistant MailOne 👋\n\nComment puis-je vous aider ?');
        }, 200);
      }
      setTimeout(() => inp.focus(), 300);
    }
  }

  btn.addEventListener('click', togglePanel);
  document.getElementById('max-close-btn').addEventListener('click', togglePanel);

  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(inp.value); } });
  sendBtn.addEventListener('click', () => sendMsg(inp.value));

  // ── Notification après 8s si pas encore ouvert ─────────────
  setTimeout(() => {
    if (!open && !greeted) {
      notif.style.display = 'flex';
      btn.title = 'MAX a un message pour vous !';
    }
  }, 8000);

})();

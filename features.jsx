// AI variants + ZIP export + Notifications system + Workspace CRUD
const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

// ============================================================
// AI VARIANTS via window.genspark.complete
// ============================================================
async function generateVariant(kind, sourceText, hashtags = [], wsName = '') {
  const specs = {
    ig: { limit: 2200, style: "Ton chaleureux, direct, maximum d'émojis pertinents, hashtags à la fin, retour à la ligne aéré. Instagram." },
    li: { limit: 3000, style: "Ton professionnel, storytelling, phrases courtes, un hook fort, une conclusion avec CTA. LinkedIn — pas d'émojis en excès." },
    x:  { limit: 260,  style: "Percutant, minuscules, ton direct, 1-2 émojis max, sous la limite Twitter (260 car strict). Peut être un thread." },
    tt: { limit: 150,  style: "Ultra court, punchy, TikTok — hashtags inline, 1-3 émojis." },
    fb: { limit: 500,  style: "Facebook — ton communautaire, mise en contexte, question à la fin." },
    bl: { limit: 800,  style: "Titre + accroche pour billet de blog. Titre courte, résumé 2 phrases." },
  };
  const spec = specs[kind];
  if (!spec) throw new Error('unknown variant kind');

  const prompt = `Tu es rédacteur social media pour "${wsName || 'ContentDock'}".
Génère une variante ${kind.toUpperCase()} du contenu ci-dessous.

RÈGLES:
- ${spec.style}
- Limite stricte: ${spec.limit} caractères
- ${hashtags.length ? 'Hashtags à intégrer si pertinents: ' + hashtags.map(h => '#'+h).join(' ') : 'Pas de hashtags'}
- Écris uniquement le texte final, sans préambule, sans guillemets, sans explications.

CONTENU SOURCE:
${sourceText}

VARIANTE ${kind.toUpperCase()}:`;

  const helper = window.genspark?.complete || window.claude?.complete;
  if (!helper) throw new Error('LLM helper unavailable');
  const raw = await helper(prompt);
  return String(raw).trim().replace(/^["'`]|["'`]$/g, '');
}

// AI button component
function AIGenerateButton({ draft, kind, onGenerated, onToast }) {
  const [loading, setLoading] = useStateF(false);
  const ws = window.CD_DATA.workspaces.find(w => w.id === draft.ws);
  const go = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const out = await generateVariant(kind, draft.body || draft.title, draft.hashtags, ws?.name);
      onGenerated(out);
      onToast?.(`Variante ${kind.toUpperCase()} générée ✨`);
    } catch (e) {
      onToast?.('Génération impossible : ' + (e.message || 'erreur'));
    } finally { setLoading(false); }
  };
  return (
    <button className="ai-btn" onClick={go} disabled={loading} title={`Générer une variante ${kind.toUpperCase()} avec l'IA`}>
      {loading ? <span className="ai-loading"/> : <IconSparkles/>}
      {loading ? 'Génération…' : 'Générer avec IA'}
    </button>
  );
}

// ============================================================
// ZIP EXPORT — JSZip via CDN (lazy)
// ============================================================
let _jszipLoading;
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  if (_jszipLoading) return _jszipLoading;
  _jszipLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _jszipLoading;
}

async function exportDraftAsZip(draft, onToast) {
  try {
    onToast?.('Préparation du pack…');
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const safeName = (draft.title || 'brouillon').replace(/[^\w\-]+/g, '_').slice(0, 50);
    const folder = zip.folder(safeName);

    // caption.txt
    const captionParts = [];
    captionParts.push('# ' + draft.title);
    captionParts.push('');
    captionParts.push('## Corps');
    captionParts.push(draft.body || '');
    if (draft.variants) {
      Object.entries(draft.variants).forEach(([k, v]) => {
        if (v) { captionParts.push(''); captionParts.push('## ' + k.toUpperCase()); captionParts.push(v); }
      });
    }
    if (draft.hashtags?.length) {
      captionParts.push(''); captionParts.push('## Hashtags');
      captionParts.push(draft.hashtags.map(h => '#'+h).join(' '));
    }
    if (draft.code) {
      captionParts.push(''); captionParts.push('## Code');
      captionParts.push('```' + draft.code.lang); captionParts.push(draft.code.source); captionParts.push('```');
    }
    if (draft.palette?.length) {
      captionParts.push(''); captionParts.push('## Palette');
      captionParts.push(draft.palette.join(' · '));
    }
    folder.file('caption.md', captionParts.join('\n'));

    // hashtags.txt seul
    if (draft.hashtags?.length) {
      folder.file('hashtags.txt', draft.hashtags.map(h => '#'+h).join(' '));
    }

    // Images
    if (draft.images?.length) {
      const imgFolder = folder.folder('images');
      for (let i = 0; i < draft.images.length; i++) {
        try {
          const res = await fetch(draft.images[i]);
          const blob = await res.blob();
          const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
          imgFolder.file(`${String(i+1).padStart(2,'0')}.${ext}`, blob);
        } catch(e) { /* skip broken */ }
      }
    }

    // metadata.json
    folder.file('metadata.json', JSON.stringify({
      title: draft.title,
      workspace: window.CD_DATA.workspaces.find(w => w.id === draft.ws)?.name,
      status: draft.status,
      channel: draft.channel,
      tags: draft.tags,
      scheduled: draft.scheduled,
      hashtags: draft.hashtags,
      images_count: draft.images?.length || 0,
      exported_at: new Date().toISOString(),
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    onToast?.('Pack téléchargé : ' + safeName + '.zip');
  } catch (e) {
    onToast?.('Export ZIP impossible : ' + e.message);
    console.error(e);
  }
}

// ============================================================
// NOTIFICATIONS SYSTEM
// ============================================================
function useNotifications() {
  const [notifs, setNotifs] = useStateF(() => {
    try { return JSON.parse(localStorage.getItem('cd-notifs') || '[]'); } catch(e) { return []; }
  });
  useEffectF(() => {
    try {
      // Strip React nodes before saving
      const serializable = notifs.slice(0, 50).map(({ icon, ...rest }) => rest);
      localStorage.setItem('cd-notifs', JSON.stringify(serializable));
    } catch(e) {}
  }, [notifs]);

  const push = (n) => {
    const item = {
      id: 'n-' + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      read: false,
      ...n,
    };
    setNotifs(prev => [item, ...prev].slice(0, 50));
    // Desktop notification if enabled
    tryDesktopNotify(n);
    return item;
  };

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const clear = () => setNotifs([]);
  const remove = (id) => setNotifs(prev => prev.filter(n => n.id !== id));
  const unreadCount = notifs.filter(n => !n.read).length;

  return { notifs, push, markAllRead, clear, remove, unreadCount };
}

function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem('cd-notif-prefs') || '{}'); } catch(e) { return {}; }
}
function setNotifPrefs(p) {
  const cur = getNotifPrefs();
  localStorage.setItem('cd-notif-prefs', JSON.stringify({ ...cur, ...p }));
}

async function requestDesktopNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const r = await Notification.requestPermission();
  return r;
}

async function dispatchSystemNotification({ title, desc, kind, icon = null }) {
  const prefs = getNotifPrefs();
  if (kind && prefs[`mute_${kind}`]) return false;

  // 1. Détection environnement Mobile Capacitor (Android natif)
  try {
    if (window.Capacitor?.Plugins?.LocalNotifications) {
      const permStatus = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }
      await window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1000000),
          title: title || 'ContentDock',
          body: desc || '',
          schedule: { at: new Date(Date.now() + 100) }
        }]
      });
      return true;
    }
  } catch (err) {
    console.warn('[Notifications] Erreur LocalNotifications Capacitor :', err);
  }

  // 2. ServiceWorker Push / PWA (Mobile & Desktop)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function' && Notification.permission === 'granted') {
        reg.showNotification(title || 'ContentDock', {
          body: desc || '',
          icon: icon || './icons/icon.ico',
          badge: './icons/icon.ico',
          vibrate: [100, 50, 100]
        });
        return true;
      }
    }
  } catch (err) {}

  // 3. Notification API standard (Desktop Windows / Mac / Linux / Navigateur)
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      try {
        const n = new Notification(title || 'ContentDock', {
          body: desc || '',
          silent: prefs.silent,
          icon: icon || './icons/icon.ico'
        });
        setTimeout(() => n.close(), 6000);
        return true;
      } catch (err) {
        console.warn('[Notifications] Erreur constructeur Notification :', err);
      }
    }
  }

  return false;
}

function tryDesktopNotify({ title, desc, kind }) {
  const prefs = getNotifPrefs();
  if (!prefs.desktopEnabled && !prefs.mobileEnabled) return;
  dispatchSystemNotification({ title, desc, kind });
}

function NotifPanel({ notifs, onClose, onOpenDraft, onMarkAllRead, onClear }) {
  const fmtAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'à l\'instant';
    if (diff < 3600000) return Math.floor(diff/60000) + ' min';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' h';
    return Math.floor(diff/86400000) + ' j';
  };
  return (
    <>
      <div style={{position:'fixed', inset:0, zIndex:49}} onClick={onClose}/>
      <div className="notif-panel">
        <div className="notif-head">
          <IconBell size={14}/>
          Notifications
          <div style={{flex:1}}/>
          <button className="d-action" style={{padding:'2px 8px', fontSize:11}} onClick={onMarkAllRead}>Tout marquer lu</button>
          <button className="icon-btn" onClick={onClear} title="Vider"><IconTrash size={13}/></button>
        </div>
        <div className="notif-list">
          {notifs.length === 0 && <div className="notif-empty">Aucune notification pour l'instant.</div>}
          {notifs.map(n => (
            <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}
                 onClick={() => n.draftId && onOpenDraft?.(n.draftId)}>
              <div className="dot-icon">{n.icon || <IconBell size={13}/>}</div>
              <div className="n-body">
                <div className="n-title">{n.title}</div>
                {n.desc && <div className="n-desc">{n.desc}</div>}
              </div>
              <div className="n-time">{fmtAgo(n.ts)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================
// WORKSPACE CRUD MODAL
// ============================================================
const WS_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#4ade80', '#f59e0b', '#f87171', '#2dd4bf', '#e879f9', '#fb923c', '#fbbf24'];
const WS_KINDS = [
  { id: 'cm', label: 'Community management', icon: <IconSend/>, desc: 'Calendrier, queue, analytics' },
  { id: 'graph', label: 'Direction artistique', icon: <IconImage/>, desc: 'Moodboard, palettes' },
  { id: 'dev', label: 'Développement', icon: <IconHash/>, desc: 'Snippets, veille' },
  { id: 'mixed', label: 'Polyvalent', icon: <IconLayers/>, desc: 'Toutes les vues' },
];

function WorkspaceEditModal({ ws, onSave, onDelete, onClose }) {
  const isNew = !ws;
  const [name, setName] = useStateF(ws?.name || '');
  const [color, setColor] = useStateF(ws?.color || WS_COLORS[0]);
  const [kind, setKind] = useStateF(ws?.kind || 'cm');
  const [confirmDel, setConfirmDel] = useStateF(false);

  const save = () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'workspace';
    onSave({
      id: ws?.id || 'ws-' + Date.now(),
      name: name.trim(),
      slug,
      color,
      kind,
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-edit-modal">
        <div className="ws-edit-head">
          <span className="ws-dot" style={{width:12, height:12, borderRadius:3, background: color}}/>
          {isNew ? 'Nouvel espace' : 'Modifier l\'espace'}
        </div>
        <div className="ws-edit-body">
          <div>
            <div className="d-side-label">Nom</div>
            <input className="settings-input" style={{width:'100%'}}
                   autoFocus value={name} onChange={e => setName(e.target.value)}
                   placeholder="Ex: CM · Café Kombu"/>
          </div>
          <div>
            <div className="d-side-label">Métier</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
              {WS_KINDS.map(k => (
                <button key={k.id}
                        className={`d-channel-btn ${kind === k.id ? 'on' : ''}`}
                        style={{padding:'8px 10px', textAlign:'left', flexDirection:'column', alignItems:'flex-start', gap:2, height:'auto'}}
                        onClick={() => setKind(k.id)}>
                  <span style={{display:'flex', gap:5, alignItems:'center'}}>{k.icon}<b>{k.label}</b></span>
                  <span style={{fontSize:10.5, color:'var(--text-4)', fontWeight:400}}>{k.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="d-side-label">Couleur</div>
            <div className="color-picker-row">
              {WS_COLORS.map(c => (
                <button key={c} className={color === c ? 'selected' : ''}
                        style={{background: c}}
                        onClick={() => setColor(c)}/>
              ))}
            </div>
          </div>
        </div>
        <div className="ws-edit-foot">
          {!isNew && (
            <button className="d-action" style={{marginRight:'auto', color: confirmDel ? 'var(--danger)' : 'var(--text-3)'}}
                    onClick={() => confirmDel ? onDelete(ws.id) : setConfirmDel(true)}>
              <IconTrash/>{confirmDel ? 'Confirmer la suppression' : 'Supprimer'}
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>
            <IconCheck/>{isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  generateVariant, AIGenerateButton,
  exportDraftAsZip, loadJSZip,
  useNotifications, NotifPanel, tryDesktopNotify, dispatchSystemNotification, requestDesktopNotifPermission, getNotifPrefs, setNotifPrefs,
  WorkspaceEditModal, WS_COLORS, WS_KINDS,
});

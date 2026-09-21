// Real-time collaboration : presence + live cursors + comments + mentions
// Since no backend, we simulate collaborators with animated bots that move + comment.
const { useState: useStateC2, useEffect: useEffectC2, useRef: useRefC2, useMemo: useMemoC2 } = React;

// Simulated team roster
const TEAM = [
  { id: 'u-noemie', name: 'Noémie M.', handle: 'noemie', role: 'Owner', color: '#f472b6', status: 'online', self: true },
  { id: 'u-tarik',  name: 'Tarik B.',  handle: 'tarik',  role: 'DA',    color: '#60a5fa', status: 'online' },
  { id: 'u-lea',    name: 'Léa D.',    handle: 'lea',    role: 'CM',    color: '#4ade80', status: 'online' },
  { id: 'u-marc',   name: 'Marc H.',   handle: 'marc',   role: 'Dev',   color: '#a78bfa', status: 'away' },
  { id: 'u-camille', name: 'Camille R.', handle: 'camille', role: 'Client', color: '#fbbf24', status: 'offline' },
];

const initials = (n) => n.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

// -------------- PRESENCE STACK --------------
function PresenceStack({ team = TEAM, maxVisible = 4 }) {
  const [hover, setHover] = useStateC2(null);
  const visible = team.slice(0, maxVisible);
  const rest = team.length - visible.length;

  return (
    <div className="presence-stack">
      {visible.map(u => (
        <div key={u.id} className="presence-avatar"
             style={{ background: `linear-gradient(135deg, ${u.color}, ${adjust(u.color, -20)})` }}
             onMouseEnter={() => setHover(u.id)}
             onMouseLeave={() => setHover(null)}
             title={u.name}>
          {initials(u.name)}
          <span className={`presence-dot ${u.status}`}/>
          {hover === u.id && (
            <div className="presence-tooltip">
              <div className="who">{u.name}{u.self ? ' (vous)' : ''}</div>
              <div className="doing">{u.role} · {u.status === 'online' ? 'en ligne' : u.status === 'away' ? 'absent' : 'hors ligne'}</div>
            </div>
          )}
        </div>
      ))}
      {rest > 0 && (
        <div className="presence-avatar" style={{ background: 'var(--bg-4)', color: 'var(--text-2)' }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

function adjust(hex, amt) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(h => Math.max(0, Math.min(255, parseInt(h, 16) + amt)));
  return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
}

// -------------- LIVE CURSORS (simulation) --------------
function LiveCursorsLayer({ enabled = true }) {
  const [cursors, setCursors] = useStateC2({});
  const rafRef = useRefC2();
  const animsRef = useRefC2({});

  useEffectC2(() => {
    if (!enabled) return;
    // Only non-self, online users
    const users = TEAM.filter(u => !u.self && u.status === 'online');

    users.forEach(u => {
      // random target every few seconds
      animsRef.current[u.id] = {
        x: Math.random() * (window.innerWidth * 0.7) + 200,
        y: Math.random() * (window.innerHeight * 0.6) + 100,
        tx: 0, ty: 0,
        nextChangeAt: 0,
      };
    });

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next = {};
      users.forEach(u => {
        const a = animsRef.current[u.id];
        if (now > a.nextChangeAt) {
          a.tx = Math.random() * (window.innerWidth * 0.7) + 200;
          a.ty = Math.random() * (window.innerHeight * 0.6) + 120;
          a.nextChangeAt = now + 2000 + Math.random() * 3000;
        }
        // Ease toward target
        a.x += (a.tx - a.x) * dt * 0.9;
        a.y += (a.ty - a.y) * dt * 0.9;
        next[u.id] = { x: a.x, y: a.y };
      });
      setCursors(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled]);

  if (!enabled) return null;
  const users = TEAM.filter(u => !u.self && u.status === 'online');

  return (
    <>
      {users.map(u => {
        const c = cursors[u.id];
        if (!c) return null;
        return (
          <div key={u.id} className="live-cursor"
               style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
            <svg width="20" height="22" viewBox="0 0 20 22" fill={u.color} stroke="white" strokeWidth="1.2" strokeLinejoin="round">
              <path d="M2 2l6 18 3-8 8-3z"/>
            </svg>
            <div className="name-tag" style={{ background: u.color }}>{u.name.split(' ')[0]}</div>
          </div>
        );
      })}
    </>
  );
}

// -------------- COMMENTS on drafts --------------
function CommentsPanel({ draftId, onToast }) {
  const [comments, setComments] = useStateC2(() => loadComments(draftId));
  const [text, setText] = useStateC2('');
  const [mentionOpen, setMentionOpen] = useStateC2(false);
  const [mentionQ, setMentionQ] = useStateC2('');
  const [mentionIdx, setMentionIdx] = useStateC2(0);
  const taRef = useRefC2(null);

  useEffectC2(() => {
    setComments(loadComments(draftId));
  }, [draftId]);

  useEffectC2(() => {
    saveComments(draftId, comments);
  }, [comments, draftId]);

  const filteredMentions = useMemoC2(() => {
    const q = mentionQ.toLowerCase();
    return TEAM.filter(u => !u.self).filter(u => u.name.toLowerCase().includes(q) || u.handle.includes(q));
  }, [mentionQ]);

  const submit = () => {
    if (!text.trim()) return;
    const mentions = extractMentions(text);
    const c = {
      id: 'c-' + Date.now() + Math.random().toString(36).slice(2, 6),
      userId: 'u-noemie',
      text: text.trim(),
      ts: Date.now(),
      mentions,
    };
    setComments(prev => [...prev, c]);
    setText('');
    onToast?.(mentions.length ? `Notifié : ${mentions.map(m => '@' + m).join(', ')}` : 'Commentaire ajouté');
    setMentionOpen(false);
  };

  const onKeyDown = (e) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(filteredMentions.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(0, i - 1)); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setMentionOpen(false); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const u = filteredMentions[mentionIdx];
        if (u) insertMention(u);
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    // Detect @ trigger
    const pos = e.target.selectionStart;
    const before = v.slice(0, pos);
    const m = before.match(/@([\w]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQ(m[1]);
      setMentionIdx(0);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (u) => {
    const ta = taRef.current;
    const pos = ta.selectionStart;
    const before = text.slice(0, pos).replace(/@[\w]*$/, '');
    const after = text.slice(pos);
    const next = before + '@' + u.handle + ' ' + after;
    setText(next);
    setMentionOpen(false);
    setTimeout(() => {
      ta.focus();
      const caret = before.length + u.handle.length + 2;
      ta.setSelectionRange(caret, caret);
    }, 0);
  };

  return (
    <div className="comments-panel">
      <div className="comments-head">
        <IconMessageCircle/>
        Commentaires
        <span style={{color: 'var(--text-4)', fontWeight: 500, textTransform: 'none', letterSpacing: 0}}>({comments.length})</span>
        <div style={{marginLeft: 'auto'}}>
          <PresenceStack team={TEAM.filter(u => u.status === 'online')} maxVisible={3}/>
        </div>
      </div>

      <div className="comments-list">
        {comments.length === 0 && (
          <div style={{color: 'var(--text-4)', fontSize: 11.5, padding: '10px 0', fontStyle: 'italic'}}>
            Aucun commentaire — soyez le premier à réagir ou mentionnez un membre avec @.
          </div>
        )}
        {comments.map(c => <CommentItem key={c.id} c={c}/>)}
      </div>

      <div className="comment-composer">
        <div className="c-av">NM</div>
        <div style={{flex: 1}}>
          <textarea ref={taRef}
                    value={text}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    placeholder="Ajouter un commentaire — tapez @ pour mentionner…"/>
          {mentionOpen && filteredMentions.length > 0 && (
            <div className="mention-picker">
              {filteredMentions.map((u, i) => (
                <div key={u.id}
                     className={`mention-item ${i === mentionIdx ? 'active' : ''}`}
                     onMouseEnter={() => setMentionIdx(i)}
                     onClick={() => insertMention(u)}>
                  <div className="mp-av" style={{background: u.color}}>{initials(u.name)}</div>
                  <div>
                    <div style={{color: 'var(--text)', fontWeight: 500}}>{u.name}</div>
                    <div style={{fontSize: 10.5, color: 'var(--text-4)'}}>@{u.handle}</div>
                  </div>
                  <span className="mp-role">{u.role}</span>
                </div>
              ))}
            </div>
          )}
          <div className="send-row">
            <span className="hint"><kbd>@</kbd> mentionner · <kbd>⌘↵</kbd> envoyer</span>
            <button className="d-action primary" style={{padding: '3px 10px', fontSize: 11}}
                    disabled={!text.trim()} onClick={submit}>
              <IconSend/>Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ c }) {
  const u = TEAM.find(x => x.id === c.userId) || TEAM[0];
  return (
    <div className="comment">
      <div className="c-av" style={{background: `linear-gradient(135deg, ${u.color}, ${adjust(u.color, -20)})`}}>
        {initials(u.name)}
      </div>
      <div className="c-body">
        <div className="c-head">
          <span className="c-name">{u.name}</span>
          <span className="c-time">{fmtAgo(c.ts)}</span>
        </div>
        <div className="c-text">{renderCommentText(c.text)}</div>
        <div className="c-actions">
          <button>Répondre</button>
          <button>Réagir</button>
          {c.userId === 'u-noemie' && <button>Modifier</button>}
        </div>
      </div>
    </div>
  );
}

function renderCommentText(txt) {
  return txt.split(/(@[\w]+)/g).map((p, i) =>
    p.startsWith('@') ? <span key={i} className="mention">{p}</span> : p
  );
}

function extractMentions(text) {
  const m = text.match(/@([\w]+)/g) || [];
  return m.map(x => x.slice(1));
}

function fmtAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'à l\'instant';
  if (diff < 3600000) return Math.floor(diff/60000) + ' min';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' h';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function loadComments(draftId) {
  try {
    const all = JSON.parse(localStorage.getItem('cd-comments') || '{}');
    return all[draftId] || SEED_COMMENTS[draftId] || [];
  } catch(e) { return SEED_COMMENTS[draftId] || []; }
}
function saveComments(draftId, list) {
  try {
    const all = JSON.parse(localStorage.getItem('cd-comments') || '{}');
    all[draftId] = list;
    localStorage.setItem('cd-comments', JSON.stringify(all));
  } catch(e) {}
}

// Seed some demo comments for a couple of drafts
const SEED_COMMENTS = {
  d5: [
    { id: 'c-s1', userId: 'u-camille', ts: Date.now() - 3600000 * 6,
      text: "Super direction ! Petite question : est-ce qu'on peut ajouter le prix visible sur le visuel ?" },
    { id: 'c-s2', userId: 'u-noemie', ts: Date.now() - 3600000 * 5,
      text: "@camille bonne remarque — @tarik tu peux checker sur la v2 du carrousel ?" },
    { id: 'c-s3', userId: 'u-tarik', ts: Date.now() - 3600000 * 2,
      text: "Je regarde ça cet après-midi ✋" },
  ],
  d8: [
    { id: 'c-s4', userId: 'u-tarik', ts: Date.now() - 86400000,
      text: "J'aime beaucoup la palette. On pousse plus sur les portraits en lumière tamisée ?" },
  ],
  d19: [
    { id: 'c-s5', userId: 'u-camille', ts: Date.now() - 3600000 * 2,
      text: "Wow @tarik c'est exactement ce que j'imaginais ! ❤️" },
  ],
};

Object.assign(window, { PresenceStack, LiveCursorsLayer, CommentsPanel, TEAM, initials });

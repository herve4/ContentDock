// Sidebar + Topbar + workspace/tag primitives
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const ChannelBadge = ({ ch, size = 18 }) => {
  const map = { ig: 'channel-ig', li: 'channel-li', x: 'channel-x', fb: 'channel-fb', tt: 'channel-tt', bl: 'channel-bl' };
  const label = { ig: 'IG', li: 'in', x: '𝕏', fb: 'f', tt: 'TT', bl: '≡' };
  return <span className={`channel-badge ${map[ch] || ''}`} style={{ width: size, height: size }}>{label[ch] || '?'}</span>;
};

const StatusPill = ({ status }) => {
  const label = { idea: 'Idée', creation: 'En création', review: 'À valider', ready: 'Prêt', published: 'Publié' };
  return <span className={`status ${status}`}><span className="dot"/>{label[status]}</span>;
};

// ------------- TOPBAR -------------
function Topbar({ theme, onToggleTheme, onOpenCapture, onOpenCmdk, onOpenNotifs, onOpenSettings, onOpenMobileNav, unreadCount = 0, currentUser, onOpenAuth, onOpenGate }) {
  return (
    <div className="topbar">
      <button className="icon-btn mobile-only" onClick={onOpenMobileNav} style={{marginRight:2}}>
        <IconLayers/>
      </button>
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h11l4 4v6a2 2 0 0 1-2 2H4z"/>
            <path d="M4 8V6a2 2 0 0 1 2-2h9"/>
          </svg>
        </div>
        ContentDock
        <span style={{color:'var(--text-4)', fontSize: 10.5, fontWeight: 500, marginLeft: 2, padding:'1px 5px', background:'var(--bg-3)', borderRadius: 3}}>
          {currentUser ? 'pro' : 'invité'}
        </span>
      </div>

      <button className="top-search desktop-only" onClick={onOpenCmdk} style={{cursor:'pointer'}}>
        <IconSearch size={13}/>
        <span style={{flex:1, textAlign:'left'}}>Rechercher brouillons, tags, actions…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="top-actions">
        <div className="desktop-only" style={{marginRight: 8}}>
          {currentUser ? (
            <window.PresenceStack team={window.TEAM.filter(u => u.status !== 'offline')} maxVisible={4}/>
          ) : (
            <div
              onClick={() => onOpenGate?.('team')}
              title="Collaboration d'équipe verrouillée (Cliquez pour débloquer)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--bg-3, rgba(255,255,255,0.05))',
                border: '1px dashed var(--border-line, rgba(255,255,255,0.15))',
                borderRadius: 14,
                padding: '3px 9px',
                fontSize: 11,
                color: 'var(--text-4)',
                cursor: 'pointer'
              }}>
              <span>🔒 Équipe</span>
            </div>
          )}
        </div>
        <button className="capture-btn" onClick={onOpenCapture} title="Coller ou déposer un contenu (V)">
          <IconPaste size={13}/>
          <span>Capturer</span>
          <kbd style={{marginLeft:4, fontFamily:'var(--mono)', fontSize:10, padding:'0 4px', background:'rgba(255,255,255,.18)', borderRadius: 3}}>V</kbd>
        </button>
        <button className="icon-btn desktop-only" onClick={onOpenNotifs} title="Notifications" style={{position:'relative'}}>
          <IconBell/>
          {unreadCount > 0 && <span className="notif-badge"/>}
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Basculer thème">
          {theme === 'dark' ? <IconSun/> : <IconMoon/>}
        </button>
        <button className="icon-btn desktop-only" onClick={onOpenSettings} title="Réglages"><IconSettings/></button>
        {currentUser ? (
          <button
            className="avatar desktop-only"
            style={{marginLeft:4, border:'none', cursor:'pointer', background:'linear-gradient(135deg, #ff5a1f, #ff834f)', color:'#fff', fontWeight:700, padding: 0, overflow: 'hidden'}}
            onClick={onOpenSettings}
            title={`${currentUser.name} (${currentUser.email})`}>
            {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
              <img src={currentUser.avatar} alt={currentUser.name} style={{width:'100%', height:'100%', borderRadius:'inherit', objectFit:'cover'}} referrerPolicy="no-referrer" />
            ) : (
              currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()
            )}
          </button>
        ) : (
          <button
            className="desktop-only"
            onClick={() => onOpenAuth?.('login')}
            style={{
              marginLeft: 6,
              padding: '5px 12px',
              background: 'var(--accent, #ff5a1f)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}>
            Connexion
          </button>
        )}
      </div>
    </div>
  );
}

// ------------- SIDEBAR -------------
function Sidebar({ workspaces, tags = [], drafts, currentWs, onSelectWs, onSelectView, onEditWs, onNewWs, activeTagFilter, onSelectTagFilter, onNewTag, onDeleteTag, onOpenInvite, mobileOpen, onCloseMobile, currentUser, onOpenAuth, onOpenGate, onLogout }) {
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const counts = useMemo(() => {
    const m = { all: drafts.length, inbox: 0 };
    workspaces.forEach(w => m[w.id] = drafts.filter(d => d.ws === w.id).length);
    tags.forEach(t => m[t.id] = drafts.filter(d => (d.tags || []).includes(t.id)).length);
    m.inbox = drafts.filter(d => !d.scheduled && d.status !== 'published').length;
    return m;
  }, [workspaces, tags, drafts]);

  const handleTeamClick = () => {
    if (!currentUser) {
      onOpenGate?.('team');
    } else {
      onSelectView?.('team');
    }
  };

  return (
    <>
      {mobileOpen && <div style={{position:'fixed', inset:0, top:44, background:'rgba(0,0,0,.5)', zIndex:29}} onClick={onCloseMobile}/>}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="side-section-label" style={{paddingTop: 4}}>
          <span>Navigation</span>
        </div>
        <button className={`side-item ${currentWs === 'all' && !activeTagFilter ? 'active' : ''}`} onClick={() => { onSelectTagFilter?.(null); onSelectWs('all'); onCloseMobile?.(); }}>
          <IconLayers/> Tous les brouillons
          <span className="count">{counts.all}</span>
        </button>
        <button className={`side-item ${currentWs === 'inbox' && !activeTagFilter ? 'active' : ''}`} onClick={() => { onSelectTagFilter?.(null); onSelectWs('inbox'); onCloseMobile?.(); }}>
          <IconInbox/> Non planifiés
          <span className="count">{counts.inbox}</span>
        </button>
        <button className="side-item">
          <IconStar/> Favoris
        </button>
        <button className="side-item">
          <IconArchive/> Archivés
        </button>

        <div className="side-section-label">
          <span>Espaces</span>
          <button title="Nouvel espace" onClick={onNewWs}><IconPlus size={12}/></button>
        </div>
        {workspaces.map(w => (
          <div key={w.id}
               role="button"
               tabIndex={0}
               className={`side-item ${currentWs === w.id && !activeTagFilter ? 'active' : ''}`}
               onClick={() => { onSelectTagFilter?.(null); onSelectWs(w.id); onCloseMobile?.(); }}
               onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTagFilter?.(null); onSelectWs(w.id); onCloseMobile?.(); } }}
               onContextMenu={e => { e.preventDefault(); onEditWs(w); }}
               title="Clic droit pour modifier">
            <span className="ws-dot" style={{background: w.color}}/>
            <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1}}>{w.name}</span>
            <button onClick={e => { e.stopPropagation(); onEditWs(w); }}
                    style={{opacity:0.5, padding:2, borderRadius:3, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', display:'inline-flex'}}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                    title="Modifier l'espace">
              <IconEdit size={11}/>
            </button>
            <span className="count">{counts[w.id] || 0}</span>
          </div>
        ))}

        <div className="side-section-label">
          <span>Tags</span>
          <button title="Nouveau tag" onClick={() => setTagModalOpen(true)}><IconPlus size={12}/></button>
        </div>
        {tags.map(t => (
          <div key={t.id}
               className={`side-item ${activeTagFilter === t.id ? 'active' : ''}`}
               onClick={() => { onSelectTagFilter?.(activeTagFilter === t.id ? null : t.id); onCloseMobile?.(); }}
               style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}
               title={`Filtrer par #${t.label} (cliquez pour basculer)`}>
            <span className="tag-hash" style={{color: t.color || 'var(--accent)', fontWeight: 'bold'}}>#</span>
            <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex: 1}}>{t.label}</span>
            <span className="count">{counts[t.id] || 0}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(`Supprimer le tag #${t.label} ?`)) {
                  onDeleteTag?.(t.id);
                }
              }}
              style={{
                marginLeft: 4,
                padding: '2px 4px',
                borderRadius: 3,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-4)',
                cursor: 'pointer',
                opacity: 0.5,
                display: 'inline-flex',
                alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
              title="Supprimer ce tag">
              <IconX size={10}/>
            </button>
          </div>
        ))}

        {/* Members widget for current workspace */}
        {currentWs !== 'all' && currentWs !== 'inbox' && workspaces.find(w => w.id === currentWs) && (
          <window.SideMembers workspace={workspaces.find(w => w.id === currentWs)}
                               onOpenTeam={handleTeamClick}
                               onOpenInvite={() => {
                                 if (!currentUser) onOpenGate?.('team');
                                 else onOpenInvite?.(currentWs);
                               }}/>
        )}

        {/* Mobile-only: extra views accessible from menu */}
        <div className="mobile-only" style={{marginTop: 12}}>
          <div className="side-section-label"><span>Outils</span></div>
          <button className="side-item" onClick={() => { onSelectView?.('templates'); onCloseMobile?.(); }}>
            <IconLayers/> Templates
          </button>
          <button className="side-item" onClick={() => { onSelectView?.('import'); onCloseMobile?.(); }}>
            <IconUpload/> Importer
          </button>
          <button className="side-item" onClick={() => { onSelectView?.('assistant'); onCloseMobile?.(); }}>
            <IconSparkles/> Assistant IA
          </button>
          <button className="side-item" onClick={() => { handleTeamClick(); onCloseMobile?.(); }}>
            <IconInbox/> Équipe
          </button>
          <button className="side-item" onClick={() => { onSelectView?.('settings'); onCloseMobile?.(); }}>
            <IconSettings/> Paramètres
          </button>
        </div>

        <div className="side-user">
          {currentUser ? (
            <>
              <div className="avatar" style={{background:'linear-gradient(135deg, #ff5a1f, #ff834f)', color:'#fff', fontWeight:700, padding: 0, overflow: 'hidden'}}>
                {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
                  <img src={currentUser.avatar} alt={currentUser.name} style={{width:'100%', height:'100%', borderRadius:'inherit', objectFit:'cover'}} referrerPolicy="no-referrer" />
                ) : (
                  currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div style={{overflow:'hidden', flex:1}}>
                <div style={{color:'var(--text)', fontSize:12, fontWeight:600, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>
                  {currentUser.name}
                </div>
                <div style={{fontSize:10.5, color:'var(--text-4)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>
                  {currentUser.email}
                </div>
              </div>
              <button className="icon-btn" title="Se déconnecter" onClick={onLogout} style={{marginLeft:'auto', color:'var(--text-4)'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </>
          ) : (
            <div style={{display:'flex', alignItems:'center', gap: 10, width:'100%', cursor:'pointer'}} onClick={() => onOpenAuth?.('login')}>
              <div className="avatar" style={{background:'rgba(255,255,255,0.06)', color:'var(--text-3)', fontSize: 13}}>👤</div>
              <div style={{flex:1}}>
                <div style={{color:'var(--text)', fontSize:12, fontWeight:600}}>Mode Invité</div>
                <div style={{fontSize:10.5, color:'#ff5a1f'}}>Se connecter →</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {tagModalOpen && (
        <TagEditModal
          workspaces={workspaces}
          onClose={() => setTagModalOpen(false)}
          onSave={(newTag) => onNewTag?.(newTag)}/>
      )}
    </>
  );
}

function TagEditModal({ onClose, onSave, workspaces = [] }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#a78bfa');
  const [wsId, setWsId] = useState('');
  const TAG_COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#2dd4bf', '#fb923c'];

  const handleSave = () => {
    const cleanLabel = label.trim().replace(/^#+/, '');
    if (!cleanLabel) return;
    onSave({
      id: 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      label: cleanLabel,
      color,
      ws: wsId || null
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-edit-modal" style={{maxWidth: 380}}>
        <div className="ws-edit-head">
          <span style={{color, fontWeight: 800, fontSize: 18}}>#</span>
          Nouveau tag
        </div>
        <div className="ws-edit-body">
          <div>
            <div className="d-side-label">Nom du tag</div>
            <input className="settings-input" style={{width: '100%'}}
                   autoFocus
                   value={label}
                   onChange={e => setLabel(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                   placeholder="Ex: actu, promo, tutoriel..."/>
          </div>
          <div>
            <div className="d-side-label">Couleur</div>
            <div className="color-picker-row">
              {TAG_COLORS.map(c => (
                <button key={c} className={color === c ? 'selected' : ''}
                        style={{background: c}}
                        onClick={() => setColor(c)}/>
              ))}
            </div>
          </div>
          {workspaces.length > 0 && (
            <div>
              <div className="d-side-label">Espace associé (optionnel)</div>
              <select className="d-select" style={{width: '100%'}} value={wsId} onChange={e => setWsId(e.target.value)}>
                <option value="">Tous les espaces (Tag universel)</option>
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="ws-edit-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={handleSave} disabled={!label.trim()}>
            <IconCheck/>Créer le tag
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Topbar, Sidebar, TagEditModal, ChannelBadge, StatusPill });

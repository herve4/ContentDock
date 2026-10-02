// Storyboard / Kanban / List views avec Défilement Vertical fluide (Souris & Tactile), Tri et Suppression
const { useState: useStateV, useMemo: useMemoV, useRef: useRefV, useEffect: useEffectV } = React;

// Hook universel de défilement vertical manipulable à la souris (drag-to-scroll) ou au doigt (tactile)
function useSmoothDragScroll() {
  const ref = useRefV(null);
  const isDown = useRefV(false);
  const startY = useRefV(0);
  const scrollTop = useRefV(0);
  const moved = useRefV(false);

  useEffectV(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e) => {
      // Ignorer si clic sur bouton, lien, champ texte, vidéo ou sélecteur
      if (e.target.closest('button, a, input, select, textarea, video, .card-quick-actions')) return;
      isDown.current = true;
      moved.current = false;
      startY.current = e.pageY - el.offsetTop;
      scrollTop.current = el.scrollTop;
      el.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
      if (!isDown.current) return;
      const y = e.pageY - el.offsetTop;
      const walk = (y - startY.current) * 1.3;
      if (Math.abs(walk) > 4) {
        moved.current = true;
        el.style.cursor = 'grabbing';
      }
      el.scrollTop = scrollTop.current - walk;
    };

    const onMouseUp = () => {
      if (!isDown.current) return;
      isDown.current = false;
      if (el) {
        el.style.cursor = '';
        el.style.removeProperty('user-select');
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { ref, wasDragged: () => moved.current };
}

// ============ STORYBOARD ============
function StoryboardView({ drafts, onOpen, onDelete, onSetTriage }) {
  const { ref, wasDragged } = useSmoothDragScroll();
  const [showScrollTop, setShowScrollTop] = useStateV(false);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    setShowScrollTop(el.scrollTop > 240);
  };

  if (!drafts.length) return <EmptyView label="Aucun brouillon" hint="Utilisez Capturer (V) pour en ajouter un."/>;

  return (
    <div
      ref={ref}
      className="cd-smooth-scroll-container"
      onScroll={handleScroll}
      style={{
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        scrollBehavior: 'smooth',
        paddingRight: 6,
        position: 'relative'
      }}
    >
      <div className="storyboard-grid">
        {drafts.map(d => (
          <StoryCard
            key={d.id}
            d={d}
            onClick={() => { if (!wasDragged()) onOpen(d.id); }}
            onDelete={onDelete}
            onSetTriage={onSetTriage}
          />
        ))}
      </div>

      {showScrollTop && (
        <button
          type="button"
          onClick={() => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-primary"
          style={{
            position: 'fixed',
            bottom: 30,
            right: 32,
            zIndex: 100,
            borderRadius: '50%',
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontSize: 16
          }}
          title="Remonter en haut"
        >
          ↑
        </button>
      )}
    </div>
  );
}

function StoryCard({ d, onClick, onDelete, onSetTriage }) {
  const cover = d.images && d.images[0];
  const isCoverVideo = window.isVideoMedia && window.isVideoMedia(cover);
  const isBad = d.triage === 'bad';
  const isGood = d.triage === 'good';

  return (
    <div
      className={`draft-card ${isBad ? 'triage-bad' : ''} ${isGood ? 'triage-good' : ''}`}
      onClick={onClick}
      style={{
        position: 'relative',
        opacity: isBad ? 0.65 : 1,
        border: isBad ? '1px solid rgba(239, 68, 68, 0.45)' : (isGood ? '1px solid rgba(16, 185, 129, 0.55)' : undefined),
        boxShadow: isGood ? '0 0 12px rgba(16, 185, 129, 0.15)' : undefined,
        transition: 'transform 0.15s ease, opacity 0.2s ease, border-color 0.2s ease',
        cursor: 'pointer'
      }}
    >
      {/* Barre d'action rapide sur carte : Tri & Suppression */}
      <div
        className="card-quick-actions"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          background: 'rgba(20, 21, 26, 0.90)',
          backdropFilter: 'blur(8px)',
          padding: '3px 6px',
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {onSetTriage && (
          <>
            <button
              type="button"
              className="icon-btn"
              title={isGood ? "Retenu (Bon)" : "Marquer comme bon"}
              style={{
                background: isGood ? '#10b981' : 'none',
                color: isGood ? '#fff' : 'var(--text-3)',
                padding: '2px 5px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12
              }}
              onClick={() => onSetTriage(d.id, isGood ? 'pending' : 'good')}
            >
              👍
            </button>
            <button
              type="button"
              className="icon-btn"
              title={isBad ? "Rejeté (À enlever)" : "Marquer comme à enlever"}
              style={{
                background: isBad ? '#ef4444' : 'none',
                color: isBad ? '#fff' : 'var(--text-3)',
                padding: '2px 5px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12
              }}
              onClick={() => onSetTriage(d.id, isBad ? 'pending' : 'bad')}
            >
              👎
            </button>
          </>
        )}
        <button
          type="button"
          className="icon-btn"
          title="Partager sur WhatsApp"
          style={{
            background: 'none',
            color: '#25D366',
            padding: '2px 5px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12
          }}
          onClick={() => {
            const formatted = window.formatDraftForWhatsApp ? window.formatDraftForWhatsApp(d) : (d.title + '\n\n' + d.body);
            if (window.shareToWhatsApp) window.shareToWhatsApp(formatted);
          }}
        >
          💬
        </button>
        {onDelete && (
          <button
            type="button"
            className="icon-btn"
            title="Supprimer ce brouillon"
            style={{
              background: 'none',
              color: 'var(--danger, #f87171)',
              padding: '2px 5px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12
            }}
            onClick={() => onDelete(d.id)}
          >
            <IconTrash size={12}/>
          </button>
        )}
      </div>

      {cover ? (
        <div className="media">
          {isCoverVideo ? (
            <div className="card-video-wrap">
              <video src={cover} muted preload="metadata" playsInline />
              <div className="card-video-badge">▶ VIDÉO</div>
              <div className="card-video-play-btn">
                <div className="card-video-play-circle">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
            </div>
          ) : (
            <img src={cover} alt="" loading="lazy"/>
          )}
          {d.images.length > 1 && (
            <div className="media-count"><IconLayers size={11}/>{d.images.length}</div>
          )}
          <div className="media-overlay">
            {d.body ? d.body.slice(0, 120) + (d.body.length > 120 ? '…' : '') : d.title}
          </div>
        </div>
      ) : (
        <div className="media" style={{aspectRatio:'4/3', display:'grid', placeItems:'center', color:'var(--text-4)'}}>
          <div style={{textAlign:'center'}}>
            <IconHash size={22}/>
            <div style={{fontSize:10.5, marginTop:4, fontFamily:'var(--mono)'}}>
              {d.tags?.includes('diagramme') ? 'schéma d’architecture' : 'texte seul'}
            </div>
          </div>
        </div>
      )}
      <div className="body">
        <div className="row" style={{alignItems: 'flex-start'}}>
          <ChannelBadge ch={d.channel}/>
          <div className="title" style={{textDecoration: isBad ? 'line-through' : 'none', flex: 1}}>
            {d.title}
          </div>
        </div>
        <div className="meta">
          <StatusPill status={d.status}/>
          {isGood && <span style={{color: '#10b981', fontWeight: 600, fontSize: 10.5}}>· 👍 Bon</span>}
          {isBad && <span style={{color: '#ef4444', fontWeight: 600, fontSize: 10.5}}>· 👎 À enlever</span>}
          {d.scheduled && (
            <>
              <span style={{color:'var(--text-4)'}}>·</span>
              <IconClock/> {fmtSched(d.scheduled)}
            </>
          )}
        </div>
        {d.tags && d.tags.length > 0 && (
          <div className="tags-row">
            {d.tags.map(tid => {
              const allTags = window.CD_TAGS || window.CD_DATA?.tags || [];
              const t = allTags.find(x => x.id === tid);
              return t ? <span key={tid} className="tag-pill" style={{borderLeft: `2px solid ${t.color || 'var(--accent)'}`}}>#{t.label}</span> : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ KANBAN ============
function KanbanView({ drafts, statuses, onOpen, onMove, onDelete, onSetTriage }) {
  const [dragId, setDragId] = useStateV(null);
  const [overCol, setOverCol] = useStateV(null);

  const byStatus = useMemoV(() => {
    const m = {};
    statuses.forEach(s => m[s.id] = []);
    drafts.forEach(d => (m[d.status] || (m[d.status] = [])).push(d));
    return m;
  }, [drafts, statuses]);

  return (
    <div className="kanban">
      {statuses.map(s => (
        <div key={s.id}
             className={`kanban-col ${overCol === s.id ? 'drag-over' : ''}`}
             onDragOver={e => { e.preventDefault(); setOverCol(s.id); }}
             onDragLeave={() => setOverCol(null)}
             onDrop={e => { e.preventDefault(); if (dragId) onMove(dragId, s.id); setOverCol(null); setDragId(null); }}>
          <div className="kanban-col-head">
            <span className={`status ${s.id}`}><span className="dot"/></span>
            <span className="kanban-col-title">{s.label}</span>
            <span className="kanban-col-count">{byStatus[s.id]?.length || 0}</span>
            <button className="kanban-col-add" title="Ajouter"><IconPlus size={13}/></button>
          </div>
          <div className="kanban-col-body">
            {(byStatus[s.id] || []).map(d => {
              const isBad = d.triage === 'bad';
              const isGood = d.triage === 'good';
              return (
                <div key={d.id}
                     className={`kanban-card ${dragId === d.id ? 'dragging' : ''}`}
                     draggable
                     onDragStart={() => setDragId(d.id)}
                     onDragEnd={() => setDragId(null)}
                     onClick={() => onOpen(d.id)}
                     style={{
                       position: 'relative',
                       opacity: isBad ? 0.6 : 1,
                       border: isBad ? '1px solid rgba(239,68,68,0.4)' : (isGood ? '1px solid rgba(16,185,129,0.5)' : undefined)
                     }}
                >
                  <div
                    className="card-quick-actions"
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 5,
                      display: 'flex',
                      gap: 2,
                      background: 'rgba(20,21,26,0.85)',
                      borderRadius: 4,
                      padding: 2
                    }}
                  >
                    {onSetTriage && (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Retenu"
                          style={{border:'none', background:'none', cursor:'pointer', fontSize: 10, padding: 2}}
                          onClick={() => onSetTriage(d.id, isGood ? 'pending' : 'good')}
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="À enlever"
                          style={{border:'none', background:'none', cursor:'pointer', fontSize: 10, padding: 2}}
                          onClick={() => onSetTriage(d.id, isBad ? 'pending' : 'bad')}
                        >
                          👎
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      title="Partager sur WhatsApp"
                      style={{border:'none', background:'none', color:'#25D366', cursor:'pointer', padding: 2, fontSize: 11}}
                      onClick={() => {
                        const formatted = window.formatDraftForWhatsApp ? window.formatDraftForWhatsApp(d) : (d.title + '\n\n' + d.body);
                        if (window.shareToWhatsApp) window.shareToWhatsApp(formatted);
                      }}
                    >
                      💬
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Supprimer"
                        style={{border:'none', background:'none', color:'var(--danger, #f87171)', cursor:'pointer', padding: 2}}
                        onClick={() => onDelete(d.id)}
                      >
                        <IconTrash size={11}/>
                      </button>
                    )}
                  </div>

                  {d.images[0] && (
                    <div className="kc-thumb">
                      {window.isVideoMedia && window.isVideoMedia(d.images[0]) ? (
                        <div style={{position:'relative', width:'100%', height:'100%'}}>
                          <video src={d.images[0]} muted preload="metadata" playsInline style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          <span style={{position:'absolute', bottom:2, left:2, background:'rgba(0,0,0,0.7)', color:'#ff834f', fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:2}}>▶</span>
                        </div>
                      ) : (
                        <img src={d.images[0]} loading="lazy" alt=""/>
                      )}
                    </div>
                  )}
                  <div className="kc-title" style={{textDecoration: isBad ? 'line-through' : 'none'}}>{d.title}</div>
                  <div className="kc-meta">
                    <ChannelBadge ch={d.channel} size={14}/>
                    {isGood && <span style={{color: '#10b981', fontSize: 10}}>👍</span>}
                    {isBad && <span style={{color: '#ef4444', fontSize: 10}}>👎</span>}
                    {d.scheduled && <><IconClock size={11}/><span>{fmtSched(d.scheduled)}</span></>}
                    {!d.scheduled && <span style={{color:'var(--text-4)'}}>non planifié</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ LIST ============
function ListView({ drafts, onOpen, onDelete, onSetTriage }) {
  const { ref } = useSmoothDragScroll();

  return (
    <div
      ref={ref}
      style={{
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      <table className="list-table">
        <thead>
          <tr>
            <th style={{width: 46}}></th>
            <th>Titre</th>
            <th style={{width: 105}}>Statut</th>
            <th style={{width: 80}}>Canal</th>
            <th style={{width: 140}}>Tags</th>
            <th style={{width: 130}}>Planifié</th>
            <th style={{width: 90}}>Tri / Avis</th>
            <th style={{width: 70}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map(d => {
            const isBad = d.triage === 'bad';
            const isGood = d.triage === 'good';
            return (
              <tr
                key={d.id}
                onClick={() => onOpen(d.id)}
                style={{
                  opacity: isBad ? 0.6 : 1,
                  background: isGood ? 'rgba(16, 185, 129, 0.04)' : undefined,
                  cursor: 'pointer'
                }}
              >
                <td>
                  {d.images[0]
                    ? (window.isVideoMedia && window.isVideoMedia(d.images[0])
                        ? <div className="lt-thumb" style={{position:'relative', overflow:'hidden', background:'#000'}}>
                            <video src={d.images[0]} muted preload="metadata" playsInline style={{width:'100%', height:'100%', objectFit:'cover'}} />
                            <span style={{position:'absolute', inset:0, display:'grid', placeItems:'center', color:'#ff5a1f', fontSize:11}}>▶</span>
                          </div>
                        : <img className="lt-thumb" src={d.images[0]} alt=""/>)
                    : <div className="lt-thumb" style={{display:'grid', placeItems:'center', color:'var(--text-4)'}}><IconHash size={12}/></div>}
                </td>
                <td>
                  <span className="lt-title" style={{textDecoration: isBad ? 'line-through' : 'none'}}>
                    {d.title}
                  </span>
                </td>
                <td><StatusPill status={d.status}/></td>
                <td><ChannelBadge ch={d.channel}/></td>
                <td>
                  <div style={{display:'flex', gap:3, flexWrap:'wrap'}}>
                    {(d.tags || []).slice(0, 3).map(tid => {
                      const allTags = window.CD_TAGS || window.CD_DATA?.tags || [];
                      const t = allTags.find(x => x.id === tid);
                      return t ? <span key={tid} className="tag-pill" style={{borderLeft: `2px solid ${t.color || 'var(--accent)'}`}}>#{t.label}</span> : null;
                    })}
                  </div>
                </td>
                <td className="lt-mono">
                  {d.scheduled
                    ? fmtSchedFull(d.scheduled)
                    : <span style={{color:'var(--text-4)'}}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                    <button
                      type="button"
                      className={`btn ${isGood ? 'primary' : 'ghost'}`}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        background: isGood ? '#10b981' : undefined,
                        borderColor: isGood ? '#10b981' : undefined,
                        color: isGood ? '#fff' : undefined
                      }}
                      title="Retenu (Bon)"
                      onClick={() => onSetTriage?.(d.id, isGood ? 'pending' : 'good')}
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      className={`btn ${isBad ? 'primary' : 'ghost'}`}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        background: isBad ? '#ef4444' : undefined,
                        borderColor: isBad ? '#ef4444' : undefined,
                        color: isBad ? '#fff' : undefined
                      }}
                      title="À enlever"
                      onClick={() => onSetTriage?.(d.id, isBad ? 'pending' : 'bad')}
                    >
                      👎
                    </button>
                  </div>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Partager sur WhatsApp"
                      style={{color: '#25D366', padding: 4}}
                      onClick={() => {
                        const formatted = window.formatDraftForWhatsApp ? window.formatDraftForWhatsApp(d) : (d.title + '\n\n' + d.body);
                        if (window.shareToWhatsApp) window.shareToWhatsApp(formatted);
                      }}
                    >
                      💬
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Supprimer définitivement"
                        style={{color: 'var(--danger, #f87171)', padding: 4}}
                        onClick={() => onDelete(d.id)}
                      >
                        <IconTrash size={13}/>
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => onOpen(d.id)} title="Ouvrir"><IconMoreH size={14}/></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ helpers ============
function fmtSched(s) {
  if (!s) return '';
  const d = new Date();
  return `${String(s.day).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} · ${String(s.hour).padStart(2,'0')}:00`;
}
function fmtSchedFull(s) {
  if (!s) return '';
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(s.day).padStart(2,'0')} ${String(s.hour).padStart(2,'0')}:00`;
}

function EmptyView({ label, hint }) {
  return (
    <div className="empty-state">
      <IconInbox/>
      <div className="es-title">{label}</div>
      <div>{hint}</div>
    </div>
  );
}

Object.assign(window, { StoryboardView, KanbanView, ListView, EmptyView, fmtSched, fmtSchedFull, useSmoothDragScroll });

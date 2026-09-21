// Storyboard / Kanban / List views
const { useState: useStateV, useMemo: useMemoV } = React;

// ============ STORYBOARD ============
function StoryboardView({ drafts, onOpen }) {
  if (!drafts.length) return <EmptyView label="Aucun brouillon" hint="Utilisez Capturer (V) pour en ajouter un."/>;
  return (
    <div className="storyboard-grid">
      {drafts.map(d => <StoryCard key={d.id} d={d} onClick={() => onOpen(d.id)}/>)}
    </div>
  );
}

function StoryCard({ d, onClick }) {
  const cover = d.images && d.images[0];
  const isCoverVideo = window.isVideoMedia && window.isVideoMedia(cover);

  return (
    <div className="draft-card" onClick={onClick}>
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
            <div style={{fontSize:10.5, marginTop:4, fontFamily:'var(--mono)'}}>texte seul</div>
          </div>
        </div>
      )}
      <div className="body">
        <div className="row">
          <ChannelBadge ch={d.channel}/>
          <div className="title">{d.title}</div>
        </div>
        <div className="meta">
          <StatusPill status={d.status}/>
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
function KanbanView({ drafts, statuses, onOpen, onMove }) {
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
            {(byStatus[s.id] || []).map(d => (
              <div key={d.id}
                   className={`kanban-card ${dragId === d.id ? 'dragging' : ''}`}
                   draggable
                   onDragStart={() => setDragId(d.id)}
                   onDragEnd={() => setDragId(null)}
                   onClick={() => onOpen(d.id)}>
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
                <div className="kc-title">{d.title}</div>
                <div className="kc-meta">
                  <ChannelBadge ch={d.channel} size={14}/>
                  {d.scheduled && <><IconClock size={11}/><span>{fmtSched(d.scheduled)}</span></>}
                  {!d.scheduled && <span style={{color:'var(--text-4)'}}>non planifié</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ LIST ============
function ListView({ drafts, onOpen }) {
  return (
    <table className="list-table">
      <thead>
        <tr>
          <th style={{width: 46}}></th>
          <th>Titre</th>
          <th style={{width: 110}}>Statut</th>
          <th style={{width: 90}}>Canal</th>
          <th style={{width: 160}}>Tags</th>
          <th style={{width: 140}}>Planifié</th>
          <th style={{width: 60}}>Médias</th>
          <th style={{width: 32}}></th>
        </tr>
      </thead>
      <tbody>
        {drafts.map(d => (
          <tr key={d.id} onClick={() => onOpen(d.id)}>
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
            <td><span className="lt-title">{d.title}</span></td>
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
            <td className="lt-mono">{d.images.length || '—'}</td>
            <td><button className="icon-btn" onClick={e => e.stopPropagation()}><IconMoreH size={14}/></button></td>
          </tr>
        ))}
      </tbody>
    </table>
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

Object.assign(window, { StoryboardView, KanbanView, ListView, EmptyView, fmtSched, fmtSchedFull });

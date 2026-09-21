// Command palette ⌘K
const { useState: useStateCmd, useEffect: useEffectCmd, useRef: useRefCmd, useMemo: useMemoCmd } = React;

function CmdK({ drafts, workspaces, onClose, onSelectDraft, onSelectWs, onSelectView, onOpenCapture, onToggleTheme }) {
  const [q, setQ] = useStateCmd('');
  const [idx, setIdx] = useStateCmd(0);
  const inputRef = useRefCmd(null);

  useEffectCmd(() => { inputRef.current?.focus(); }, []);

  // Actions statiques
  const actions = useMemoCmd(() => [
    { id: 'capture', kind: 'action', title: 'Capturer un contenu', sub: 'Coller ou déposer', icon: <IconPaste/>, shortcut: ['V'], run: () => { onClose(); onOpenCapture(); } },
    { id: 'v-storyboard', kind: 'action', title: 'Vue Storyboard', sub: 'Grille visuelle', icon: <IconGrid/>, shortcut: ['G'], run: () => { onClose(); onSelectView('storyboard'); } },
    { id: 'v-kanban', kind: 'action', title: 'Vue Kanban', sub: 'Colonnes par statut', icon: <IconColumns/>, shortcut: ['K'], run: () => { onClose(); onSelectView('kanban'); } },
    { id: 'v-list', kind: 'action', title: 'Vue Liste', sub: 'Compacte', icon: <IconList/>, shortcut: ['L'], run: () => { onClose(); onSelectView('list'); } },
    { id: 'v-calendar', kind: 'action', title: 'Vue Calendrier', sub: 'Mois / semaine', icon: <IconCalendar/>, shortcut: ['C'], run: () => { onClose(); onSelectView('calendar'); } },
    { id: 'v-analytics', kind: 'action', title: 'Vue Analytics', sub: 'Stats & heatmap', icon: <IconZap/>, shortcut: ['A'], run: () => { onClose(); onSelectView('analytics'); } },
    { id: 'v-queue', kind: 'action', title: 'File d\'attente', sub: 'Publications à venir', icon: <IconClock/>, shortcut: ['Q'], run: () => { onClose(); onSelectView('queue'); } },
    { id: 'v-team',      kind: 'action', title: 'Équipe & permissions', sub: 'Membres, rôles, invitations', icon: <IconInbox/>, run: () => { onClose(); onSelectView('team'); } },
    { id: 'v-templates', kind: 'action', title: 'Templates & séries', sub: 'Bibliothèque de modèles', icon: <IconLayers/>, run: () => { onClose(); onSelectView('templates'); } },
    { id: 'v-import',    kind: 'action', title: 'Importer un post', sub: 'OCR depuis screenshot', icon: <IconUpload/>, run: () => { onClose(); onSelectView('import'); } },
    { id: 'v-assistant', kind: 'action', title: 'Assistant script IA', sub: 'Thread X, Storytelling LinkedIn', icon: <IconSparkles/>, run: () => { onClose(); onSelectView('assistant'); } },
    { id: 'v-settings',  kind: 'action', title: 'Paramètres', sub: 'Profil, intégrations, thème', icon: <IconSettings/>, run: () => { onClose(); onSelectView('settings'); } },
    { id: 'theme', kind: 'action', title: 'Basculer le thème', sub: 'Clair / sombre', icon: <IconMoon/>, run: () => { onClose(); onToggleTheme(); } },
  ], [onClose, onOpenCapture, onSelectView, onToggleTheme]);

  // Filtered items
  const results = useMemoCmd(() => {
    const query = q.trim().toLowerCase();
    const wsItems = workspaces.map(w => ({
      id: 'ws-' + w.id,
      kind: 'workspace',
      title: w.name,
      sub: 'Aller à l\'espace',
      dot: w.color,
      run: () => { onClose(); onSelectWs(w.id); },
    }));
    const draftItems = drafts.map(d => ({
      id: 'd-' + d.id,
      kind: 'draft',
      title: d.title,
      sub: workspaces.find(w => w.id === d.ws)?.name || '',
      thumb: d.images[0],
      channel: d.channel,
      run: () => { onClose(); onSelectDraft(d.id); },
    }));
    const all = [...actions, ...wsItems, ...draftItems];
    if (!query) return all.slice(0, 20);
    const scored = all
      .map(item => ({ item, score: fuzzyScore(query, item.title + ' ' + (item.sub || '')) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(x => x.item);
    return scored;
  }, [q, drafts, workspaces, actions, onClose, onSelectDraft, onSelectWs]);

  useEffectCmd(() => { setIdx(0); }, [q]);

  useEffectCmd(() => {
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = results[idx];
        if (it) it.run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, idx, onClose]);

  // Group items
  const grouped = useMemoCmd(() => {
    const g = { action: [], workspace: [], draft: [] };
    results.forEach(r => (g[r.kind] || (g[r.kind] = [])).push(r));
    return g;
  }, [results]);

  const groupLabels = { action: 'Actions', workspace: 'Espaces', draft: 'Brouillons' };
  const activeItem = results[idx];

  let runningIdx = 0;

  return (
    <div className="cmdk-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cmdk">
        <div className="cmdk-input-row">
          <IconSearch/>
          <input ref={inputRef}
                 value={q}
                 onChange={e => setQ(e.target.value)}
                 placeholder="Chercher une action, un espace, un brouillon…"/>
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list">
          {results.length === 0 && <div className="cmdk-empty">Aucun résultat pour « {q} »</div>}
          {['action', 'workspace', 'draft'].map(k => grouped[k]?.length > 0 && (
            <div key={k}>
              <div className="cmdk-group-label">{groupLabels[k]}</div>
              {grouped[k].map(item => {
                const my = runningIdx++;
                const active = my === idx;
                return (
                  <div key={item.id}
                       className={`cmdk-item ${active ? 'active' : ''}`}
                       onMouseEnter={() => setIdx(my)}
                       onClick={item.run}>
                    {item.kind === 'workspace' ? (
                      <div className="cmdk-icon" style={{background: item.dot}}/>
                    ) : item.kind === 'draft' && item.thumb ? (
                      <img className="cmdk-thumb" src={item.thumb} alt=""/>
                    ) : item.kind === 'draft' ? (
                      <div className="cmdk-icon"><IconHash/></div>
                    ) : (
                      <div className="cmdk-icon">{item.icon}</div>
                    )}
                    <span className="cmdk-title">{item.title}</span>
                    {item.sub && <span className="cmdk-sub">{item.sub}</span>}
                    {item.kind === 'draft' && item.channel && (
                      <span style={{marginLeft: 6}}><ChannelBadge ch={item.channel} size={14}/></span>
                    )}
                    {item.shortcut && (
                      <span className="cmdk-shortcut">
                        {item.shortcut.map((s, i) => <kbd key={i}>{s}</kbd>)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> ouvrir</span>
          <span style={{marginLeft:'auto'}}>{results.length} résultat{results.length>1?'s':''}</span>
        </div>
      </div>
    </div>
  );
}

// Simple fuzzy scorer — favors prefix + contiguous matches
function fuzzyScore(query, target) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.startsWith(q)) return 100;
  if (t.includes(q)) return 60;
  // char-by-char scattered
  let ti = 0, score = 0, last = -1;
  for (const c of q) {
    const found = t.indexOf(c, ti);
    if (found === -1) return 0;
    if (last !== -1 && found === last + 1) score += 2;
    score += 1;
    last = found;
    ti = found + 1;
  }
  return score;
}

Object.assign(window, { CmdK });

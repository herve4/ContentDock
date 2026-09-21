const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useCallback: useCallbackA, useRef: useRefA } = React;

function App() {
  // -------- Theme --------
  const [theme, setTheme] = useStateA(() => localStorage.getItem('cd-theme') || 'dark');
  useEffectA(() => {
    document.body.className = theme === 'light' ? 'theme-light' : '';
    localStorage.setItem('cd-theme', theme);
  }, [theme]);

  // -------- Accent color on mount --------
  useEffectA(() => {
    const accent = localStorage.getItem('cd-accent');
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
      const rgb = accent.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
      document.documentElement.style.setProperty('--accent-soft', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.14)`);
      document.documentElement.style.setProperty('--accent-line', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
    }
  }, []);

  // -------- Authentification & Session Utilisateur (Guest-First) --------
  const [currentUser, setCurrentUser] = useStateA(() => {
    if (window.ContentDockDB && typeof window.ContentDockDB.getCurrentUser === 'function') {
      return window.ContentDockDB.getCurrentUser();
    }
    try {
      const saved = localStorage.getItem('cd_current_user');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  const [authModal, setAuthModal] = useStateA({ open: false, view: 'login', reason: null });
  const [gateModal, setGateModal] = useStateA({ open: false, feature: 'team' });

  const openAuth = useCallbackA((view = 'login', reason = null) => {
    setAuthModal({ open: true, view, reason });
  }, []);

  const openGate = useCallbackA((feature = 'team') => {
    setGateModal({ open: true, feature });
  }, []);

  const handleLogout = useCallbackA(() => {
    if (window.ContentDockDB && typeof window.ContentDockDB.logoutUser === 'function') {
      window.ContentDockDB.logoutUser();
    }
    setCurrentUser(null);
    if (typeof showToast === 'function') showToast('Déconnecté. Mode invité actif.');
  }, [showToast]);

  useEffectA(() => {
    const onAuthChange = (e) => {
      setCurrentUser(e.detail);
    };
    window.addEventListener('cd-auth-change', onAuthChange);
    return () => window.removeEventListener('cd-auth-change', onAuthChange);
  }, []);

  // -------- Workspaces & Drafts (chargement & persistance SQLite locale) --------
  const [workspaces, setWorkspaces] = useStateA(() => {
    try {
      const saved = localStorage.getItem('cd-workspaces');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return window.CD_DATA.workspaces;
  });

  const [drafts, setDrafts] = useStateA(() => {
    try {
      const saved = localStorage.getItem('cd-drafts-v3');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return window.CD_DATA.drafts;
  });

  const [tags, setTags] = useStateA(() => {
    try {
      const saved = localStorage.getItem('cd-tags-v2');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return window.CD_DATA?.tags || [];
  });

  const [tagFilter, setTagFilter] = useStateA(null);

  // Synchronisation au démarrage avec la base SQLite locale
  useEffectA(() => {
    let active = true;
    async function initSqliteData() {
      if (!window.CD_DB) return;
      try {
        await window.CD_DB.init();
        const [sqlWs, sqlDrafts, sqlTags] = await Promise.all([
          window.CD_DB.getWorkspaces(),
          window.CD_DB.getDrafts(),
          window.CD_DB.getTags()
        ]);
        if (!active) return;
        if (Array.isArray(sqlWs) && sqlWs.length > 0) {
          setWorkspaces(sqlWs);
          try { localStorage.setItem('cd-workspaces', JSON.stringify(sqlWs)); } catch(e) {}
        }
        if (Array.isArray(sqlDrafts) && sqlDrafts.length > 0) {
          setDrafts(sqlDrafts);
          try { localStorage.setItem('cd-drafts-v3', JSON.stringify(sqlDrafts)); } catch(e) {}
        }
        if (Array.isArray(sqlTags) && sqlTags.length > 0) {
          setTags(sqlTags);
          window.CD_TAGS = sqlTags;
          try { localStorage.setItem('cd-tags-v2', JSON.stringify(sqlTags)); } catch(e) {}
        }
        console.log('[ContentDock] Données (workspaces, drafts, tags) chargées depuis SQLite local.');
      } catch (err) {
        console.warn('[ContentDock] Erreur de synchronisation SQLite :', err);
      } finally {
        if (active) {
          setTimeout(() => {
            const splash = document.getElementById('app-startup-loader');
            if (splash) {
              splash.style.opacity = '0';
              splash.style.pointerEvents = 'none';
              setTimeout(() => {
                if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
              }, 450);
            }
          }, 350);
        }
      }
    }
    initSqliteData();
    return () => { active = false; };
  }, []);

  useEffectA(() => {
    try { localStorage.setItem('cd-workspaces', JSON.stringify(workspaces)); } catch(e) {}
  }, [workspaces]);

  useEffectA(() => {
    try { localStorage.setItem('cd-drafts-v3', JSON.stringify(drafts)); } catch(e) {}
  }, [drafts]);

  useEffectA(() => {
    window.CD_TAGS = tags;
    try { localStorage.setItem('cd-tags-v2', JSON.stringify(tags)); } catch(e) {}
  }, [tags]);

  useEffectA(() => {
    const handleTagCreated = (e) => {
      const newTag = e.detail;
      if (newTag) {
        setTags(prev => prev.some(t => t.id === newTag.id) ? prev : [...prev, newTag]);
      }
    };
    window.addEventListener('cd-tag-created', handleTagCreated);
    return () => window.removeEventListener('cd-tag-created', handleTagCreated);
  }, []);

  const [currentWs, setCurrentWs] = useStateA(() => localStorage.getItem('cd-ws') || 'all');
  useEffectA(() => { localStorage.setItem('cd-ws', currentWs); }, [currentWs]);

  const [view, setView] = useStateA(() => localStorage.getItem('cd-view') || 'storyboard');
  useEffectA(() => { localStorage.setItem('cd-view', view); }, [view]);

  const [statusFilter, setStatusFilter] = useStateA('all');
  const [channelFilter, setChannelFilter] = useStateA('all');
  const [openDraftId, setOpenDraftId] = useStateA(null);
  const [captureOpen, setCaptureOpen] = useStateA(false);
  const [captureSeed, setCaptureSeed] = useStateA(null);
  const [cmdkOpen, setCmdkOpen] = useStateA(false);
  const [notifOpen, setNotifOpen] = useStateA(false);
  const [mobileNavOpen, setMobileNavOpen] = useStateA(false);
  const [wsEditOpen, setWsEditOpen] = useStateA(null); // null | 'new' | workspace object
  const [inviteOpen, setInviteOpen] = useStateA(null); // null | wsId | 'all'
  const [toast, setToast] = useStateA(null);

  // -------- Onboarding --------
  const [onboarding, setOnboarding] = useStateA(() => !localStorage.getItem('cd-onboarded'));

  // -------- Notifications --------
  const notifs = window.useNotifications();

  const openDraft = draftId => setOpenDraftId(draftId);
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Surveillance en arrière-plan des planifications de contenu (exécutée en tâche de fond)
  useEffectA(() => {
    const notifiedMap = new Set();
    const checkSchedule = () => {
      const bgEnabled = localStorage.getItem('cd-bg-running') !== 'false';
      if (!bgEnabled) return;
      const now = new Date();
      const currentDay = now.getDate();
      const currentHour = now.getHours();

      drafts.forEach(d => {
        if (!d.scheduled || d.status === 'published') return;
        const sDay = Number(d.scheduled.day);
        const sHour = Number(d.scheduled.hour);
        const notifKey = `${d.id}-${sDay}-${sHour}`;
        if (notifiedMap.has(notifKey)) return;

        // Alerte si la publication est prévue aujourd'hui à cette heure ou dans l'heure qui vient
        if (sDay === currentDay && (sHour === currentHour || sHour === currentHour + 1)) {
          notifiedMap.add(notifKey);
          const timeText = sHour === currentHour ? 'maintenant' : `dans 1 h (à ${sHour}h)`;
          window.dispatchSystemNotification?.({
            title: `⏰ Rappel publication : ${d.title}`,
            desc: `Publication prévue ${timeText} sur ${d.channel?.toUpperCase() || 'Social'}`,
            kind: 'scheduled'
          });
          notifs.push({
            title: `Rappel de publication : ${d.title}`,
            desc: `Prévu ${timeText}`,
            icon: <IconClock size={13}/>,
            draftId: d.id,
            kind: 'scheduled'
          });
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [drafts]);

  // -------- Tags CRUD --------
  const handleNewTag = async (tag) => {
    setTags(prev => [...prev.filter(t => t.id !== tag.id), tag]);
    if (window.CD_DB) {
      await window.CD_DB.saveTag(tag).catch(e => console.error('[SQLite] Erreur saveTag :', e));
    }
    showToast(`Tag #${tag.label} créé dans SQLite local`);
  };

  const handleDeleteTag = async (tagId) => {
    const tObj = tags.find(t => t.id === tagId);
    setTags(prev => prev.filter(t => t.id !== tagId));
    if (tagFilter === tagId) setTagFilter(null);
    setDrafts(prev => prev.map(d => ({
      ...d,
      tags: (d.tags || []).filter(t => t !== tagId)
    })));
    if (window.CD_DB) {
      await window.CD_DB.deleteTag(tagId).catch(e => console.error('[SQLite] Erreur deleteTag :', e));
    }
    showToast(`Tag #${tObj?.label || ''} supprimé`);
  };

  const visibleDrafts = useMemoA(() => {
    let list = drafts;
    if (currentWs === 'inbox') list = list.filter(d => !d.scheduled && d.status !== 'published');
    else if (currentWs !== 'all') list = list.filter(d => d.ws === currentWs);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (channelFilter !== 'all') list = list.filter(d => d.channel === channelFilter);
    if (tagFilter) list = list.filter(d => (d.tags || []).includes(tagFilter));
    return list;
  }, [drafts, currentWs, statusFilter, channelFilter, tagFilter]);

  const openDraft_ = drafts.find(d => d.id === openDraftId);

  const updateDraft = updated => {
    setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (window.CD_DB) {
      window.CD_DB.saveDraft(updated).catch(e => console.error('[SQLite] Erreur updateDraft :', e));
    }
  };

  const moveDraft = (id, newStatus) => {
    let updatedItem = null;
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      updatedItem = { ...d, status: newStatus };
      // Emit notification on transitions
      if (newStatus === 'review' && d.status !== 'review') {
        notifs.push({ title: 'Brouillon à valider', desc: d.title, icon: <IconEye size={13}/>, draftId: id, kind: 'review' });
      }
      if (newStatus === 'published' && d.status !== 'published') {
        notifs.push({ title: 'Publication publiée ✅', desc: d.title, icon: <IconCheck size={13}/>, draftId: id, kind: 'published' });
      }
      return updatedItem;
    }));
    if (updatedItem && window.CD_DB) {
      window.CD_DB.saveDraft(updatedItem).catch(e => console.error('[SQLite] Erreur moveDraft :', e));
    }
  };

  const scheduleDraft = (id, day, hour) => {
    let updatedItem = null;
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      updatedItem = { ...d, scheduled: { day, hour } };
      return updatedItem;
    }));
    const d = drafts.find(x => x.id === id);
    if (d) notifs.push({ title: 'Publication programmée', desc: `${d.title} · jour ${day} à ${hour}h`, icon: <IconClock size={13}/>, draftId: id, kind: 'scheduled' });
    if (updatedItem && window.CD_DB) {
      window.CD_DB.saveDraft(updatedItem).catch(e => console.error('[SQLite] Erreur scheduleDraft :', e));
    }
  };

  const unscheduleDraft = id => {
    let updatedItem = null;
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      updatedItem = { ...d, scheduled: null };
      return updatedItem;
    }));
    if (updatedItem && window.CD_DB) {
      window.CD_DB.saveDraft(updatedItem).catch(e => console.error('[SQLite] Erreur unscheduleDraft :', e));
    }
  };

  const createDraft = draft => {
    setDrafts(prev => [draft, ...prev]);
    if (window.CD_DB) {
      window.CD_DB.saveDraft(draft).catch(e => console.error('[SQLite] Erreur createDraft :', e));
    }
    notifs.push({ title: 'Brouillon capturé', desc: draft.title, icon: <IconPaste size={13}/>, draftId: draft.id, kind: 'capture' });
    showToast('Brouillon créé — sauvegardé dans SQLite local');
    setTimeout(() => setOpenDraftId(draft.id), 300);
  };

  // -------- Workspace CRUD --------
  const saveWorkspace = ws => {
    setWorkspaces(prev => {
      const exists = prev.find(w => w.id === ws.id);
      if (exists) return prev.map(w => w.id === ws.id ? ws : w);
      return [...prev, ws];
    });
    if (window.CD_DB) {
      window.CD_DB.saveWorkspace(ws).catch(e => console.error('[SQLite] Erreur saveWorkspace :', e));
    }
    setWsEditOpen(null);
    showToast(wsEditOpen === 'new' ? `Espace « ${ws.name} » créé dans SQLite` : `« ${ws.name} » mis à jour`);
  };

  const deleteWorkspace = id => {
    const ws = workspaces.find(w => w.id === id);
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    setDrafts(prev => prev.filter(d => (d.ws || d.ws_id) !== id)); // cascade drafts
    if (window.CD_DB) {
      window.CD_DB.deleteWorkspace(id).catch(e => console.error('[SQLite] Erreur deleteWorkspace :', e));
    }
    if (currentWs === id) setCurrentWs('all');
    setWsEditOpen(null);
    showToast(`Espace « ${ws?.name} » supprimé de SQLite`);
  };

  // -------- GLOBAL PASTE --------
  useEffectA(() => {
    const handler = async e => {
      if (captureOpen || cmdkOpen || onboarding) return;
      const tag = e.target?.tagName;
      const editable = e.target?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      let gotText = e.clipboardData.getData('text/plain');
      const mediaFiles = [];
      const otherFiles = [];
      for (const it of items) {
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) {
            if (f.type.startsWith('image/') || f.type.startsWith('video/')) mediaFiles.push(f);
            else otherFiles.push(f);
          }
        }
      }
      if (!gotText && !mediaFiles.length && !otherFiles.length) return;
      e.preventDefault();

      // If drawer is open, add directly to that draft
      if (openDraftId) {
        const draft = drafts.find(d => d.id === openDraftId);
        if (draft) {
          const upd = { ...draft };
          if (gotText) upd.body = draft.body ? draft.body + '\n' + gotText : gotText;
          if (mediaFiles.length) {
            const dataUrls = await Promise.all(mediaFiles.map(f => window.fileToDataUrl(f)));
            upd.images = [...(draft.images || []), ...dataUrls];
          }
          if (otherFiles.length) {
            const atts = await Promise.all(otherFiles.map(f => window.fileToAttachment(f)));
            upd.attachments = [...(draft.attachments || []), ...atts];
          }
          updateDraft(upd);
          const parts = [];
          if (gotText) parts.push('texte');
          if (mediaFiles.length) parts.push(`${mediaFiles.length} média${mediaFiles.length>1?'s':''}`);
          if (otherFiles.length) parts.push(`${otherFiles.length} doc`);
          showToast(`Ajouté au brouillon : ${parts.join(' + ')}`);
        }
        return;
      }
      setCaptureSeed({ text: gotText, files: [...mediaFiles, ...otherFiles] });
      setCaptureOpen(true);
      const parts = [];
      if (gotText) parts.push('texte');
      if (mediaFiles.length) parts.push(`${mediaFiles.length} média${mediaFiles.length>1?'s':''}`);
      if (otherFiles.length) parts.push(`${otherFiles.length} doc`);
      showToast(`Capture ouverte : ${parts.join(' + ')}`);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [captureOpen, cmdkOpen, onboarding, openDraftId, drafts]);

  // -------- SHORTCUTS --------
  useEffectA(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(x => !x);
        return;
      }
      if (captureOpen || openDraftId || cmdkOpen || onboarding || view === 'settings') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setCaptureSeed(null); setCaptureOpen(true); }
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) setView('storyboard');
      if (e.key === 'k' && !e.metaKey && !e.ctrlKey) setView('kanban');
      if (e.key === 'l' && !e.metaKey && !e.ctrlKey) setView('list');
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) setView('calendar');
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) setView('analytics');
      if (e.key === 'q' && !e.metaKey && !e.ctrlKey) setView('queue');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureOpen, openDraftId, cmdkOpen, onboarding, view]);

  // Domain of current workspace
  const wsObj = workspaces.find(w => w.id === currentWs);
  const domain = wsObj?.kind || 'mixed';

  const wsInfo = view === 'settings'
    ? { name: 'Paramètres', sub: 'Personnalisez votre expérience ContentDock' }
    : currentWs === 'all'
      ? { name: 'Tous les brouillons', sub: `${visibleDrafts.length} brouillons sur ${drafts.length}` }
      : currentWs === 'inbox'
        ? { name: 'Non planifiés', sub: `${visibleDrafts.length} en attente` }
        : { name: wsObj?.name || '—', sub: `${visibleDrafts.length} brouillon${visibleDrafts.length>1?'s':''}` };

  const domainLabels = { cm: 'Community management', graph: 'Direction artistique', dev: 'Snippets & veille', mixed: null };
  const domainIcons  = { cm: <IconSend/>, graph: <IconImage/>, dev: <IconHash/>, mixed: null };

  const baseViews = [
    { id: 'storyboard', label: 'Storyboard', icon: <IconGrid/> },
    { id: 'kanban',     label: 'Kanban',     icon: <IconColumns/> },
    { id: 'list',       label: 'Liste',      icon: <IconList/> },
    { id: 'calendar',   label: 'Calendrier', icon: <IconCalendar/> },
  ];
  const cmExtra = [
    { id: 'queue',     label: 'File d\'attente', icon: <IconClock/> },
    { id: 'analytics', label: 'Analytics',       icon: <IconZap/> },
  ];
  const productivityExtra = [
    { id: 'templates', label: 'Templates', icon: <IconLayers/> },
    { id: 'import',    label: 'Importer',  icon: <IconUpload/> },
    { id: 'assistant', label: 'Assistant', icon: <IconSparkles/> },
    { id: 'team',      label: 'Équipe',    icon: <IconInbox/> },
  ];
  const viewsForDomain = domain === 'cm'
    ? [...baseViews, ...cmExtra, ...productivityExtra]
    : domain === 'dev'
      ? [...baseViews, ...productivityExtra]
      : currentWs === 'all'
        ? [...baseViews, ...cmExtra, ...productivityExtra]
        : [...baseViews, ...productivityExtra];

  useEffectA(() => {
    if (view === 'settings') return;
    if (!viewsForDomain.find(v => v.id === view)) setView('storyboard');
  }, [currentWs]);

  // -------- Export all --------
  const exportAll = async (format) => {
    if (format === 'sqlite') {
      if (window.CD_DB) {
        await window.CD_DB.exportSqliteFile();
        showToast('Base SQLite téléchargée (contentdock.sqlite3)');
      }
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify({ workspaces, drafts }, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `contentdock-export-${Date.now()}.json`;
      link.click();
      showToast('Export JSON téléchargé');
    } else if (format === 'zip') {
      showToast('Préparation de l\'export complet…');
      const JSZip = await window.loadJSZip();
      const zip = new JSZip();
      zip.file('workspaces.json', JSON.stringify(workspaces, null, 2));
      zip.file('drafts.json', JSON.stringify(drafts, null, 2));
      // Add each draft as folder
      for (const d of drafts) {
        const safe = (d.title || d.id).replace(/[^\w-]+/g, '_').slice(0, 40);
        const folder = zip.folder(`drafts/${safe}`);
        folder.file('draft.json', JSON.stringify(d, null, 2));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `contentdock-full-export.zip`;
      link.click();
      showToast('Export ZIP téléchargé');
    }
  };

  const wipeAll = async () => {
    ['cd-drafts-v3','cd-workspaces','cd-ws','cd-view','cd-notifs','cd-onboarded','cd-profile','cd-accent','contentdock_sqlite_db'].forEach(k => localStorage.removeItem(k));
    try {
      if (window.indexedDB) window.indexedDB.deleteDatabase('ContentDockLocalDB');
    } catch(e) {}
    window.location.reload();
  };

  return (
    <div className="app">
      <Topbar theme={theme}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onOpenCapture={() => { setCaptureSeed(null); setCaptureOpen(true); }}
              onOpenCmdk={() => setCmdkOpen(true)}
              onOpenNotifs={() => setNotifOpen(x => !x)}
              onOpenSettings={() => setView('settings')}
              onOpenMobileNav={() => setMobileNavOpen(true)}
              unreadCount={notifs.unreadCount}
              currentUser={currentUser}
              onOpenAuth={openAuth}
              onOpenGate={openGate}/>

      <Sidebar workspaces={workspaces}
               tags={tags}
               drafts={drafts}
               currentWs={currentWs}
               activeTagFilter={tagFilter}
               onSelectTagFilter={setTagFilter}
               onNewTag={handleNewTag}
               onDeleteTag={handleDeleteTag}
               onSelectWs={(id) => { setCurrentWs(id); if (view === 'settings') setView('storyboard'); }}
               onSelectView={setView}
               onEditWs={ws => setWsEditOpen(ws)}
               onNewWs={() => setWsEditOpen('new')}
               onOpenInvite={(wsId) => {
                 if (!currentUser) openGate('team');
                 else setInviteOpen(wsId || 'all');
               }}
               mobileOpen={mobileNavOpen}
               onCloseMobile={() => setMobileNavOpen(false)}
               currentUser={currentUser}
               onOpenAuth={openAuth}
               onOpenGate={openGate}
               onLogout={handleLogout}/>

      <main className="main">
        <div className="main-header">
          <div>
            <div className="main-title">
              {view !== 'settings' && currentWs !== 'all' && currentWs !== 'inbox' && (
                <>
                  <span className="ws-dot" style={{width:10, height:10, borderRadius:3, background: wsObj?.color}}/>
                  <span className="breadcrumb-ws">Espace</span>
                  <span className="breadcrumb-sep">/</span>
                </>
              )}
              {wsInfo.name}
              {view !== 'settings' && domainLabels[domain] && currentWs !== 'all' && currentWs !== 'inbox' && (
                <span className="domain-hint">{domainIcons[domain]}{domainLabels[domain]}</span>
              )}
            </div>
            <div className="main-subtitle">{wsInfo.sub}</div>
          </div>
          {view !== 'settings' && (
            <div className="view-tabs">
              {viewsForDomain.map(v => (
                <button key={v.id} className={`view-tab ${view === v.id ? 'active' : ''}`} onClick={() => setView(v.id)}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="main-body">
          {(view === 'storyboard' || view === 'kanban' || view === 'list') && (
            <div className="filter-bar">
              <button className={`chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                Tous statuts
              </button>
              {window.CD_DATA.statuses.map(s => (
                <button key={s.id} className={`chip ${statusFilter === s.id ? 'active' : ''}`}
                        onClick={() => setStatusFilter(s.id === statusFilter ? 'all' : s.id)}>
                  <span className={`status ${s.id}`} style={{gap:0}}><span className="dot"/></span>
                  {s.label}
                </button>
              ))}
              <span className="filter-sep">·</span>
              <button className={`chip ${channelFilter === 'all' ? 'active' : ''}`} onClick={() => setChannelFilter('all')}>
                Tous canaux
              </button>
              {Object.values(window.CD_DATA.channels).map(c => (
                <button key={c.id} className={`chip ${channelFilter === c.id ? 'active' : ''}`}
                        onClick={() => setChannelFilter(c.id === channelFilter ? 'all' : c.id)}>
                  <ChannelBadge ch={c.id} size={12}/>{c.label}
                </button>
              ))}
              {tagFilter && (
                <>
                  <span className="filter-sep">·</span>
                  <button
                    className="chip active"
                    style={{background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5}}
                    onClick={() => setTagFilter(null)}
                    title="Cliquer pour retirer le filtre tag">
                    <span>#{tags.find(t => t.id === tagFilter)?.label || 'Tag'}</span>
                    <IconX size={10}/>
                  </button>
                </>
              )}
              <span className="filter-count">{visibleDrafts.length} résultats</span>
              <button className="chip" style={{marginLeft:'auto'}} title="Trier"><IconFilter/>Trier</button>
            </div>
          )}

          {view === 'storyboard' && <StoryboardView drafts={visibleDrafts} onOpen={openDraft}/>}
          {view === 'kanban' && <KanbanView drafts={visibleDrafts} statuses={window.CD_DATA.statuses} onOpen={openDraft} onMove={moveDraft}/>}
          {view === 'list' && <ListView drafts={visibleDrafts} onOpen={openDraft}/>}
          {view === 'calendar' && <CalendarView drafts={currentWs === 'all' || currentWs === 'inbox' ? drafts : drafts.filter(d => d.ws === currentWs)}
                                                 onOpen={openDraft}
                                                 onSchedule={scheduleDraft}
                                                 onUnschedule={unscheduleDraft}/>}
          {view === 'analytics' && <AnalyticsView drafts={currentWs === 'all' ? drafts : (currentWs === 'inbox' ? drafts.filter(d => !d.scheduled) : drafts.filter(d => d.ws === currentWs))}/>}
          {view === 'queue' && <QueueView drafts={currentWs === 'all' || currentWs === 'inbox' ? drafts : drafts.filter(d => d.ws === currentWs)} onOpen={openDraft}/>}
          {view === 'templates' && <window.TemplatesView workspaces={workspaces}
                                                          onUse={(tpl) => {
                                                            const wsForTpl = (currentWs === 'all' || currentWs === 'inbox') ? workspaces[0].id : currentWs;
                                                            const newDrafts = window.instantiateTemplate(tpl, wsForTpl);
                                                            setDrafts(prev => [...newDrafts, ...prev]);
                                                            showToast(newDrafts.length === 1
                                                              ? `Brouillon créé depuis "${tpl.name}"`
                                                              : `${newDrafts.length} occurrences créées pour "${tpl.name}"`);
                                                            if (newDrafts.length === 1) setTimeout(() => setOpenDraftId(newDrafts[0].id), 250);
                                                            else setView('calendar');
                                                          }}
                                                          onToast={showToast}/>}
          {view === 'import' && <window.ImportView workspaces={workspaces}
                                                    onCreate={createDraft}
                                                    onToast={showToast}/>}
          {view === 'assistant' && <window.ScriptAssistantView workspaces={workspaces}
                                                                onCreate={createDraft}
                                                                onToast={showToast}/>}
          {view === 'team' && (
            !currentUser ? (
              <div className="empty-state" style={{padding: '60px 20px', textAlign: 'center'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>👥</div>
                <div style={{fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8}}>Collaboration d'Équipe Réservée</div>
                <div style={{fontSize: 13.5, color: 'var(--text-3)', maxWidth: 460, margin: '0 auto 24px auto', lineHeight: 1.5}}>
                  La gestion des collaborateurs, des permissions et de la présence en direct nécessite un compte utilisateur. Créez votre compte gratuit ou connectez-vous.
                </div>
                <div style={{display:'flex', justifyContent:'center', gap: 12}}>
                  <button className="btn-primary" onClick={() => openAuth('register', 'Inscrivez-vous pour débloquer l’espace équipe')}>
                    Créer un compte
                  </button>
                  <button
                    onClick={() => openAuth('login', 'Connectez-vous pour débloquer l’espace équipe')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--border-line, rgba(255,255,255,0.15))',
                      background: 'transparent',
                      color: 'var(--text, #fff)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13
                    }}>
                    Se connecter
                  </button>
                </div>
              </div>
            ) : (
              <window.TeamView workspaces={workspaces}
                               currentWs={currentWs}
                               onOpenInvite={(wsId) => setInviteOpen(wsId || 'all')}
                               onToast={showToast}/>
            )
          )}
          {view === 'settings' && <SettingsView theme={theme} setTheme={setTheme}
                                                 currentUser={currentUser}
                                                 onOpenAuth={openAuth}
                                                 onLogout={handleLogout}
                                                 onRestartTour={() => { localStorage.removeItem('cd-onboarded'); setOnboarding(true); setView('storyboard'); }}
                                                 onExportAll={exportAll}
                                                 onWipe={wipeAll}
                                                 onToast={showToast}/>}
        </div>
      </main>

      {openDraft_ && (
        <DraftDrawer draft={openDraft_}
                     onClose={() => setOpenDraftId(null)}
                     onUpdate={updateDraft}
                     onToast={showToast}/>
      )}

      {captureOpen && (
        <CaptureModal workspaces={workspaces}
                      currentWs={currentWs}
                      seed={captureSeed}
                      onClose={() => { setCaptureOpen(false); setCaptureSeed(null); }}
                      onCreate={createDraft}
                      onToast={showToast}/>
      )}

      {cmdkOpen && (
        <CmdK drafts={drafts}
              workspaces={workspaces}
              onClose={() => setCmdkOpen(false)}
              onSelectDraft={openDraft}
              onSelectWs={setCurrentWs}
              onSelectView={setView}
              onOpenCapture={() => { setCaptureSeed(null); setCaptureOpen(true); }}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}/>
      )}

      {notifOpen && (
        <NotifPanel notifs={notifs.notifs}
                    onClose={() => { setNotifOpen(false); notifs.markAllRead(); }}
                    onOpenDraft={id => { setNotifOpen(false); openDraft(id); }}
                    onMarkAllRead={notifs.markAllRead}
                    onClear={notifs.clear}/>
      )}

      {wsEditOpen && (
        <WorkspaceEditModal ws={wsEditOpen === 'new' ? null : wsEditOpen}
                            onSave={saveWorkspace}
                            onDelete={deleteWorkspace}
                            onClose={() => setWsEditOpen(null)}/>
      )}

      {inviteOpen && (
        <window.InviteModal workspaces={workspaces}
                             defaultWs={inviteOpen === 'all' ? null : inviteOpen}
                             onClose={() => setInviteOpen(null)}
                             onInvited={(invites) => {
                               invites.forEach(inv => {
                                 notifs.push({
                                   title: 'Invitation envoyée',
                                   desc: `${inv.email} · ${window.ROLES[inv.role]?.label}`,
                                   icon: <IconLink size={13}/>,
                                   kind: 'capture',
                                 });
                               });
                             }}
                             onToast={showToast}/>
      )}

      {currentUser && (
        <window.InviteInbox
          currentUser={currentUser}
          onAccept={(inv) => {
            notifs.push({
              title: 'Invitation acceptée',
              desc: `Vous avez rejoint ${inv.workspaceName}`,
              icon: <IconCheck size={13}/>,
              kind: 'capture',
            });
            showToast(`Bienvenue dans ${inv.workspaceName}`);
          }}
          onDecline={(inv) => showToast('Invitation refusée')}/>
      )}

      {toast && (
        <div className="toast">
          <IconCheck/>{toast}
        </div>
      )}

      {!captureOpen && !cmdkOpen && !openDraftId && !onboarding && view !== 'settings' && (
        <div className="paste-anywhere-hint" title="Collez n'importe où pour créer un brouillon">
          <IconPaste size={12}/>
          Collez <kbd>⌘V</kbd> n'importe où · <kbd>⌘K</kbd> pour commander
        </div>
      )}

      <window.LiveCursorsLayer enabled={!!currentUser && !onboarding && !captureOpen && !cmdkOpen}/>

      {window.AuthModal && (
        <window.AuthModal
          isOpen={authModal.open}
          initialView={authModal.view}
          reason={authModal.reason}
          onClose={() => setAuthModal({ open: false, view: 'login', reason: null })}
          onSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Bienvenue, ${user.name} !`);
          }}
        />
      )}

      {window.FeatureGateModal && (
        <window.FeatureGateModal
          isOpen={gateModal.open}
          feature={gateModal.feature}
          onClose={() => setGateModal({ open: false, feature: 'team' })}
          onOpenAuth={(v, r) => {
            setGateModal({ open: false, feature: 'team' });
            openAuth(v, r);
          }}
        />
      )}

      {window.AuthEmailToast && <window.AuthEmailToast />}

      <BottomNav view={view}
                 onView={setView}
                 onCapture={() => { setCaptureSeed(null); setCaptureOpen(true); }}
                 onOpenSidebar={() => setMobileNavOpen(true)}
                 onOpenCmdk={() => setCmdkOpen(true)}/>

      {onboarding && <Onboarding onFinish={() => setOnboarding(false)}/>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

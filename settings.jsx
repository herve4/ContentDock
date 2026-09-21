// Settings screen with tabs: Profil, Apparence, Notifications, Raccourcis, Données
const { useState: useStateS, useEffect: useEffectS } = React;

function SettingsView({ theme, setTheme, onRestartTour, onExportAll, onWipe, onToast, currentUser, onOpenAuth, onLogout }) {
  const [tab, setTab] = useStateS(() => localStorage.getItem('cd-settings-tab') || 'profile');
  useEffectS(() => localStorage.setItem('cd-settings-tab', tab), [tab]);

  const tabs = [
    { id: 'profile', label: 'Compte & Profil', icon: <IconSettings/> },
    { id: 'appearance', label: 'Apparence', icon: <IconImage/> },
    { id: 'notifications', label: 'Notifications', icon: <IconBell/> },
    { id: 'integrations', label: 'Intégrations (Bientôt)', icon: <IconLink/> },
    { id: 'pwa', label: 'Installation', icon: <IconDownload/> },
    { id: 'shortcuts', label: 'Raccourcis', icon: <IconCommand/> },
    { id: 'data', label: 'Données', icon: <IconArchive/> },
  ];

  return (
    <div className="settings">
      <div className="settings-nav">
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {tab === 'profile' && <ProfileTab onToast={onToast} currentUser={currentUser} onOpenAuth={onOpenAuth} onLogout={onLogout}/>}
        {tab === 'appearance' && <AppearanceTab theme={theme} setTheme={setTheme} onToast={onToast}/>}
        {tab === 'notifications' && <NotificationsTab onToast={onToast}/>}
        {tab === 'integrations' && <window.IntegrationsView onToast={onToast}/>}
        {tab === 'pwa' && <window.PWATab onToast={onToast}/>}
        {tab === 'shortcuts' && <ShortcutsTab onRestartTour={onRestartTour}/>}
        {tab === 'data' && <DataTab onExportAll={onExportAll} onWipe={onWipe}/>}
      </div>
    </div>
  );
}

// ---- Profile ----
function ProfileTab({ onToast, currentUser, onOpenAuth, onLogout }) {
  const [profile, setProfile] = useStateS(() => {
    try { return JSON.parse(localStorage.getItem('cd-profile') || '{}'); } catch(e) { return {}; }
  });
  const set = (k, v) => {
    const next = { ...profile, [k]: v };
    setProfile(next);
    localStorage.setItem('cd-profile', JSON.stringify(next));
  };

  const displayName = currentUser ? currentUser.name : (profile.name || 'Invité');
  const displayEmail = currentUser ? currentUser.email : (profile.email || '');
  const initials = (displayName || 'CD').split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="settings-section">
        <h2>Compte & Sécurité</h2>
        {currentUser ? (
          <div style={{
            background: 'var(--bg-3, #121316)',
            border: '1px solid var(--border-line, rgba(255,255,255,0.1))',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{display:'flex', alignItems:'center', gap: 14}}>
              <div className="settings-avatar" style={{background:'linear-gradient(135deg, #ff5a1f, #ff834f)', color:'#fff', fontWeight:700}}>
                {currentUser.avatar || initials}
              </div>
              <div>
                <div style={{fontWeight: 700, fontSize: 14, color:'var(--text, #fff)'}}>{currentUser.name}</div>
                <div style={{fontSize: 12, color:'var(--text-3, #aaa)'}}>{currentUser.email}</div>
                <div style={{marginTop: 4}}>
                  <span style={{fontSize: 10.5, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 4, fontWeight: 600}}>
                    ✓ Compte SQLite vérifié
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn ghost"
              style={{color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', cursor:'pointer'}}>
              Se déconnecter
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,90,31,0.06)',
            border: '1px dashed rgba(255,90,31,0.3)',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <div style={{fontWeight: 700, fontSize: 13.5, color: 'var(--text, #fff)'}}>Mode Invité Local</div>
              <div style={{fontSize: 12, color: 'var(--text-3, #aaa)', marginTop: 2}}>
                Connectez-vous pour activer la collaboration en équipe et synchroniser votre profil.
              </div>
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="btn-primary"
              style={{padding: '7px 14px', fontSize: 12.5, fontWeight: 600}}>
              Se connecter / S'inscrire
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Profil Public</h2>
        <div className="desc">Vos informations personnelles utilisées dans l'interface et pour signer les publications.</div>

        <div className="settings-row">
          <div className="label">Photo</div>
          <div className="value" style={{display:'flex', gap:12, alignItems:'center'}}>
            <div className="settings-avatar">{initials}</div>
            <button className="btn ghost">Changer</button>
            <button className="btn ghost">Retirer</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="label">Nom complet</div>
          <div className="value"><input className="settings-input" value={profile.name || ''} onChange={e => set('name', e.target.value)} placeholder="Noémie Moreau"/></div>
        </div>
        <div className="settings-row">
          <div className="label">Handle
            <span className="sub">Utilisé dans les mockups sociaux</span>
          </div>
          <div className="value"><input className="settings-input" value={profile.handle || ''} onChange={e => set('handle', e.target.value)} placeholder="noemie.m"/></div>
        </div>
        <div className="settings-row">
          <div className="label">Email</div>
          <div className="value"><input type="email" className="settings-input" value={profile.email || ''} onChange={e => set('email', e.target.value)} placeholder="noemie@studio.fr"/></div>
        </div>
        <div className="settings-row">
          <div className="label">Bio courte</div>
          <div className="value">
            <textarea className="textarea-settings" value={profile.bio || ''} onChange={e => set('bio', e.target.value)}
                      placeholder="Directrice artistique · Studio indépendant"/>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Signature</h2>
        <div className="desc">Ajoutée automatiquement à la fin des publications (optionnel).</div>
        <div className="settings-row">
          <div className="label">Signature</div>
          <div className="value">
            <textarea className="textarea-settings" value={profile.signature || ''} onChange={e => set('signature', e.target.value)}
                      placeholder="—&#10;Noémie · @noemie.m"/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Appearance ----
function AppearanceTab({ theme, setTheme, onToast }) {
  const [density, setDensity] = useStateS(() => localStorage.getItem('cd-density') || 'compact');
  const [accent, setAccent] = useStateS(() => localStorage.getItem('cd-accent') || '#ff5a1f');
  const accents = ['#ff5a1f', '#e11d48', '#7c3aed', '#0ea5e9', '#059669', '#eab308'];

  useEffectS(() => {
    localStorage.setItem('cd-accent', accent);
    document.documentElement.style.setProperty('--accent', accent);
    // Approx accent-soft
    const rgb = accent.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
    document.documentElement.style.setProperty('--accent-soft', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.14)`);
    document.documentElement.style.setProperty('--accent-line', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
  }, [accent]);

  return (
    <div>
      <div className="settings-section">
        <h2>Thème</h2>
        <div className="desc">Le mode sombre est optimisé pour un usage prolongé en atelier ou bureau.</div>
        <div className="settings-row">
          <div className="label">Mode</div>
          <div className="value" style={{display:'flex', gap:6}}>
            <button className={`chip ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}><IconMoon/>Sombre</button>
            <button className={`chip ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}><IconSun/>Clair</button>
            <button className="chip" title="Suit les préférences système">
              <IconLayers/>Système
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div className="label">Couleur d'accent</div>
          <div className="value">
            <div className="color-picker-row">
              {accents.map(c => (
                <button key={c} className={accent === c ? 'selected' : ''} style={{background: c, width: 30, height: 30}}
                        onClick={() => setAccent(c)}/>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Densité</h2>
        <div className="desc">Ajuste l'espacement de l'interface.</div>
        <div className="settings-row">
          <div className="label">Compacité</div>
          <div className="value" style={{display:'flex', gap:6}}>
            <button className={`chip ${density === 'compact' ? 'active' : ''}`} onClick={() => { setDensity('compact'); localStorage.setItem('cd-density', 'compact'); }}>Compact</button>
            <button className={`chip ${density === 'comfortable' ? 'active' : ''}`} onClick={() => { setDensity('comfortable'); localStorage.setItem('cd-density', 'comfortable'); onToast?.('Densité "confortable" — bientôt disponible'); }}>Confortable</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Preview des mockups</h2>
        <div className="desc">Choisissez le format d'aperçu par défaut dans la fiche brouillon.</div>
        <div className="settings-row">
          <div className="label">Format par défaut</div>
          <div className="value">
            <select className="settings-input">
              <option>Selon le canal cible</option>
              <option>Toujours Instagram</option>
              <option>Toujours LinkedIn</option>
              <option>Grille comparative</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Notifications ----
function NotificationsTab({ onToast }) {
  const [prefs, setPrefsL] = useStateS(() => window.getNotifPrefs());
  const [perm, setPerm] = useStateS(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [bgRunning, setBgRunning] = useStateS(() => localStorage.getItem('cd-bg-running') !== 'false');

  const setPref = (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefsL(next);
    window.setNotifPrefs(next);
  };

  const requestPerm = async () => {
    const r = await window.requestDesktopNotifPermission();
    setPerm(r);
    if (r === 'granted') {
      setPref('desktopEnabled', true);
      setPref('mobileEnabled', true);
      onToast?.('Notifications activées');
      window.dispatchSystemNotification({
        title: 'ContentDock',
        desc: 'Les notifications bureau et téléphone sont maintenant actives ✅'
      });
    } else if (r === 'denied') {
      onToast?.('Permission refusée par le système');
    }
  };

  const handleSendTestNotif = async () => {
    if (perm !== 'granted') {
      const r = await window.requestDesktopNotifPermission();
      setPerm(r);
    }
    const success = await window.dispatchSystemNotification({
      title: 'ContentDock — Test Notification',
      desc: 'Ceci est une notification native bureau et téléphone réussie ! 🎉'
    });
    onToast?.(success ? 'Notification test expédiée avec succès !' : 'Notification test déclenchée');
  };

  const toggleBgRunning = (val) => {
    setBgRunning(val);
    localStorage.setItem('cd-bg-running', val ? 'true' : 'false');
    onToast?.(val ? 'Arrière-plan actif : surveillance des planifications en continu' : 'Surveillance en arrière-plan désactivée');
  };

  const Toggle = ({ k, disabled }) => (
    <div className={`tswitch ${prefs[k] && !disabled ? 'on' : ''}`}
         style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
         onClick={() => !disabled && setPref(k, !prefs[k])}/>
  );

  return (
    <div>
      <div className="settings-section">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap: 12}}>
          <div>
            <h2>Notifications Bureau & Téléphone</h2>
            <div className="desc">Recevez une alerte native directe sur Windows ou Android à chaque étape clé.</div>
          </div>
          <button className="btn primary" onClick={handleSendTestNotif} style={{display:'flex', alignItems:'center', gap: 6}}>
            <IconBell size={13}/>Envoyer une notification test
          </button>
        </div>

        <div className="settings-row">
          <div className="label">État de la permission système</div>
          <div className="value" style={{display:'flex', gap:8, alignItems:'center'}}>
            <span className={`status ${perm === 'granted' ? 'ready' : perm === 'denied' ? 'idea' : 'review'}`}>
              <span className="dot"/>
              {perm === 'granted' ? 'Autorisées' : perm === 'denied' ? 'Bloquées par le système' : perm === 'unsupported' ? 'Non supportées' : 'Non demandées'}
            </span>
            {perm !== 'granted' && perm !== 'denied' && perm !== 'unsupported' && (
              <button className="btn primary" onClick={requestPerm}>Demander l'autorisation</button>
            )}
          </div>
        </div>

        <div className="settings-row">
          <div className="label">Notifications bureau (Windows PC)
            <span className="sub">Notification native du centre de notifications</span>
          </div>
          <div className="value"><Toggle k="desktopEnabled" disabled={perm !== 'granted'}/></div>
        </div>

        <div className="settings-row">
          <div className="label">Notifications téléphone (Android & PWA)
            <span className="sub">Alertes locales sur smartphone</span>
          </div>
          <div className="value"><Toggle k="mobileEnabled" disabled={perm !== 'granted'}/></div>
        </div>

        <div className="settings-row">
          <div className="label">Mode silencieux
            <span className="sub">Sans sonnerie ni vibration</span>
          </div>
          <div className="value"><Toggle k="silent"/></div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Exécution en arrière-plan & Rappels</h2>
        <div className="desc">
          Permet à ContentDock de surveiller en tâche de fond vos contenus planifiés et de vous avertir même lorsque l'application est réduite.
        </div>
        <div className="settings-row">
          <div className="label">Fonctionnement continu en arrière-plan
            <span className="sub">Vérifie chaque minute les publications approchantes</span>
          </div>
          <div className="value">
            <div className={`tswitch ${bgRunning ? 'on' : ''}`} onClick={() => toggleBgRunning(!bgRunning)}/>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Événements déclencheurs</h2>
        <div className="desc">Choisissez les alertes que vous souhaitez recevoir.</div>
        {[
          { id: 'mute_scheduled', label: 'Rappels de planification', sub: 'Avertissement avant l\'heure programmée de publication' },
          { id: 'mute_published', label: 'Publication confirmée', sub: 'Confirmation dès qu\'un post passe en statut publié' },
          { id: 'mute_review',    label: 'Demandes de validation', sub: 'Brouillon passé en "À valider"' },
          { id: 'mute_capture',   label: 'Capture & Média ajoutés', sub: 'Confirmation après un collage ou drop d\'image / vidéo' },
          { id: 'mute_ai',        label: 'Génération IA prête', sub: 'Variante social media générée' },
        ].map(t => (
          <div key={t.id} className="settings-row">
            <div className="label">{t.label}<span className="sub">{t.sub}</span></div>
            <div className="value">
              <div className={`tswitch ${!prefs[t.id] ? 'on' : ''}`} onClick={() => setPref(t.id, !prefs[t.id])}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Shortcuts ----
function ShortcutsTab({ onRestartTour }) {
  const rows = [
    ['Ouvrir la capture', ['V']],
    ['Coller n\'importe où', ['⌘V', 'ou', 'Ctrl+V']],
    ['Command palette', ['⌘K', 'ou', 'Ctrl+K']],
    ['Vue Storyboard', ['G']],
    ['Vue Kanban', ['K']],
    ['Vue Liste', ['L']],
    ['Vue Calendrier', ['C']],
    ['Vue Analytics', ['A']],
    ['File d\'attente', ['Q']],
    ['Fermer une modal', ['Esc']],
  ];
  return (
    <div>
      <div className="settings-section">
        <h2>Raccourcis clavier</h2>
        <div className="desc">Optimisés pour un usage rapide au clavier — inspirés de Raycast et Linear.</div>
        <table className="kbd-table">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r[0]}</td>
                <td>
                  {r[1].map((k, j) =>
                    /^(ou|et|\+)$/i.test(k)
                      ? <span key={j} style={{color:'var(--text-4)', margin:'0 4px'}}>{k}</span>
                      : <kbd key={j}>{k}</kbd>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="settings-section">
        <h2>Tour interactif</h2>
        <div className="desc">Redécouvrez les fonctionnalités principales étape par étape.</div>
        <button className="btn primary" onClick={onRestartTour}>
          <IconSparkles/>Relancer le tour
        </button>
      </div>
    </div>
  );
}

// ---- Data ----
function DataTab({ onExportAll, onWipe }) {
  const [confirmWipe, setConfirmWipe] = useStateS(false);
  const [dbStats, setDbStats] = useStateS(null);
  const [importing, setImporting] = useStateS(false);
  const [backupInfo, setBackupInfo] = useStateS(null);
  const [backingUp, setBackingUp] = useStateS(false);

  const refreshInfo = () => {
    if (window.CD_DB) {
      window.CD_DB.getDatabaseStats().then(s => setDbStats(s)).catch(() => {});
      window.CD_DB.getBackupInfo('user_snapshot').then(b => setBackupInfo(b)).catch(() => {});
    }
  };

  useEffectS(() => {
    refreshInfo();
  }, []);

  const handleCreateSnapshot = async () => {
    if (!window.CD_DB) return;
    setBackingUp(true);
    try {
      await window.CD_DB.backupDatabase('user_snapshot');
      refreshInfo();
      alert('Point de sauvegarde instantané créé avec succès dans votre stockage local sécurisé !');
    } catch (e) {
      alert('Erreur création sauvegarde : ' + e.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!window.CD_DB) return;
    if (!confirm('Voulez-vous restaurer le point de sauvegarde précédent ? L\'application va recharger vos données.')) return;
    try {
      await window.CD_DB.restoreDatabaseFromBackup('user_snapshot');
      alert('Base SQLite restaurée avec succès !');
      window.location.reload();
    } catch (e) {
      alert('Erreur restauration : ' + e.message);
    }
  };

  const handleImportSqlite = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      if (window.CD_DB) {
        await window.CD_DB.importSqliteFile(file);
        alert('Base SQLite importée avec succès ! La page va s’actualiser.');
        window.location.reload();
      }
    } catch (err) {
      alert('Erreur lors de l’importation SQLite : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="settings-section">
        <h2>Base de données SQLite (Locale & Autosuffisante)</h2>
        <div className="desc">
          ContentDock fonctionne en mode <b>Local-First</b>. Vos données sont persistées dans un véritable fichier SQLite 
          directement sur votre appareil (aucun serveur distant ni Django requis).
        </div>

        <div style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12
        }}>
          <div>
            <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em'}}>Moteur</div>
            <div style={{fontSize:13, fontWeight:600, color:'var(--accent)', marginTop:3}}>
              {dbStats?.driver || 'SQLite 3'}
            </div>
          </div>
          <div>
            <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em'}}>Espaces</div>
            <div style={{fontSize:14, fontWeight:600, marginTop:3}}>{dbStats?.tables?.workspaces ?? '—'}</div>
          </div>
          <div>
            <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em'}}>Brouillons</div>
            <div style={{fontSize:14, fontWeight:600, marginTop:3}}>{dbStats?.tables?.drafts ?? '—'}</div>
          </div>
          <div>
            <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em'}}>Taille BDD</div>
            <div style={{fontSize:14, fontWeight:600, marginTop:3}}>
              {dbStats?.sizeBytes ? `${Math.round(dbStats.sizeBytes / 1024)} Ko` : 'Active'}
            </div>
          </div>
        </div>

        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn primary" onClick={() => onExportAll('sqlite')}>
            <IconArchive/>Télécharger la base SQLite (.sqlite3)
          </button>
          <label className="btn ghost" style={{cursor:'pointer'}}>
            <IconUpload/>{importing ? 'Import en cours…' : 'Importer un fichier .sqlite3'}
            <input type="file" accept=".sqlite,.sqlite3,.db" onChange={handleImportSqlite} style={{display:'none'}}/>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Mises à jour applicatives & Sécurité des données</h2>
        <div className="desc">
          Comment vos données sont protégées lors de l'installation d'une nouvelle version de ContentDock (Windows .exe ou Android .apk).
        </div>

        <div style={{
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: '#4ade80', marginBottom: 6}}>
            <span>🛡️</span> Isolation totale des données utilisateurs
          </div>
          <div style={{fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6}}>
            • <b>Stockage étanche :</b> La base de données SQLite locale réside dans le profil applicatif local de votre système. La mise à jour du code ou de l'exécutable ne touche jamais à votre base.<br/>
            • <b>Migrations sans perte :</b> Chaque nouvelle version intègre des migrations automatiques (versionnage <code>PRAGMA user_version</code>) qui ajoutent les nouveaux champs sans modifier vos brouillons, médias ou tags.<br/>
            • <b>Point de sauvegarde pré-mise à jour :</b> Un instantané de secours est généré automatiquement avant toute opération sur le schéma.
          </div>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <button className="btn ghost" onClick={handleCreateSnapshot} disabled={backingUp}>
            <IconCheck size={12}/>{backingUp ? 'Sauvegarde en cours…' : 'Créer un point de sauvegarde instantané'}
          </button>
          {backupInfo?.exists && (
            <button className="btn ghost" style={{color: '#f59e0b'}} onClick={handleRestoreSnapshot}>
              Restaurer le point du {new Date(backupInfo.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Sauvegardes & Exports alternatifs</h2>
        <div className="desc">Exportez vos données aux formats portables JSON ou archive ZIP complète (incluant les médias).</div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn ghost" onClick={() => onExportAll('json')}><IconDownload/>Export JSON</button>
          <button className="btn ghost" onClick={() => onExportAll('zip')}><IconArchive/>Export ZIP complet</button>
        </div>
      </div>

      <div className="settings-section">
        <h2>Maintenance & Réinitialisation</h2>
        <div className="desc">Remettre la base locale à zéro et réinjecter les données d'exemple par défaut.</div>
        <div className="settings-row">
          <div className="label">Effacer toutes les données locales</div>
          <div className="value">
            <button className="btn ghost" style={{color: confirmWipe ? 'var(--danger)' : undefined}}
                    onClick={() => confirmWipe ? onWipe() : setConfirmWipe(true)}>
              <IconTrash/>{confirmWipe ? 'Confirmer la remise à zéro SQLite' : 'Réinitialiser la base'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsView });

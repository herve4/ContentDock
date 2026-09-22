// Team management: members, invites, roles, permissions, activity log
const { useState: useStateT2, useEffect: useEffectT2, useMemo: useMemoT2, useRef: useRefT2 } = React;

// ============================================================
// ROLES & PERMISSIONS
// ============================================================
const ROLES = {
  owner: {
    id: 'owner', label: 'Propriétaire',
    icon: <IconStar/>,
    desc: 'Contrôle total, facturation, suppression du workspace.',
    perms: ['*'],
  },
  admin: {
    id: 'admin', label: 'Admin',
    icon: <IconSettings/>,
    desc: 'Gère membres, intégrations et paramètres du workspace.',
    perms: ['workspace.edit', 'members.invite', 'members.remove', 'integrations.edit', 'drafts.create', 'drafts.edit', 'drafts.delete', 'drafts.publish', 'drafts.review', 'drafts.comment'],
  },
  editor: {
    id: 'editor', label: 'Éditeur',
    icon: <IconEdit/>,
    desc: 'Crée et édite les brouillons, planifie, publie.',
    perms: ['drafts.create', 'drafts.edit', 'drafts.publish', 'drafts.review', 'drafts.comment'],
  },
  reviewer: {
    id: 'reviewer', label: 'Reviewer',
    icon: <IconEye/>,
    desc: 'Commente et approuve, ne peut pas éditer directement.',
    perms: ['drafts.review', 'drafts.comment'],
  },
  viewer: {
    id: 'viewer', label: 'Viewer',
    icon: <IconEye/>,
    desc: 'Consulte seulement — utile pour partager avec un client.',
    perms: ['drafts.view'],
  },
  guest: {
    id: 'guest', label: 'Invité externe',
    icon: <IconLink/>,
    desc: 'Accès limité à quelques drafts spécifiques via lien.',
    perms: ['drafts.view', 'drafts.comment'],
  },
};

function can(user, workspace, perm) {
  if (!user || !workspace) return false;
  const membership = (user.memberships || []).find(m => m.ws === workspace.id);
  if (!membership) return false;
  const role = ROLES[membership.role];
  if (!role) return false;
  return role.perms.includes('*') || role.perms.includes(perm);
}

// ============================================================
// MEMBERS DATA STORE
// ============================================================
const SEED_MEMBERS = [
  {
    id: 'u-owner', email: 'hervewognin264@gmail.com', name: 'Hervé Wognin',
    handle: 'herve', color: '#ff5a1f', status: 'online',
    memberships: [
      { ws: 'ws-main', role: 'owner' },
    ],
    joinedAt: Date.now(),
  },
];

const SEED_INVITES = [];

function loadMembers() {
  try {
    const raw = localStorage.getItem('cd-members');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && !parsed.some(m => m.email?.includes('studio-rouages') || m.email?.includes('kombu-cafe'))) {
        return parsed;
      }
    }
  } catch(e) {}
  saveMembers(SEED_MEMBERS);
  return SEED_MEMBERS;
}
function saveMembers(m) { try { localStorage.setItem('cd-members', JSON.stringify(m)); } catch(e) {} }

function loadInvites() {
  try {
    const raw = localStorage.getItem('cd-invites');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && !parsed.some(i => i.email?.includes('kombu-cafe') || i.email?.includes('freelance.io'))) {
        return parsed;
      }
    }
  } catch(e) {}
  saveInvites(SEED_INVITES);
  return SEED_INVITES;
}
function saveInvites(i) { try { localStorage.setItem('cd-invites', JSON.stringify(i)); } catch(e) {} }

function loadActivity() {
  try {
    const stored = JSON.parse(localStorage.getItem('cd-activity') || 'null');
    if (stored && Array.isArray(stored) && !stored.some(a => a.target?.includes('Céramiste') || a.target?.includes('Aurelia'))) return stored;
  } catch(e) {}
  return [];
}
function saveActivity(a) { try { localStorage.setItem('cd-activity', JSON.stringify(a.slice(0, 100))); } catch(e) {} }

const SEED_ACTIVITY = [];

const ACTIVITY_LABELS = {
  'draft.create':  { icon: <IconPlus/>, verb: 'a créé' },
  'draft.edit':    { icon: <IconEdit/>, verb: 'a modifié' },
  'draft.publish': { icon: <IconSend/>, verb: 'a publié' },
  'draft.review':  { icon: <IconEye/>, verb: 'a demandé revue de' },
  'comment':       { icon: <IconMessageCircle/>, verb: 'a commenté' },
  'member.invite': { icon: <IconPlus/>, verb: 'a invité' },
  'member.join':   { icon: <IconCheck/>, verb: 'a rejoint via' },
  'member.remove': { icon: <IconTrash/>, verb: 'a retiré' },
  'role.change':   { icon: <IconSettings/>, verb: 'a changé le rôle de' },
};

const initialsOf = (n) => n.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

// ============================================================
// MAIN TEAM VIEW
// ============================================================
function TeamView({ workspaces, currentWs, onOpenInvite, onToast }) {
  const [members, setMembers] = useStateT2(loadMembers);
  const [invites, setInvites] = useStateT2(loadInvites);
  const [tab, setTab] = useStateT2('members'); // members | invites | activity
  const [q, setQ] = useStateT2('');
  const [wsFilter, setWsFilter] = useStateT2(currentWs === 'all' || currentWs === 'inbox' ? 'all' : currentWs);
  const activity = loadActivity();

  useEffectT2(() => saveMembers(members), [members]);
  useEffectT2(() => saveInvites(invites), [invites]);

  const filteredMembers = useMemoT2(() => {
    const query = q.toLowerCase();
    return members.filter(m => {
      if (query && !m.name.toLowerCase().includes(query) && !m.email.toLowerCase().includes(query) && !m.handle.includes(query)) return false;
      if (wsFilter !== 'all' && !(m.memberships || []).some(x => x.ws === wsFilter)) return false;
      return true;
    });
  }, [members, q, wsFilter]);

  const filteredInvites = useMemoT2(() => {
    return invites.filter(i => i.status === 'pending' && (wsFilter === 'all' || i.workspaces.includes(wsFilter)));
  }, [invites, wsFilter]);

  const filteredActivity = useMemoT2(() => {
    return activity.filter(a => wsFilter === 'all' || a.ws === wsFilter).slice(0, 30);
  }, [activity, wsFilter]);

  const removeMember = (memberId) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    onToast('Membre retiré');
  };
  const changeRole = (memberId, wsId, newRole) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        memberships: m.memberships.map(x => x.ws === wsId ? { ...x, role: newRole } : x),
      };
    }));
    onToast('Rôle mis à jour');
  };
  const cancelInvite = (inviteId) => {
    setInvites(prev => prev.filter(i => i.id !== inviteId));
    onToast('Invitation annulée');
  };
  const resendInvite = (inviteId) => {
    setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, invitedAt: Date.now() } : i));
    onToast('Invitation renvoyée');
  };

  const onlineCount = members.filter(m => m.status === 'online').length;

  return (
    <div className="team-view">
      <div className="team-header">
        <div>
          <h2 style={{margin: '0 0 3px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em'}}>Équipe & permissions</h2>
          <div style={{color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5}}>
            Gérez les membres, invités et rôles pour chaque workspace.
          </div>
        </div>
        <div className="stats" style={{marginLeft: 'auto'}}>
          <div><b>{members.length}</b> Membres</div>
          <div><b style={{color: '#22c55e'}}>{onlineCount}</b> En ligne</div>
          <div><b>{invites.filter(i => i.status === 'pending').length}</b> Invitations</div>
        </div>
      </div>

      <div className="team-toolbar">
        <div className="team-tabs">
          <button className={`team-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
            <IconInbox/>Membres <span className="cnt">{filteredMembers.length}</span>
          </button>
          <button className={`team-tab ${tab === 'invites' ? 'active' : ''}`} onClick={() => setTab('invites')}>
            <IconLink/>Invitations <span className="cnt">{filteredInvites.length}</span>
          </button>
          <button className={`team-tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
            <IconClock/>Activité <span className="cnt">{filteredActivity.length}</span>
          </button>
        </div>

        <div className="team-search">
          <IconSearch size={12}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"/>
        </div>

        <select className="d-select" style={{width: 160, height: 30}} value={wsFilter} onChange={e => setWsFilter(e.target.value)}>
          <option value="all">Tous les espaces</option>
          {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        <button className="btn primary" onClick={() => onOpenInvite(wsFilter === 'all' ? null : wsFilter)}>
          <IconPlus/>Inviter
        </button>
      </div>

      {tab === 'members' && (
        <MembersTable members={filteredMembers} workspaces={workspaces} wsFilter={wsFilter}
                      onRemove={removeMember} onChangeRole={changeRole}/>
      )}
      {tab === 'invites' && (
        <InvitesTable invites={filteredInvites} workspaces={workspaces}
                      onCancel={cancelInvite} onResend={resendInvite}
                      onOpenInvite={() => onOpenInvite(wsFilter === 'all' ? null : wsFilter)}/>
      )}
      {tab === 'activity' && (
        <div className="activity-panel" style={{marginTop: 0}}>
          <h3><IconClock/>Activité récente
            {wsFilter !== 'all' && (
              <span style={{marginLeft: 8, color: 'var(--text-3)', fontSize: 11, fontWeight: 500, textTransform: 'none', letterSpacing: 0}}>
                — {workspaces.find(w => w.id === wsFilter)?.name}
              </span>
            )}
          </h3>
          <ActivityList entries={filteredActivity} members={members}/>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MEMBERS TABLE
// ============================================================
function MembersTable({ members, workspaces, wsFilter, onRemove, onChangeRole }) {
  if (!members.length) {
    return <div className="empty-state">
      <IconInbox/>
      <div className="es-title">Aucun membre</div>
      <div>Ajustez vos filtres ou invitez de nouveaux membres.</div>
    </div>;
  }
  return (
    <table className="members-table">
      <thead>
        <tr>
          <th>Membre</th>
          <th>Espaces & rôles</th>
          <th style={{width: 140}}>Rejoint</th>
          <th style={{width: 100, textAlign: 'right'}}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {members.map(m => {
          const memberships = wsFilter === 'all'
            ? m.memberships
            : m.memberships.filter(x => x.ws === wsFilter);
          return (
            <tr key={m.id}>
              <td>
                <div className="m-user">
                  <div className="m-av" style={{background: m.color}}>
                    {initialsOf(m.name)}
                    <span className={`presence-dot ${m.status}`}/>
                  </div>
                  <div>
                    <div className="m-name">{m.name}{m.id === 'u-noemie' && ' (vous)'}</div>
                    <div className="m-email">{m.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="m-workspaces">
                  {memberships.map(x => {
                    const w = workspaces.find(y => y.id === x.ws);
                    const role = ROLES[x.role];
                    return w && role ? (
                      <span key={x.ws} className="m-workspace-chip" title={role.desc}>
                        <span className="dot" style={{background: w.color}}/>
                        {w.name.replace(/^(CM|DA)\s*·\s*/, '')}
                        <span className={`role-pill ${role.id}`} style={{padding: '0 4px', fontSize: 10}}>
                          {role.label}
                        </span>
                      </span>
                    ) : null;
                  })}
                </div>
              </td>
              <td style={{fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)'}}>
                {new Date(m.joinedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td>
                <div className="m-actions">
                  <MemberActionMenu member={m} workspaces={workspaces} wsFilter={wsFilter}
                                    onChangeRole={onChangeRole} onRemove={onRemove}/>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MemberActionMenu({ member, workspaces, wsFilter, onChangeRole, onRemove }) {
  const [open, setOpen] = useStateT2(false);
  const ref = useRefT2(null);
  useEffectT2(() => {
    const onClick = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  const isOwner = member.id === 'u-noemie';

  return (
    <div ref={ref} style={{position: 'relative'}}>
      <button className="icon-btn" onClick={() => setOpen(!open)} title="Actions">
        <IconMoreH/>
      </button>
      {open && (
        <div className="assignee-dropdown" style={{right: 0, left: 'auto', minWidth: 200}}>
          <div className="head-lbl">Changer le rôle</div>
          {member.memberships.filter(x => wsFilter === 'all' || x.ws === wsFilter).map(x => {
            const w = workspaces.find(y => y.id === x.ws);
            return w ? (
              <div key={x.ws} style={{padding: 6}}>
                <div style={{fontSize: 10.5, color: 'var(--text-4)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5}}>
                  <span className="dot" style={{width: 6, height: 6, borderRadius: 2, background: w.color}}/>
                  {w.name}
                </div>
                <select className="d-select" style={{width: '100%'}}
                        value={x.role}
                        onChange={e => onChangeRole(member.id, x.ws, e.target.value)}
                        disabled={isOwner && x.role === 'owner'}>
                  {Object.values(ROLES).map(r => (
                    <option key={r.id} value={r.id}
                            disabled={r.id === 'owner' && !isOwner}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null;
          })}
          {!isOwner && (
            <div className="assignee-item unassign" onClick={() => { onRemove(member.id); setOpen(false); }}>
              <IconTrash size={12}/>Retirer du workspace
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// INVITES TABLE
// ============================================================
function InvitesTable({ invites, workspaces, onCancel, onResend, onOpenInvite }) {
  if (!invites.length) {
    return (
      <div className="empty-state">
        <IconLink/>
        <div className="es-title">Aucune invitation en attente</div>
        <div style={{marginBottom: 14}}>Toutes les invitations envoyées ont été acceptées ou annulées.</div>
        <button className="btn primary" onClick={onOpenInvite}><IconPlus/>Inviter quelqu'un</button>
      </div>
    );
  }

  const fmtAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return Math.floor(diff/60000) + ' min';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' h';
    return Math.floor(diff/86400000) + ' j';
  };

  return (
    <table className="members-table">
      <thead>
        <tr>
          <th>Invité</th>
          <th>Espace(s) & rôle</th>
          <th style={{width: 100}}>Envoyée</th>
          <th style={{width: 100}}>Statut</th>
          <th style={{width: 100, textAlign: 'right'}}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {invites.map(inv => {
          const role = ROLES[inv.role];
          return (
            <tr key={inv.id} className="pending-invite">
              <td>
                <div className="m-user">
                  <div className="m-av">
                    <IconLink size={13}/>
                  </div>
                  <div>
                    <div className="m-name" style={{color: 'var(--text-2)', fontStyle: 'normal'}}>{inv.email}</div>
                    {inv.message && (
                      <div className="m-email" style={{fontFamily: 'var(--sans)', fontStyle: 'italic', fontSize: 11}}>
                        « {inv.message.slice(0, 60)}{inv.message.length > 60 ? '…' : ''} »
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <div className="m-workspaces">
                  {inv.workspaces.map(wsId => {
                    const w = workspaces.find(y => y.id === wsId);
                    return w ? (
                      <span key={wsId} className="m-workspace-chip">
                        <span className="dot" style={{background: w.color}}/>
                        {w.name.replace(/^(CM|DA)\s*·\s*/, '')}
                      </span>
                    ) : null;
                  })}
                  {role && <span className={`role-pill ${role.id}`}>{role.icon}{role.label}</span>}
                </div>
              </td>
              <td style={{fontFamily: 'var(--mono)', fontSize: 11}}>il y a {fmtAgo(inv.invitedAt)}</td>
              <td>
                <span className="pending-badge"><IconClock/>En attente</span>
              </td>
              <td>
                <div className="m-actions">
                  <button className="d-action" onClick={() => onResend(inv.id)} title="Renvoyer">
                    <IconSend/>
                  </button>
                  <button className="d-action" onClick={() => onCancel(inv.id)} title="Annuler">
                    <IconX/>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ============================================================
// ACTIVITY LIST
// ============================================================
function ActivityList({ entries, members }) {
  const fmtAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'à l\'instant';
    if (diff < 3600000) return Math.floor(diff/60000) + ' min';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' h';
    return Math.floor(diff/86400000) + ' j';
  };

  if (!entries.length) return <div className="empty-state">
    <IconClock/><div className="es-title">Aucune activité</div>
    <div>L'historique apparaît ici dès les premières actions.</div>
  </div>;

  return (
    <div className="activity-list">
      {entries.map(a => {
        const actor = members.find(m => m.id === a.actor);
        const label = ACTIVITY_LABELS[a.kind] || { verb: 'a fait quelque chose sur' };
        if (!actor) return null;
        return (
          <div key={a.id} className="activity-item">
            <div className="a-av" style={{background: actor.color}}>{initialsOf(actor.name)}</div>
            <div className="a-body">
              <span className="a-actor">{actor.name}</span> {label.verb} <span className="a-target">{a.target}</span>
            </div>
            <span className="a-time">{fmtAgo(a.ts)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// INVITE MODAL
// ============================================================
function InviteModal({ workspaces, defaultWs, onClose, onInvited, onToast }) {
  const [emails, setEmails] = useStateT2([]);
  const [emailInput, setEmailInput] = useStateT2('');
  const [role, setRole] = useStateT2('editor');
  const [selectedWs, setSelectedWs] = useStateT2(defaultWs ? [defaultWs] : []);
  const [message, setMessage] = useStateT2('');
  const [phase, setPhase] = useStateT2('form'); // form | success
  const [inviteLink, setInviteLink] = useStateT2('');

  const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const commitEmail = (raw) => {
    const parts = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length) {
      const newOnes = parts.map(email => ({ email, valid: isValidEmail(email) }));
      setEmails(prev => {
        const existing = new Set(prev.map(e => e.email));
        return [...prev, ...newOnes.filter(x => !existing.has(x.email))];
      });
    }
    setEmailInput('');
  };

  const removeEmail = (idx) => setEmails(prev => prev.filter((_, i) => i !== idx));
  const toggleWs = (id) => setSelectedWs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const send = () => {
    commitEmail(emailInput);
    const validEmails = emails.filter(e => e.valid).map(e => e.email);
    const finalEmails = validEmails.length ? validEmails
      : (isValidEmail(emailInput) ? [emailInput.trim()] : []);
    if (!finalEmails.length) { onToast('Ajoutez au moins un email valide'); return; }
    if (!selectedWs.length) { onToast('Sélectionnez au moins un workspace'); return; }

    const invites = loadInvites();
    const newInvites = finalEmails.map((email, i) => ({
      id: 'inv-' + Date.now() + '-' + i,
      email, role, workspaces: selectedWs,
      invitedBy: 'u-noemie',
      invitedAt: Date.now(),
      message, status: 'pending',
    }));
    saveInvites([...newInvites, ...invites]);

    const link = `https://contentdock.app/invite/${btoa(finalEmails[0]).slice(0, 12)}xyz`;
    setInviteLink(link);
    setPhase('success');
    onInvited?.(newInvites);

    // Expédition des emails SMTP réels via EmailService
    if (window.EmailService && typeof window.EmailService.sendWorkspaceInvitation === 'function') {
      const currentUserName = (window.CD_DB?.getCurrentUser()?.name) || 'Hervé Wognin';
      const wsNames = selectedWs.map(id => workspaces.find(w => w.id === id)?.name).filter(Boolean).join(', ');
      finalEmails.forEach(email => {
        window.EmailService.sendWorkspaceInvitation({
          to: email,
          inviterName: currentUserName,
          workspaceName: wsNames || 'ContentDock Workspace',
          role: ROLES[role]?.label || role,
          message: message || '',
          code: 'CD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          joinUrl: link
        }).catch(err => console.warn('[InviteModal] Erreur envoi email invitation :', err));
      });
    }

    onToast(`${newInvites.length} invitation${newInvites.length>1?'s':''} envoyée${newInvites.length>1?'s':''}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    onToast('Lien copié');
  };

  const totalEmails = emails.length + (isValidEmail(emailInput.trim()) ? 1 : 0);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="invite-modal">
        {phase === 'form' && <>
          <div className="head">
            <h3>Inviter des membres</h3>
            <p>Envoyez un lien d'invitation par email. Vos invités reçoivent un email avec le rôle et l'accès défini.</p>
          </div>
          <div className="body">
            <div>
              <div className="d-side-label">Adresses email</div>
              <div className="email-chips-input" onClick={e => {
                if (e.target.tagName !== 'INPUT') e.currentTarget.querySelector('input')?.focus();
              }}>
                {emails.map((e, i) => (
                  <span key={i} className={`email-chip ${!e.valid ? 'invalid' : ''}`} title={e.valid ? '' : 'Email invalide'}>
                    {e.email}
                    <button onClick={() => removeEmail(i)}><IconX size={10}/></button>
                  </span>
                ))}
                <input value={emailInput}
                       onChange={e => setEmailInput(e.target.value)}
                       onKeyDown={e => {
                         if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') && emailInput.trim()) {
                           e.preventDefault();
                           commitEmail(emailInput);
                         }
                         if (e.key === 'Backspace' && !emailInput && emails.length) {
                           setEmails(prev => prev.slice(0, -1));
                         }
                       }}
                       onBlur={() => emailInput.trim() && commitEmail(emailInput)}
                       placeholder={emails.length ? '' : 'julien@exemple.com, anna@…'}/>
              </div>
              <div style={{fontSize: 10.5, color: 'var(--text-4)', marginTop: 4}}>
                Séparez les emails par virgule, espace ou Entrée
              </div>
            </div>

            <div>
              <div className="d-side-label">Rôle</div>
              <div className="role-picker">
                {Object.values(ROLES).filter(r => r.id !== 'owner').map(r => (
                  <button key={r.id} className={`role-option ${role === r.id ? 'on' : ''}`}
                          onClick={() => setRole(r.id)}>
                    <div className="r-head">
                      <span className={`role-pill ${r.id}`} style={{padding: '2px 5px', fontSize: 10.5}}>
                        {r.icon}
                      </span>
                      {r.label}
                    </div>
                    <div className="r-desc">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="d-side-label">Espaces</div>
              <div className="ws-check-list">
                {workspaces.map(w => (
                  <div key={w.id}
                       className={`ws-check-row ${selectedWs.includes(w.id) ? 'on' : ''}`}
                       onClick={() => toggleWs(w.id)}>
                    <div className="check">
                      {selectedWs.includes(w.id) && <IconCheck size={11}/>}
                    </div>
                    <span className="ws-dot" style={{background: w.color}}/>
                    <span style={{flex: 1}}>{w.name}</span>
                    <span className="count-r">{w.kind}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="d-side-label">Message d'invitation (optionnel)</div>
              <textarea className="textarea-settings" style={{width: '100%', minHeight: 60}}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Ex: Salut ! Voici l'accès pour valider les publications du mois."/>
            </div>
          </div>
          <div className="foot">
            <div className="count">
              {totalEmails} email{totalEmails > 1 ? 's' : ''} · {selectedWs.length} espace{selectedWs.length > 1 ? 's' : ''} · {ROLES[role].label}
            </div>
            <div style={{display: 'flex', gap: 8}}>
              <button className="btn ghost" onClick={onClose}>Annuler</button>
              <button className="btn primary" onClick={send} disabled={!totalEmails || !selectedWs.length}>
                <IconSend/>Envoyer {totalEmails > 0 ? `(${totalEmails})` : ''}
              </button>
            </div>
          </div>
        </>}

        {phase === 'success' && <>
          <div className="invite-success">
            <IconCheck/>
            <h3>Invitations envoyées ✨</h3>
            <p>Chaque personne recevra un email avec un lien pour rejoindre.</p>
            <div style={{marginTop: 16, color: 'var(--text-3)', fontSize: 11, textAlign: 'left'}}>
              <div className="d-side-label">Lien de partage universel</div>
              <div className="link-box">
                <IconLink size={13}/>
                <code>{inviteLink}</code>
                <button className="d-action" onClick={copyLink}><IconCopy/>Copier</button>
              </div>
              <div style={{fontSize: 10.5, color: 'var(--text-4)', marginTop: 4}}>
                Ce lien est valide 7 jours et peut être utilisé par les personnes invitées.
              </div>
            </div>
          </div>
          <div className="foot" style={{justifyContent: 'flex-end'}}>
            <button className="btn ghost" onClick={() => setPhase('form')}>Inviter d'autres personnes</button>
            <button className="btn primary" onClick={onClose}><IconCheck/>Terminé</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ============================================================
// ASSIGNEE PICKER (used in draft drawer)
// ============================================================
function AssigneePicker({ draft, workspaces, onAssign, onToast }) {
  const [open, setOpen] = useStateT2(false);
  const [members] = useStateT2(loadMembers);
  const ref = useRefT2(null);

  useEffectT2(() => {
    const onClick = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  const wsMembers = members.filter(m =>
    (m.memberships || []).some(x => x.ws === draft.ws)
  );

  const currentAssignee = members.find(m => m.id === draft.assigneeId);

  return (
    <div ref={ref} className="assignee-picker">
      <button className={`assignee-current ${!currentAssignee ? 'empty' : ''}`}
              onClick={() => setOpen(!open)}>
        {currentAssignee ? (
          <>
            <div className="a-av" style={{background: currentAssignee.color}}>
              {initialsOf(currentAssignee.name)}
            </div>
            {currentAssignee.name.split(' ')[0]}
          </>
        ) : (
          <>
            <IconPlus size={11}/>Assigner
          </>
        )}
      </button>
      {open && (
        <div className="assignee-dropdown">
          <div className="head-lbl">Assigner à</div>
          {wsMembers.map(m => {
            const mem = m.memberships.find(x => x.ws === draft.ws);
            const role = ROLES[mem?.role];
            return (
              <div key={m.id}
                   className={`assignee-item ${draft.assigneeId === m.id ? 'active' : ''}`}
                   onClick={() => {
                     onAssign(m.id);
                     onToast(`Assigné à ${m.name}`);
                     setOpen(false);
                   }}>
                <div className="a-av" style={{background: m.color}}>{initialsOf(m.name)}</div>
                <div>
                  <div>{m.name}</div>
                </div>
                {role && <span className="role-mini">{role.label}</span>}
              </div>
            );
          })}
          {draft.assigneeId && (
            <div className="assignee-item unassign" onClick={() => { onAssign(null); onToast('Assignation retirée'); setOpen(false); }}>
              <IconX size={12}/>Retirer l'assignation
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PENDING INVITE INBOX (for the current user perspective)
// ============================================================
function InviteInbox({ onAccept, onDecline, currentUser }) {
  const [invite, setInvite] = useStateT2(null);

  useEffectT2(() => {
    // Only show pending invites if user is actually authenticated
    const user = currentUser || (window.ContentDockDB && typeof window.ContentDockDB.getCurrentUser === 'function' && window.ContentDockDB.getCurrentUser());
    if (!user) return;

    const shown = sessionStorage.getItem('cd-invite-inbox-shown');
    if (shown) return;
    const t = setTimeout(() => {
      setInvite({
        id: 'demo',
        fromName: 'Julie Ledoux',
        fromEmail: 'julie@atelier-nord.fr',
        workspaceName: 'Atelier Nord · Direction artistique',
        role: 'editor',
      });
      sessionStorage.setItem('cd-invite-inbox-shown', '1');
    }, 3500);
    return () => clearTimeout(t);
  }, [currentUser]);

  if (!invite) return null;
  const role = ROLES[invite.role];

  return (
    <div className="invite-inbox">
      <div className="h"><IconLink size={14}/>Nouvelle invitation</div>
      <div className="desc">
        <b>{invite.fromName}</b> vous invite à rejoindre <b>{invite.workspaceName}</b> en tant que <span className={`role-pill ${role.id}`} style={{padding: '1px 5px', fontSize: 10}}>{role.label}</span>
      </div>
      <div className="acts">
        <button className="btn ghost" onClick={() => { onDecline?.(invite); setInvite(null); }}>Refuser</button>
        <button className="btn primary" onClick={() => { onAccept?.(invite); setInvite(null); }}>
          <IconCheck/>Accepter
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR MEMBERS WIDGET
// ============================================================
function SideMembers({ workspace, onOpenTeam, onOpenInvite }) {
  const members = loadMembers();
  const wsMembers = members.filter(m => (m.memberships || []).some(x => x.ws === workspace?.id));
  if (!workspace || !wsMembers.length) return null;
  const visible = wsMembers.slice(0, 4);
  const rest = wsMembers.length - visible.length;

  return (
    <div className="side-members">
      <div className="lbl">
        <span>Équipe · {wsMembers.length}</span>
        <button title="Inviter" onClick={onOpenInvite}><IconPlus size={11}/></button>
      </div>
      <div className="list">
        {visible.map(m => (
          <div key={m.id} className="mini-av" style={{background: m.color}} title={`${m.name} (${ROLES[(m.memberships.find(x=>x.ws===workspace.id))?.role]?.label})`}>
            {initialsOf(m.name)}
          </div>
        ))}
        {rest > 0 && (
          <div className="mini-av plus" onClick={onOpenTeam} style={{cursor: 'pointer'}} title="Voir tous">
            +{rest}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  TeamView, InviteModal, AssigneePicker, InviteInbox, SideMembers,
  ROLES, can, loadMembers, loadInvites, initialsOf,
});

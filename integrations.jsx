// Integrations : Buffer, Zapier, Meta Graph, Webhooks, Hootsuite, Mailchimp
// + Publish dialog with realistic API mock
const { useState: useStateI, useEffect: useEffectI, useRef: useRefI } = React;

const INTEGRATIONS = [
  {
    id: 'buffer',
    name: 'Buffer',
    desc: 'Programmez et publiez sur Instagram, LinkedIn, X, Facebook via Buffer.',
    channels: ['ig', 'li', 'x', 'fb', 'tt'],
    fields: [
      { k: 'accessToken', label: 'Access Token', placeholder: '1/abc123…' },
      { k: 'profileIds', label: 'Profile IDs (séparés par virgule)', placeholder: 'ig_xxx, li_xxx' },
    ],
    endpoint: 'https://api.bufferapp.com/1/updates/create.json',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    desc: 'Déclenchez un Zap avec le contenu du brouillon comme payload.',
    channels: ['*'],
    fields: [
      { k: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/…' },
    ],
    endpoint: 'webhook',
  },
  {
    id: 'meta',
    name: 'Meta Graph API',
    desc: 'Publication directe sur Instagram & Facebook via l\'API officielle Meta.',
    channels: ['ig', 'fb'],
    fields: [
      { k: 'appId', label: 'App ID', placeholder: '1234567890' },
      { k: 'accessToken', label: 'User Access Token', placeholder: 'EAAB…' },
      { k: 'pageId', label: 'Page ID', placeholder: '9876543210' },
      { k: 'igAccountId', label: 'IG Business Account ID', placeholder: '17841…' },
    ],
    endpoint: 'https://graph.facebook.com/v18.0/{pageId}/feed',
  },
  {
    id: 'webhook',
    name: 'Webhook personnalisé',
    desc: 'Envoyez le brouillon vers n\'importe quelle URL en POST JSON.',
    channels: ['*'],
    fields: [
      { k: 'url', label: 'Endpoint URL', placeholder: 'https://your-api.com/publish' },
      { k: 'secret', label: 'Secret (HMAC signature)', placeholder: 'Optionnel' },
    ],
    endpoint: 'custom',
  },
  {
    id: 'hootsuite',
    name: 'Hootsuite',
    desc: 'Programmation multi-plateformes via Hootsuite REST API.',
    channels: ['ig', 'li', 'x', 'fb'],
    fields: [
      { k: 'apiKey', label: 'API Key', placeholder: 'sk_live_…' },
    ],
    endpoint: 'https://platform.hootsuite.com/v1/messages',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    desc: 'Convertir le brouillon en newsletter (mode blog uniquement).',
    channels: ['bl'],
    fields: [
      { k: 'apiKey', label: 'API Key', placeholder: 'us-XXX-…' },
      { k: 'audienceId', label: 'Audience ID', placeholder: 'a1b2c3d4' },
    ],
    endpoint: 'https://usXX.api.mailchimp.com/3.0/campaigns',
  },
];

function loadIntegrations() {
  try { return JSON.parse(localStorage.getItem('cd-integrations') || '{}'); }
  catch(e) { return {}; }
}
function saveIntegrations(s) {
  try { localStorage.setItem('cd-integrations', JSON.stringify(s)); } catch(e) {}
}

function IntegrationsView({ onToast }) {
  const [state, setState] = useStateI(() => loadIntegrations());
  const [editing, setEditing] = useStateI(null);

  const toggle = (id) => {
    onToast(`🚀 ${labelOf(id)} : Fonctionnalité à venir dans la prochaine mise à jour !`);
  };

  const saveConfig = (id, cfg) => {
    const next = { ...state, [id]: { ...state[id], ...cfg } };
    setState(next);
    saveIntegrations(next);
    setEditing(null);
    onToast('Configuration enregistrée');
  };

  return (
    <div>
      {/* Bannière Bientôt Disponible */}
      <div className="integrations-coming-soon-banner">
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: 'rgba(255, 90, 31, 0.15)',
          color: '#ff5a1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{flex: 1}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5}}>
            <span style={{fontWeight: 700, fontSize: 14.5, color: '#ffffff'}}>Intégrations & Passerelles de Publication</span>
            <span className="integrations-soon-badge">Bientôt disponible</span>
          </div>
          <div style={{color: 'var(--text-3, #a7a7b3)', fontSize: 12.5, lineHeight: 1.5}}>
            La publication automatique vers <strong>Buffer</strong>, <strong>Zapier</strong>, <strong>Meta Graph API</strong> (Instagram & Facebook), <strong>Webhooks</strong> et <strong>Hootsuite</strong> sera activée dans la prochaine version. Vos brouillons et médias restent 100% stockés en toute autonomie sur votre appareil via SQLite.
          </div>
        </div>
      </div>

      <div className="integrations-grid">
        {INTEGRATIONS.map(i => {
          const cfg = state[i.id] || {};
          return (
            <div key={i.id} className="integration-card" style={{opacity: 0.9}}>
              <div style={{display: 'flex', gap: 12, alignItems: 'flex-start'}}>
                <div className={`i-logo ${i.id}`}>{i.name[0]}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div className="i-name" style={{display:'flex', alignItems:'center', gap: 6}}>
                    {i.name}
                    <span style={{fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,90,31,0.12)', color: '#ff834f', fontWeight: 600}}>Bientôt</span>
                  </div>
                  <div style={{marginTop: 3}}>
                    <span className="i-status off">
                      <span style={{width: 5, height: 5, borderRadius: '50%', background: '#ff834f'}}/>
                      À venir
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(i.id)}
                  style={{
                    fontSize: 11,
                    padding: '4px 9px',
                    borderRadius: 5,
                    background: 'var(--bg-3)',
                    color: 'var(--text-3)',
                    border: '1px solid var(--line-strong)',
                    cursor: 'pointer'
                  }}>
                  Bientôt
                </button>
              </div>
              <div className="i-desc">{i.desc}</div>
              <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                {i.channels[0] === '*'
                  ? <span className="ocr-badge">Tous canaux</span>
                  : i.channels.map(ch => <ChannelBadge key={ch} ch={ch} size={14}/>)
                }
              </div>
              {cfg.enabled && (
                <div className="integration-config">
                  {i.fields.map(f => (
                    <div key={f.k} className="row">
                      <span className="k">{f.label}</span>
                      <span className="v">{cfg[f.k] ? mask(cfg[f.k]) : <span style={{color: 'var(--warn)'}}>non configuré</span>}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display: 'flex', gap: 6}}>
                <button className="btn ghost" style={{flex: 1}} onClick={() => setEditing(i)}>
                  <IconSettings/>Configurer
                </button>
                {cfg.enabled && (
                  <button className="btn ghost" onClick={() => onToast('Test réussi ✓ — connexion établie')}>
                    <IconCheck/>Test
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <IntegrationConfigModal integration={editing}
                                config={state[editing.id] || {}}
                                onSave={(cfg) => saveConfig(editing.id, cfg)}
                                onClose={() => setEditing(null)}/>
      )}
    </div>
  );
}

function labelOf(id) { return INTEGRATIONS.find(i => i.id === id)?.name || id; }
function mask(v) { return v.length > 12 ? v.slice(0, 4) + '••••' + v.slice(-4) : '••••'; }

function IntegrationConfigModal({ integration, config, onSave, onClose }) {
  const [values, setValues] = useStateI(() => {
    const v = {};
    integration.fields.forEach(f => v[f.k] = config[f.k] || '');
    return v;
  });
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-edit-modal" style={{width: 500}}>
        <div className="ws-edit-head">
          <div className={`i-logo ${integration.id}`} style={{width: 32, height: 32, fontSize: 13}}>{integration.name[0]}</div>
          Configuration · {integration.name}
        </div>
        <div className="ws-edit-body">
          <div style={{fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5}}>
            {integration.desc}
          </div>
          {integration.fields.map(f => (
            <div key={f.k}>
              <div className="d-side-label">{f.label}</div>
              <input className="settings-input" style={{width: '100%', fontFamily: 'var(--mono)', fontSize: 11.5}}
                     placeholder={f.placeholder}
                     value={values[f.k]}
                     onChange={e => setValues({...values, [f.k]: e.target.value})}/>
            </div>
          ))}
          {integration.endpoint && integration.endpoint !== 'custom' && integration.endpoint !== 'webhook' && (
            <div style={{fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)'}}>
              Endpoint: {integration.endpoint}
            </div>
          )}
        </div>
        <div className="ws-edit-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={() => onSave(values)}>
            <IconCheck/>Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PUBLISH DIALOG — realistic API call simulation
// ============================================================
function PublishDialog({ draft, onClose, onDone, onToast }) {
  const [selected, setSelected] = useStateI([draft.channel]);
  const [phase, setPhase] = useStateI('config'); // config | publishing | done
  const [log, setLog] = useStateI([]);
  const [results, setResults] = useStateI(null);

  const state = loadIntegrations();
  const activeIntegrations = INTEGRATIONS.filter(i => state[i.id]?.enabled);

  const toggle = (ch) => setSelected(s => s.includes(ch) ? s.filter(x => x !== ch) : [...s, ch]);

  const push = (msg, kind = 'info') => setLog(l => [...l, { ts: Date.now(), msg, kind }]);

  const publish = async () => {
    setPhase('publishing');
    setLog([]);
    push(`Préparation de la publication — ${selected.length} canal(aux)…`);
    await sleep(400);

    const res = { success: [], failed: [] };
    for (const ch of selected) {
      const integ = activeIntegrations.find(i => i.channels.includes(ch) || i.channels[0] === '*');
      if (!integ) {
        push(`Aucune intégration configurée pour ${window.CD_DATA.channels[ch]?.label}`, 'warn');
        res.failed.push(ch);
        continue;
      }
      push(`[${integ.name}] Envoi vers ${window.CD_DATA.channels[ch]?.label}…`);
      await sleep(600 + Math.random() * 800);
      const payload = {
        text: draft.variants[ch] || draft.body,
        images: draft.images,
        hashtags: draft.hashtags,
        channel: ch,
      };
      push(`  → POST ${integ.endpoint === 'custom' ? state[integ.id]?.url : integ.endpoint}`, 'info');
      await sleep(400);
      push(`  → payload: ${payload.text.length} car · ${payload.images.length} img · ${payload.hashtags.length} tags`);
      await sleep(400);
      // Simulate 95% success
      if (Math.random() > 0.05) {
        const postId = 'p_' + Math.random().toString(36).slice(2, 10);
        push(`  ✓ Publié · post_id=${postId}`);
        res.success.push({ channel: ch, integration: integ.id, postId });
      } else {
        push(`  ✗ Erreur 429 · rate limit`, 'err');
        res.failed.push(ch);
      }
    }
    await sleep(300);
    push(`Terminé : ${res.success.length} succès · ${res.failed.length} échec(s)`);
    setResults(res);
    setPhase('done');
    if (res.failed.length === 0) {
      onDone?.();
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => phase !== 'publishing' && e.target === e.currentTarget && onClose()}>
      <div className="publish-modal">
        <div className="publish-head">
          <IconSend size={14}/>
          <span style={{fontWeight: 600, fontSize: 13}}>Publier « {draft.title.slice(0, 40)}{draft.title.length > 40 ? '…' : ''} »</span>
          <div style={{flex: 1}}/>
          {phase !== 'publishing' && <button className="icon-btn" onClick={onClose}><IconX/></button>}
        </div>

        <div className="publish-body">
          {phase === 'config' && (
            <>
              <div>
                <div className="d-side-label">Sélectionner les canaux</div>
                <div className="publish-channel-picker">
                  {Object.values(window.CD_DATA.channels).map(c => {
                    const supported = activeIntegrations.some(i => i.channels.includes(c.id) || i.channels[0] === '*');
                    const on = selected.includes(c.id);
                    return (
                      <button key={c.id}
                              className={`${on ? 'on' : ''} ${!supported ? 'disabled' : ''}`}
                              disabled={!supported}
                              onClick={() => supported && toggle(c.id)}
                              title={supported ? '' : 'Aucune intégration configurée'}>
                        <ChannelBadge ch={c.id} size={20}/>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeIntegrations.length === 0 && (
                <div style={{padding: 12, background: 'var(--bg-2)', borderRadius: 6, fontSize: 11.5, color: 'var(--warn)', borderLeft: '3px solid var(--warn)'}}>
                  ⚠️ Aucune intégration active. Rendez-vous dans Paramètres → Intégrations pour connecter vos comptes.
                </div>
              )}

              {activeIntegrations.length > 0 && (
                <div>
                  <div className="d-side-label">Intégrations qui seront utilisées</div>
                  <div style={{display: 'flex', gap: 5, flexWrap: 'wrap'}}>
                    {activeIntegrations.map(i => (
                      <span key={i.id} style={{padding: '3px 8px', background: 'var(--bg-3)', borderRadius: 3, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5}}>
                        <div className={`i-logo ${i.id}`} style={{width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 700}}>{i.name[0]}</div>
                        {i.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(phase === 'publishing' || phase === 'done') && (
            <div className="publish-progress">
              <div style={{fontSize: 12, color: 'var(--text-2)'}}>
                {phase === 'publishing'
                  ? <><span className="ai-loading" style={{borderTopColor: 'var(--accent)', width: 12, height: 12}}/> Publication en cours…</>
                  : <><IconCheck size={12}/> Terminé</>}
              </div>
              <div className="publish-log">
                {log.map((l, i) => (
                  <div key={i}>
                    <span className="l-ts">[{new Date(l.ts).toISOString().slice(11, 19)}]</span>{' '}
                    <span className={l.kind === 'err' ? 'l-err' : l.kind === 'warn' ? 'l-warn' : l.kind === 'info' ? 'l-info' : ''}>{l.msg}</span>
                  </div>
                ))}
              </div>
              {results && (
                <div style={{marginTop: 4}}>
                  {results.success.length > 0 && (
                    <div style={{fontSize: 11.5, color: 'var(--ok)'}}>
                      ✓ {results.success.length} publication(s) réussie(s) : {results.success.map(r => window.CD_DATA.channels[r.channel]?.label).join(', ')}
                    </div>
                  )}
                  {results.failed.length > 0 && (
                    <div style={{fontSize: 11.5, color: 'var(--danger)'}}>
                      ✗ Échec sur : {results.failed.map(ch => window.CD_DATA.channels[ch]?.label).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ws-edit-foot">
          {phase === 'config' && (
            <>
              <button className="btn ghost" onClick={onClose}>Annuler</button>
              <button className="btn primary" disabled={selected.length === 0} onClick={publish}>
                <IconSend/>Publier maintenant
              </button>
            </>
          )}
          {phase === 'done' && (
            <button className="btn primary" onClick={onClose}>
              <IconCheck/>Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Object.assign(window, { IntegrationsView, PublishDialog, INTEGRATIONS, loadIntegrations });

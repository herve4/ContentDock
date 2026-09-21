// Templates library + Recurring series
const { useState: useStateT, useMemo: useMemoT } = React;

// Templates seeded — user can create custom ones later
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-mondaymotiv',
    kind: 'series',
    name: 'Lundi motivation',
    desc: 'Série hebdo · publication chaque lundi 8h · citation + image inspirante',
    channel: 'ig',
    coverBg: 'linear-gradient(135deg, #f472b6, #a78bfa)',
    frequency: 'weekly',
    days: ['MON'],
    hour: 8,
    template: {
      title: '#MondayMotivation — [semaine]',
      body: '« [Citation forte de la semaine] »\n\n— [Auteur]\n\nBonne semaine à toutes et tous ✨',
      hashtags: ['mondaymotivation', 'inspiration', 'newweek'],
      status: 'idea',
    },
  },
  {
    id: 'tpl-friyay',
    kind: 'series',
    name: 'Récap vendredi',
    desc: 'Série hebdo · récap visuel des meilleures photos de la semaine',
    channel: 'ig',
    coverBg: 'linear-gradient(135deg, #4ade80, #2dd4bf)',
    frequency: 'weekly',
    days: ['FRI'],
    hour: 18,
    template: {
      title: 'La semaine chez [marque] — [semaine]',
      body: 'Retour sur les temps forts de la semaine ↓\n\n1. [Moment 1]\n2. [Moment 2]\n3. [Moment 3]\n\nOn se retrouve lundi ✌️',
      hashtags: ['weeklyrecap', 'friyay'],
      status: 'idea',
    },
  },
  {
    id: 'tpl-carousel-tips',
    kind: 'template',
    name: 'Carrousel 5 conseils',
    desc: '5 slides format « conseil de la semaine » — parfait pour éducation',
    channel: 'ig',
    coverBg: 'linear-gradient(135deg, #60a5fa, #7c3aed)',
    template: {
      title: '5 conseils pour [sujet]',
      body: 'Swipe pour découvrir les 5 conseils 👉',
      hashtags: ['tips', 'howto'],
      status: 'idea',
      slides: [
        { kind: 'cover', title: '5 conseils', subtitle: 'pour [sujet]' },
        { kind: 'text', title: '01', subtitle: '[Conseil 1]' },
        { kind: 'text', title: '02', subtitle: '[Conseil 2]' },
        { kind: 'text', title: '03', subtitle: '[Conseil 3]' },
        { kind: 'text', title: '04', subtitle: '[Conseil 4]' },
        { kind: 'cta', title: '05', subtitle: '[Conseil 5 + CTA]' },
      ],
    },
  },
  {
    id: 'tpl-quote',
    kind: 'template',
    name: 'Citation visuelle',
    desc: 'Post citation format carré · idéal Instagram feed',
    channel: 'ig',
    coverBg: 'linear-gradient(135deg, #131318, #52525b)',
    template: {
      title: 'Citation — [auteur]',
      body: '« [Citation] »\n\n— [Auteur]',
      hashtags: ['quote', 'wisdom'],
      status: 'idea',
    },
  },
  {
    id: 'tpl-li-story',
    kind: 'template',
    name: 'Storytelling LinkedIn',
    desc: 'Format hook + histoire + leçon + CTA — LinkedIn',
    channel: 'li',
    coverBg: 'linear-gradient(135deg, #0a66c2, #60a5fa)',
    template: {
      title: '[Titre accrocheur]',
      body: '[Hook fort — 1 phrase]\n\n[Contexte de l\'histoire — 2-3 phrases]\n\n[Point culminant]\n\nCe que j\'en retiens :\n1. [Leçon 1]\n2. [Leçon 2]\n3. [Leçon 3]\n\nEt vous, [question ouverte] ?',
      hashtags: ['linkedin', 'storytelling'],
      status: 'idea',
    },
  },
  {
    id: 'tpl-thread',
    kind: 'template',
    name: 'Thread X (Twitter)',
    desc: 'Format thread avec hook + points numérotés',
    channel: 'x',
    coverBg: 'linear-gradient(135deg, #0f172a, #52525b)',
    template: {
      title: 'Thread — [sujet]',
      body: '[Hook percutant — 1-2 lignes]\n\nun 🧵',
      hashtags: [],
      status: 'idea',
    },
  },
  {
    id: 'tpl-launch',
    kind: 'template',
    name: 'Lancement produit',
    desc: 'Annonce lancement · teaser + jour J + retour',
    channel: 'ig',
    coverBg: 'linear-gradient(135deg, #ff5a1f, #f472b6)',
    template: {
      title: '[Produit] — Jour J',
      body: '✨ C\'est le jour J ✨\n\n[Nom du produit] est enfin disponible.\n\n[Description courte — 2 phrases]\n\n🛒 Lien en bio',
      hashtags: ['launch', 'newproduct'],
      status: 'ready',
    },
  },
];

function loadTemplates() {
  try {
    const custom = JSON.parse(localStorage.getItem('cd-templates') || '[]');
    return [...DEFAULT_TEMPLATES, ...custom];
  } catch(e) { return DEFAULT_TEMPLATES; }
}

function saveTemplates(list) {
  const custom = list.filter(t => !DEFAULT_TEMPLATES.find(d => d.id === t.id));
  try { localStorage.setItem('cd-templates', JSON.stringify(custom)); } catch(e) {}
}

function TemplatesView({ workspaces, onUse, onToast }) {
  const [templates] = useStateT(() => loadTemplates());
  const [filter, setFilter] = useStateT('all');
  const filtered = templates.filter(t => filter === 'all' || t.kind === filter);

  return (
    <div>
      <div className="filter-bar">
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tous</button>
        <button className={`chip ${filter === 'template' ? 'active' : ''}`} onClick={() => setFilter('template')}>
          <IconLayers/>Templates ponctuels
        </button>
        <button className={`chip ${filter === 'series' ? 'active' : ''}`} onClick={() => setFilter('series')}>
          <IconClock/>Séries récurrentes
        </button>
        <span className="filter-count">{filtered.length} modèles</span>
        <button className="chip" style={{marginLeft: 'auto'}}>
          <IconPlus/>Nouveau template
        </button>
      </div>

      <div className="templates-grid">
        {filtered.map(t => (
          <TemplateCard key={t.id} t={t} onUse={() => onUse(t, workspaces)}/>
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ t, onUse }) {
  return (
    <div className="template-card" onClick={onUse}>
      <div className="t-cover" style={{ background: t.coverBg }}>
        <div className={`badge ${t.kind === 'series' ? 'series' : ''}`}>
          {t.kind === 'series' ? 'Série' : 'Template'}
        </div>
        <div style={{color: 'white', textAlign: 'center', padding: 20}}>
          <ChannelBadge ch={t.channel} size={32}/>
          <div style={{marginTop: 10, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', textShadow: '0 1px 2px rgba(0,0,0,.3)'}}>
            {t.name}
          </div>
        </div>
      </div>
      <div className="t-body">
        <div className="t-title">{t.name}</div>
        <div className="t-desc">{t.desc}</div>
        {t.kind === 'series' && (
          <div className="t-meta">
            <div className="series-day-strip">
              {['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map((d, i) => {
                const isActive = t.days?.includes(['MON','TUE','WED','THU','FRI','SAT','SUN'][i]);
                return <span key={d} className={`sday ${isActive ? 'active' : ''}`}>{d[0]}</span>;
              })}
            </div>
            <span style={{color: 'var(--text-3)'}}>·</span>
            <span>{String(t.hour).padStart(2, '0')}:00</span>
          </div>
        )}
        {t.kind === 'template' && t.template.slides && (
          <div className="t-meta">
            <IconLayers size={11}/> {t.template.slides.length} slides
          </div>
        )}
      </div>
    </div>
  );
}

// Instantiate a template into a draft or a series of drafts
function instantiateTemplate(tpl, wsId, options = {}) {
  const base = tpl.template;
  const now = new Date();

  if (tpl.kind === 'series') {
    // Create 4 upcoming occurrences (4 weeks)
    const drafts = [];
    const dayNumMap = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
    for (let week = 0; week < 4; week++) {
      for (const dayCode of tpl.days) {
        const target = new Date(now);
        const dayNum = dayNumMap[dayCode];
        const daysUntil = (dayNum - now.getDay() + 7) % 7 || 7;
        target.setDate(now.getDate() + daysUntil + (week * 7));
        drafts.push({
          id: 'd-' + Date.now() + '-' + week + '-' + dayCode,
          ws: wsId,
          title: base.title.replace('[semaine]', `S${getWeekNum(target)}`),
          body: base.body,
          variants: {},
          hashtags: base.hashtags || [],
          images: [],
          status: base.status || 'idea',
          channel: tpl.channel,
          tags: [],
          scheduled: { day: target.getDate(), hour: tpl.hour },
          seriesId: tpl.id,
          seriesName: tpl.name,
        });
      }
    }
    return drafts;
  } else {
    // Single template instance
    return [{
      id: 'd-' + Date.now(),
      ws: wsId,
      title: base.title,
      body: base.body,
      variants: {},
      hashtags: base.hashtags || [],
      images: [],
      status: base.status || 'idea',
      channel: tpl.channel,
      tags: [],
      scheduled: null,
      slides: base.slides,
      templateOf: tpl.id,
    }];
  }
}

function getWeekNum(d) {
  const j1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - j1) / 86400000 + j1.getDay() + 1) / 7);
}

Object.assign(window, { TemplatesView, DEFAULT_TEMPLATES, instantiateTemplate });

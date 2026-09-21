// Interactive onboarding tour
const { useState: useStateOb, useEffect: useEffectOb } = React;

const STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenue dans ContentDock',
    body: 'Un dock unique pour capturer, organiser et planifier textes et visuels — quel que soit votre métier.',
    kbd: null,
    spotlight: null,
    position: 'center',
  },
  {
    id: 'paste-anywhere',
    title: 'Collez n\'importe où',
    body: 'Copiez une image, un texte, un PDF, un document Word ou un snippet de code — puis pressez ⌘V n\'importe où dans l\'app. La capture s\'ouvre pré-remplie automatiquement.',
    kbd: ['⌘V', 'ou', 'Ctrl+V'],
    spotlight: null,
    position: 'center',
  },
  {
    id: 'capture',
    title: 'Ou déclenchez la capture manuellement',
    body: 'Le bouton "Capturer" (en haut à droite) ouvre la modal. Vous pouvez aussi presser V.',
    kbd: ['V'],
    spotlight: () => document.querySelector('.capture-btn'),
    position: 'top-right',
  },
  {
    id: 'cmdk',
    title: 'Command palette ⌘K',
    body: 'Cherchez tout : brouillons, espaces, actions, vues. Navigation clavier ↑↓↵.',
    kbd: ['⌘K'],
    spotlight: () => document.querySelector('.top-search'),
    position: 'top',
  },
  {
    id: 'views',
    title: '4 vues + Analytics + Queue',
    body: 'Storyboard visuel · Kanban par statut · Liste dense · Calendrier drag & drop. Les espaces CM débloquent la file d\'attente et les stats.',
    kbd: ['G', 'K', 'L', 'C'],
    spotlight: () => document.querySelector('.view-tabs'),
    position: 'top-right',
  },
  {
    id: 'domains',
    title: 'Chaque métier a son espace',
    body: 'Community management, direction artistique, développement — chaque espace adapte automatiquement ses outils (mockups, palettes, snippets code).',
    kbd: null,
    spotlight: () => document.querySelector('.sidebar'),
    position: 'left',
  },
];

function Onboarding({ onFinish }) {
  const [step, setStep] = useStateOb(0);
  const [spot, setSpot] = useStateOb(null);
  const s = STEPS[step];

  useEffectOb(() => {
    if (!s.spotlight) { setSpot(null); return; }
    const el = s.spotlight();
    if (el) {
      const r = el.getBoundingClientRect();
      setSpot({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
    } else {
      setSpot(null);
    }
  }, [step]);

  const cardStyle = (() => {
    if (s.position === 'center' || !spot) return {};
    if (s.position === 'top') {
      return { top: spot.top + spot.height + 20, left: spot.left + spot.width/2 - 200 };
    }
    if (s.position === 'top-right') {
      return { top: spot.top + spot.height + 20, right: window.innerWidth - spot.left - spot.width - 20 + 20 };
    }
    if (s.position === 'left') {
      return { top: spot.top + 40, left: spot.left + spot.width + 20 };
    }
    return {};
  })();

  const finish = () => {
    localStorage.setItem('cd-onboarded', '1');
    onFinish();
  };

  return (
    <>
      <div className="onboard-backdrop"/>
      {spot && <div className="onboard-spotlight" style={{top: spot.top, left: spot.left, width: spot.width, height: spot.height}}/>}
      <div className={`onboard-card ${s.position === 'center' ? 'center' : ''}`} style={cardStyle}>
        <div className="step-dot">
          <span>{String(step+1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
        </div>
        <h3>{s.title}</h3>
        <p>{s.body}</p>
        {s.kbd && (
          <div className="kbd-demo">
            <IconCommand size={14} stroke="var(--text-3)"/>
            <span>Raccourci :</span>
            {s.kbd.map((k, i) => (
              /^(ou|et|\+)$/i.test(k)
                ? <span key={i} style={{color:'var(--text-4)'}}>{k}</span>
                : <kbd key={i}>{k}</kbd>
            ))}
          </div>
        )}
        <div className="onboard-foot">
          <div className="steps">
            {STEPS.map((_, i) => <span key={i} className={i === step ? 'active' : ''}/>)}
          </div>
          <div className="fill"/>
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Précédent</button>}
          <button className="btn ghost" onClick={finish}>Passer</button>
          {step < STEPS.length - 1
            ? <button className="btn primary" onClick={() => setStep(step + 1)}>Suivant <IconChevronRight size={12}/></button>
            : <button className="btn primary" onClick={finish}><IconCheck size={12}/>Commencer</button>}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Onboarding, ONBOARDING_STEPS: STEPS });

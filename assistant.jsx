// Assistant script : X thread + LinkedIn storytelling multi-parts
const { useState: useStateAs, useEffect: useEffectAs } = React;

async function generateXThread(source) {
  const helper = window.genspark?.complete || window.claude?.complete;
  if (!helper) throw new Error('LLM helper unavailable');
  const prompt = `Tu es rédacteur social media expert des threads Twitter/X.

À partir du sujet ou du contenu ci-dessous, écris un thread X de 5 à 8 tweets.

RÈGLES:
- Tweet 1 = hook percutant (max 260 caractères, doit donner envie de lire la suite)
- Tweets 2 à N-1 = un point clé par tweet, format court, max 260 caractères
- Dernier tweet = conclusion + CTA (question, invitation à commenter/RT)
- Chaque tweet doit tenir seul, mais former une progression logique
- Ton direct, minuscules privilégiées, 1-2 émojis pertinents max par tweet
- PAS de numérotation (1/, 2/) — le contexte fait le job

FORMAT DE SORTIE STRICT — JSON UNIQUEMENT, pas de préambule :
{"tweets": ["tweet 1 (hook)", "tweet 2", "tweet 3", "…", "tweet final (CTA)"]}

SUJET / CONTENU SOURCE :
${source}

JSON:`;
  const raw = await helper(prompt);
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed.tweets || [];
  } catch(e) {
    // Fallback: split by lines
    return cleaned.split('\n').map(l => l.replace(/^\d+[\/.]?\s*/, '').trim()).filter(Boolean).slice(0, 10);
  }
}

async function generateLinkedInStory(source) {
  const helper = window.genspark?.complete || window.claude?.complete;
  if (!helper) throw new Error('LLM helper unavailable');
  const prompt = `Tu es rédacteur LinkedIn expert du storytelling professionnel.

À partir du sujet ci-dessous, écris un post LinkedIn structuré en 4 parties :
1. HOOK (1-2 phrases fortes, incitent à cliquer "voir plus")
2. HISTOIRE (3-5 phrases, mise en contexte concrète)
3. LEÇONS (3 points numérotés, format actionnable)
4. CTA (1 question ouverte pour susciter l'engagement en commentaires)

RÈGLES:
- Ton pro mais humain, phrases courtes, pas d'émojis en début de ligne
- 1500-2500 caractères au total
- Respecte les sauts de ligne (LinkedIn valorise le blanc)
- PAS de hashtags en corps de texte (juste 3-5 à la toute fin)

FORMAT DE SORTIE STRICT — JSON UNIQUEMENT, pas de préambule :
{
  "hook": "phrase(s) d'accroche",
  "story": "histoire complète en 3-5 phrases",
  "lessons": ["leçon 1", "leçon 2", "leçon 3"],
  "cta": "question ouverte finale",
  "hashtags": ["tag1", "tag2", "tag3"]
}

SUJET SOURCE :
${source}

JSON:`;
  const raw = await helper(prompt);
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch(e) {
    return { hook: '', story: cleaned, lessons: [], cta: '', hashtags: [] };
  }
}

function ScriptAssistantView({ workspaces, onCreate, onToast }) {
  const [source, setSource] = useStateAs('');
  const [format, setFormat] = useStateAs('thread'); // thread | li-story
  const [loading, setLoading] = useStateAs(false);
  const [result, setResult] = useStateAs(null);
  const [ws, setWs] = useStateAs(workspaces[0]?.id);

  const run = async () => {
    if (!source.trim()) { onToast('Ajoutez un sujet ou un contenu source'); return; }
    setLoading(true); setResult(null);
    try {
      if (format === 'thread') {
        const tweets = await generateXThread(source);
        setResult({ kind: 'thread', tweets });
      } else {
        const story = await generateLinkedInStory(source);
        setResult({ kind: 'li-story', ...story });
      }
      onToast(`${format === 'thread' ? 'Thread' : 'Post LinkedIn'} généré ✨`);
    } catch(e) {
      onToast('Génération impossible : ' + (e.message || 'erreur'));
    } finally { setLoading(false); }
  };

  const createDraft = () => {
    if (!result) return;
    let draft;
    if (result.kind === 'thread') {
      const body = result.tweets.join('\n\n---\n\n');
      draft = {
        id: 'new-' + Date.now(),
        ws,
        title: (result.tweets[0] || 'Thread X').slice(0, 80),
        body,
        variants: { x: result.tweets[0] },
        thread: result.tweets,
        hashtags: [],
        images: [],
        status: 'ready',
        channel: 'x',
        tags: [],
        scheduled: null,
      };
    } else {
      const body = `${result.hook}\n\n${result.story}\n\nCe que j'en retiens :\n${result.lessons.map((l, i) => `${i+1}. ${l}`).join('\n')}\n\n${result.cta}\n\n${result.hashtags.map(h => '#'+h).join(' ')}`;
      draft = {
        id: 'new-' + Date.now(),
        ws,
        title: result.hook.slice(0, 80),
        body,
        variants: { li: body },
        hashtags: result.hashtags || [],
        images: [],
        status: 'ready',
        channel: 'li',
        tags: [],
        scheduled: null,
      };
    }
    onCreate(draft);
    onToast('Brouillon créé — ouvrez-le pour le personnaliser');
    setSource(''); setResult(null);
  };

  return (
    <div className="script-assistant">
      <div style={{marginBottom: 20}}>
        <h2 style={{margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em'}}>Assistant script</h2>
        <div style={{color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5}}>
          Donnez un sujet ou une idée — l'IA génère un thread X complet ou un post LinkedIn structuré (hook + histoire + leçons + CTA).
        </div>
      </div>

      <div className="script-input">
        <textarea value={source} onChange={e => setSource(e.target.value)}
                  placeholder="Ex: J'ai passé 3 mois à refondre l'onboarding de notre app SaaS. Voici ce que j'ai appris."
                  disabled={loading}/>
        <div className="script-format-picker">
          <button className={`script-fp-btn ${format === 'thread' ? 'on' : ''}`}
                  onClick={() => setFormat('thread')}>
            <span className="ch-mini channel-x">𝕏</span>
            Thread X
          </button>
          <button className={`script-fp-btn ${format === 'li-story' ? 'on' : ''}`}
                  onClick={() => setFormat('li-story')}>
            <span className="ch-mini channel-li">in</span>
            Storytelling LinkedIn
          </button>
          <div style={{flex: 1}}/>
          <span style={{color: 'var(--text-4)', fontSize: 10.5, whiteSpace: 'nowrap'}}>
            {source.length} car
          </span>
          <button className="btn primary" onClick={run} disabled={loading || !source.trim()}>
            {loading ? <><span className="ai-loading"/>Génération…</> : <><IconSparkles/>Générer</>}
          </button>
        </div>
      </div>

      {loading && (
        <div className="script-loading">
          <div>L'IA rédige votre {format === 'thread' ? 'thread' : 'post'}…</div>
          <div className="dots"><span/><span/><span/></div>
        </div>
      )}

      {result?.kind === 'thread' && (
        <>
          <div style={{marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8}}>
            <ChannelBadge ch="x" size={16}/>
            <span style={{fontSize: 13, fontWeight: 600}}>Thread généré · {result.tweets.length} tweets</span>
            <div style={{flex: 1}}/>
            <button className="btn ghost" onClick={run}>
              <IconSparkles/>Régénérer
            </button>
            <button className="btn primary" onClick={createDraft}>
              <IconPlus/>Créer le brouillon
            </button>
          </div>
          <div className="thread-tweets">
            {result.tweets.map((t, i) => (
              <div key={i} className="thread-tweet">
                <div className="idx">{i+1}/{result.tweets.length}</div>
                <div className="txt">{t}</div>
                <div className={`count ${t.length > 280 ? 'over' : ''}`}>
                  {t.length} / 280 car
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {result?.kind === 'li-story' && (
        <>
          <div style={{marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8}}>
            <ChannelBadge ch="li" size={16}/>
            <span style={{fontSize: 13, fontWeight: 600}}>Post LinkedIn structuré</span>
            <div style={{flex: 1}}/>
            <button className="btn ghost" onClick={run}>
              <IconSparkles/>Régénérer
            </button>
            <button className="btn primary" onClick={createDraft}>
              <IconPlus/>Créer le brouillon
            </button>
          </div>
          <div className="li-story">
            <div className="hook">{result.hook}</div>
            {result.story}
            {result.lessons?.length > 0 && (
              <>
                {'\n\n'}<b>Ce que j'en retiens :</b>{'\n'}
                {result.lessons.map((l, i) => `${i+1}. ${l}\n`).join('')}
              </>
            )}
            {'\n'}{result.cta}
            {result.hashtags?.length > 0 && (
              <div style={{marginTop: 12, color: '#0a66c2', fontSize: 12.5}}>
                {result.hashtags.map(h => '#' + h).join(' ')}
              </div>
            )}
            <div style={{marginTop: 10, fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)'}}>
              ~{(result.hook + result.story + result.lessons.join('') + result.cta).length} caractères
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { ScriptAssistantView, generateXThread, generateLinkedInStory });

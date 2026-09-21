// Import screenshots (IG/LinkedIn/X) → OCR → draft
// Improved pipeline: image preprocessing + smart cleaning + optional LLM refine
const { useState: useStateOcr, useEffect: useEffectOcr, useRef: useRefOcr } = React;

let _tessLoading;
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (_tessLoading) return _tessLoading;
  _tessLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _tessLoading;
}

// ============ 1. IMAGE PREPROCESSING ============
// Upscale small images, convert to grayscale, boost contrast — all boost OCR accuracy
async function preprocessImage(file) {
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = URL.createObjectURL(file);
  });

  // Target width around 1200-1600px for optimal OCR
  const targetW = Math.min(1600, Math.max(1200, img.naturalWidth * 2));
  const scale = targetW / img.naturalWidth;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  // Grayscale + adaptive contrast
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;
  for (let i = 0; i < px.length; i += 4) {
    // Luminance
    let g = 0.299 * px[i] + 0.587 * px[i+1] + 0.114 * px[i+2];
    // Boost contrast (sigmoid around 128)
    g = 255 / (1 + Math.exp(-(g - 128) / 32));
    g = Math.max(0, Math.min(255, g));
    px[i] = px[i+1] = px[i+2] = g;
  }
  ctx.putImageData(imgData, 0, 0);

  return new Promise(res => canvas.toBlob(res, 'image/png'));
}

// ============ 2. PLATFORM DETECTION ============
function detectPlatform(text) {
  const t = text.toLowerCase();
  let scores = { ig: 0, li: 0, x: 0, tt: 0, fb: 0 };
  // Instagram signals
  if (/liked by|likes?$|see (all|more) comments|view all \d+ comments/im.test(t)) scores.ig += 3;
  if (/^reels?$|^explore$|^stories$/im.test(t)) scores.ig += 3;
  if (/^\d+\s*(likes?|comments?)$/im.test(t)) scores.ig += 2;
  // LinkedIn signals
  if (/followers?|connections?|\d+ (mo|w|d|h) •/i.test(t)) scores.li += 3;
  if (/(reactions?|reposts?|comments?)\b.*\d/i.test(t)) scores.li += 2;
  if (/promoted|sponsored/i.test(t)) scores.li += 1;
  if (/•\s*(1er|2e|3e)|• 1st|• 2nd|• 3rd/i.test(t)) scores.li += 3;
  // X (Twitter) signals
  if (/·\s*\d+[hms]$|retweeted|quote (tweet|post)/i.test(t)) scores.x += 3;
  if (/replying to @/i.test(t)) scores.x += 3;
  // TikTok
  if (/for you|following.*\|.*for you|#foryou/i.test(t)) scores.tt += 3;
  if (/\d+\.\d+[km]?\s*(likes?|shares?)/i.test(t)) scores.tt += 2;

  const best = Object.entries(scores).sort((a,b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'ig';
}

// ============ 3. SMART CLEANING ============
// Strip UI chrome, remove OCR noise, fuse fragmented lines
function cleanText(rawText, platform) {
  let lines = rawText.split(/\r?\n/).map(l => l.trim());

  // Remove OCR-noise lines: too short with low signal, or dominated by symbols
  const noisePatterns = [
    /^[·•·\-\|\/\\\.,;:!\?\s]+$/,               // pure punctuation
    /^[a-z]{1,2}$/i,                              // 1-2 letter fragments
    /^\W+$/,                                       // no word chars
    /^\d{1,3}\s*[·•]?\s*$/,                       // stray numbers
  ];
  // Chrome patterns per platform + generic
  const chromeGeneric = [
    /^(like|comment|share|save|reply|repost|send|bookmark|more)$/i,
    /^(following|followers?)$/i,
    /^\d+\s*(likes?|comments?|shares?|reposts?|views?|followers?|retweets?)$/i,
    /^see (all|more)( comments?)?$/i,
    /^view all \d+ comments?$/i,
    /^show( this thread| more)$/i,
    /^\d+[wdhm]\s*(ago)?$/i,          // "2h ago", "3d"
    /^\d+\s*(minutes?|hours?|days?|weeks?|months?)\s*(ago)?$/i,
    /^(edited|traduire|translate|see translation|voir la traduction)$/i,
    /^(sponsored|promoted|promu|sponsorisé)$/i,
    /^\.\.\.\s*more$/i,
    /^(add a comment|ajouter un commentaire|write a comment|écrire un commentaire).*$/i,
  ];
  const chromePlatform = {
    ig: [
      /^(reels?|explore|home|search|shop|profile)$/i,
      /^liked by\b/i,
      /^\d+ likes?$/i,
    ],
    li: [
      /^(activate premium|see more|show more|voir plus)$/i,
      /^\d+ reactions? \d+ comments?$/i,
      /^(1er|2e|3e|1st|2nd|3rd)°?$/i,
      /^promoted$/i,
    ],
    x: [
      /^\d+ (repost|quote|like|bookmark|view)s?$/i,
      /^(retweeted|quote tweet)$/i,
      /^show this thread$/i,
    ],
    tt: [
      /^(for you|following)$/i,
      /^\d+\.\d+[km]?$/i,
    ],
  };
  const allNoise = [...noisePatterns, ...chromeGeneric, ...(chromePlatform[platform] || [])];

  lines = lines.filter(l => {
    if (!l) return false;
    if (allNoise.some(re => re.test(l))) return false;
    // High-symbol-ratio noise
    const wordChars = (l.match(/[\p{L}\d]/gu) || []).length;
    const totalChars = l.length;
    if (totalChars > 5 && wordChars / totalChars < 0.35) return false;
    // Only 1 word AND fewer than 3 letters total = probably noise
    if (l.split(/\s+/).length === 1 && wordChars < 3) return false;
    return true;
  });

  // Fuse lines that belong to the same paragraph (short lines followed by content)
  const fused = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const last = fused[fused.length - 1];
    // If current line doesn't start with capital/emoji and previous doesn't end with punctuation, fuse
    if (last
        && !/[.!?…»"']\s*$/.test(last)
        && !/^[A-ZÀ-Ÿ0-9•·\-\*#@🎉✨💡🔥]/.test(cur)
        && cur.length < 80) {
      fused[fused.length - 1] = last + ' ' + cur;
    } else {
      fused.push(cur);
    }
  }

  // Deduplicate consecutive identical lines (OCR sometimes duplicates)
  const deduped = fused.filter((l, i) => l !== fused[i-1]);

  return deduped.join('\n').trim();
}

// ============ 4. AUTHOR / METADATA extraction ============
function extractMetadata(text) {
  const firstLines = text.split('\n').slice(0, 4).join(' ');
  // Author name = first Capitalized Words sequence
  const authorMatch = firstLines.match(/^([A-ZÀ-Ÿ][\wÀ-ÿ'\-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'\-]+){0,3})\b/);
  const author = authorMatch?.[1];
  // Bio = LinkedIn "Job title | Company | ..." pattern
  const bioMatch = text.match(/\|\s*.+?\s*\|/);
  const bio = bioMatch?.[0].replace(/^\||\|$/g, '').trim();
  // Followers
  const followersMatch = text.match(/(\d[\d\s.,]*)\s*(abonnés|followers)/i);
  const followers = followersMatch?.[1]?.replace(/\s/g, '');
  return { author, bio, followers };
}

function extractSocialElements(text) {
  const hashtags = (text.match(/#[\p{L}\d_]+/gu) || [])
    .map(h => h.slice(1))
    .filter(h => h.length >= 2 && h.length <= 40);
  const mentions = (text.match(/@[\p{L}\d._-]+/gu) || [])
    .map(m => m.slice(1))
    .filter(m => m.length >= 2 && m.length <= 30);
  return {
    hashtags: [...new Set(hashtags)].slice(0, 30),
    mentions: [...new Set(mentions)].slice(0, 15),
  };
}

// ============ 5. LLM REFINE (optional, high quality) ============
async function refineWithLLM(rawText, platform) {
  const helper = window.genspark?.complete || window.claude?.complete;
  if (!helper) return null;

  const prompt = `Tu reçois un texte OCR brut extrait d'un screenshot ${platform.toUpperCase()}. Il contient probablement :
- Le vrai contenu du post (ce qu'on veut garder)
- Du bruit OCR (caractères mal reconnus, fragments)
- Des éléments d'UI (compteurs, boutons)

TÂCHE : Reconstruis le post original en enlevant TOUT le bruit et le chrome UI. Ne réécris pas — reconstitue seulement ce qui était le texte du post. Si tu identifies l'auteur, tu peux le mentionner en préambule.

RÈGLES STRICTES :
- Ne rajoute AUCUN mot qui n'était pas dans le texte source (sauf pour corriger de vraies fautes OCR évidentes)
- Conserve les emojis et hashtags s'ils étaient présents
- Format de sortie JSON UNIQUEMENT (pas de préambule, pas de backticks) :
{
  "author": "nom de l'auteur si identifiable, sinon null",
  "role": "titre/rôle si identifiable, sinon null",
  "cleaned_text": "le texte du post reconstruit proprement",
  "hashtags": ["tag1", "tag2"],
  "mentions": ["user1", "user2"],
  "confidence": "high|medium|low"
}

TEXTE OCR BRUT :
${rawText.slice(0, 2500)}

JSON:`;

  try {
    const raw = await helper(prompt);
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch(e) {
    console.warn('LLM refine failed:', e);
    return null;
  }
}

// ============ MAIN COMPONENT ============
function ImportView({ workspaces, onCreate, onToast }) {
  const [file, setFile] = useStateOcr(null);
  const [imgUrl, setImgUrl] = useStateOcr(null);
  const [progress, setProgress] = useStateOcr(0);
  const [phase, setPhase] = useStateOcr('idle'); // idle | preprocess | ocr | refine | done
  const [result, setResult] = useStateOcr(null);
  const [dragOver, setDragOver] = useStateOcr(false);
  const [ws, setWs] = useStateOcr(workspaces[0]?.id);
  const [useLLM, setUseLLM] = useStateOcr(true);

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) {
      onToast('Merci de sélectionner une image (screenshot)');
      return;
    }
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setPhase('preprocess');
    setProgress(0);

    try {
      // 1. Preprocess image for better OCR
      const preprocessed = await preprocessImage(f);

      // 2. Load Tesseract + run OCR
      const Tesseract = await loadTesseract();
      setPhase('ocr');
      const { data } = await Tesseract.recognize(preprocessed, 'eng+fra', {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(m.progress);
        },
      });
      const rawText = (data.text || '').trim();

      // 3. Detect platform + clean text (deterministic)
      const platform = detectPlatform(rawText);
      const cleaned = cleanText(rawText, platform);
      const { hashtags, mentions } = extractSocialElements(cleaned);
      const meta = extractMetadata(cleaned);

      let refined = null;
      if (useLLM && rawText.length > 30) {
        setPhase('refine');
        refined = await refineWithLLM(rawText, platform);
      }

      setResult({
        rawText,
        cleaned,
        platform,
        hashtags,
        mentions,
        meta,
        refined,
        confidence: data.confidence || 0,
      });
      setPhase('done');
      onToast(`Import réussi : ${platform.toUpperCase()}${refined ? ' + IA' : ''}`);
    } catch(e) {
      console.error(e);
      onToast('Erreur OCR : ' + (e.message || 'inconnu'));
      setPhase('idle');
    }
  };

  const create = () => {
    if (!result) return;
    const text = result.refined?.cleaned_text || result.cleaned;
    const hashtags = result.refined?.hashtags?.length ? result.refined.hashtags : result.hashtags;
    const mentions = result.refined?.mentions || result.mentions;
    const author = result.refined?.author || result.meta?.author;

    const draft = {
      id: 'new-' + Date.now(),
      ws,
      title: (text.split('\n').find(l => l.trim().length > 10 && l.trim().length < 100) || (author ? `Post de ${author}` : 'Post importé')).slice(0, 80),
      body: text,
      variants: { [result.platform]: text },
      hashtags,
      images: [imgUrl],
      status: 'idea',
      channel: result.platform,
      tags: [],
      scheduled: null,
      importedFrom: {
        platform: result.platform,
        author,
        confidence: result.confidence,
        via: result.refined ? 'llm-refined' : 'ocr-only',
      },
    };
    onCreate(draft);
  };

  return (
    <div className="import-view">
      <div style={{marginBottom: 20}}>
        <h2 style={{margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em'}}>Importer un post existant</h2>
        <div style={{color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5}}>
          Glissez un screenshot d'Instagram, LinkedIn, X ou TikTok — pré-traitement image, OCR bilingue,
          nettoyage smart, puis affinage par IA pour un rendu propre.
        </div>
      </div>

      {phase === 'idle' && (
        <>
          <div className={`import-dropzone ${dragOver ? 'drag' : ''}`}
               onDragOver={e => { e.preventDefault(); setDragOver(true); }}
               onDragLeave={() => setDragOver(false)}
               onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
               onClick={() => document.getElementById('import-file').click()}>
            <IconUpload/>
            <div className="big">Déposer un screenshot ou cliquer</div>
            <div>PNG, JPG, WebP · qualité originale recommandée (non compressée)</div>
            <div className="platforms">
              <span className="pill"><ChannelBadge ch="ig" size={12}/>Instagram</span>
              <span className="pill"><ChannelBadge ch="li" size={12}/>LinkedIn</span>
              <span className="pill"><ChannelBadge ch="x" size={12}/>X</span>
              <span className="pill"><ChannelBadge ch="tt" size={12}/>TikTok</span>
            </div>
            <input id="import-file" type="file" accept="image/*" style={{display: 'none'}}
                   onChange={e => handleFile(e.target.files[0])}/>
          </div>

          <div style={{marginTop: 16, padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12}}>
            <IconSparkles size={16} stroke="var(--accent)"/>
            <div style={{flex: 1}}>
              <div style={{fontSize: 12.5, color: 'var(--text)', fontWeight: 500}}>Affinage IA (recommandé)</div>
              <div style={{fontSize: 11, color: 'var(--text-3)', marginTop: 2}}>
                Après l'OCR, envoyer le texte à l'IA pour un nettoyage sémantique de qualité (auteur, structure).
              </div>
            </div>
            <div className={`tswitch ${useLLM ? 'on' : ''}`} onClick={() => setUseLLM(!useLLM)}/>
          </div>

          <div style={{marginTop: 12, padding: 10, background: 'var(--bg-1)', border: '1px dashed var(--line-strong)', borderRadius: 6, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5}}>
            💡 <b style={{color: 'var(--text-2)'}}>Astuce</b> — pour de meilleurs résultats : screenshot du post seul (pas de contexte autour),
            à haute résolution, texte bien lisible. Évitez les captures floues, très petites ou trop compressées.
          </div>
        </>
      )}

      {(phase === 'preprocess' || phase === 'ocr' || phase === 'refine') && (
        <div className="ocr-progress">
          <div style={{fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text)'}}>
            Analyse en cours…
          </div>
          <div style={{fontSize: 12, color: 'var(--text-3)', marginBottom: 12}}>
            {phase === 'preprocess' && 'Pré-traitement de l\'image (upscale + contraste)…'}
            {phase === 'ocr' && `Extraction du texte (${Math.round(progress * 100)} %)`}
            {phase === 'refine' && 'Affinage sémantique par IA…'}
          </div>
          <div className="bar">
            <div className="bar-fill" style={{
              width: `${phase === 'preprocess' ? 10 : phase === 'ocr' ? 15 + progress * 70 : 90}%`
            }}/>
          </div>
          <div style={{marginTop: 16}}>
            <StepItem label="Pré-traitement image (upscale, contraste, N&B)"
                      state={phase === 'preprocess' ? 'active' : 'done'}/>
            <StepItem label="Reconnaissance texte OCR (multilingue FR + EN)"
                      state={phase === 'ocr' ? 'active' : (phase === 'refine' || phase === 'done' ? 'done' : 'pending')}/>
            <StepItem label="Nettoyage smart : suppression UI + fragments"
                      state={phase === 'refine' ? 'done' : 'pending'}/>
            <StepItem label={useLLM ? 'Affinage sémantique IA (auteur, structure)' : 'Affinage IA désactivé'}
                      state={phase === 'refine' ? 'active' : 'pending'}/>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <>
          <div className="ocr-result">
            <div className="src-preview">
              <img src={imgUrl} alt=""/>
            </div>
            <div className="extract">
              <div style={{display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap'}}>
                <ChannelBadge ch={result.platform} size={18}/>
                <span style={{fontSize: 13, fontWeight: 600}}>{window.CD_DATA.channels[result.platform]?.label} détecté</span>
                <span className="ocr-badge">OCR {Math.round(result.confidence)}%</span>
                {result.refined && (
                  <span className="ocr-badge" style={{background: 'linear-gradient(135deg, #7c3aed, #ec4899)', color: 'white'}}>
                    ✨ Affiné IA · {result.refined.confidence}
                  </span>
                )}
                {(result.refined?.author || result.meta?.author) && (
                  <span className="ocr-badge">@{(result.refined?.author || result.meta.author).replace(/\s+/g, '.').toLowerCase()}</span>
                )}
              </div>

              <h4>{result.refined ? 'Texte reconstruit par IA' : 'Texte nettoyé'}</h4>
              <div className="extract-text">{result.refined?.cleaned_text || result.cleaned}</div>

              {((result.refined?.hashtags?.length || result.hashtags.length) > 0) && (
                <>
                  <h4 style={{marginTop: 14}}>Hashtags</h4>
                  <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    {(result.refined?.hashtags || result.hashtags).map(h => <span key={h} className="tag-pill">#{h}</span>)}
                  </div>
                </>
              )}
              {((result.refined?.mentions?.length || result.mentions.length) > 0) && (
                <>
                  <h4 style={{marginTop: 12}}>Mentions</h4>
                  <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    {(result.refined?.mentions || result.mentions).map(m => <span key={m} className="tag-pill">@{m}</span>)}
                  </div>
                </>
              )}

              <details style={{marginTop: 14}}>
                <summary style={{cursor: 'pointer', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)'}}>
                  Voir le texte OCR brut ({result.rawText.length} car.)
                </summary>
                <pre style={{marginTop: 8, padding: 10, background: 'var(--bg-2)', borderRadius: 4, fontSize: 10.5, maxHeight: 200, overflow: 'auto', color: 'var(--text-3)', whiteSpace: 'pre-wrap'}}>
                  {result.rawText}
                </pre>
              </details>
            </div>
          </div>

          <div style={{display: 'flex', gap: 10, marginTop: 16, alignItems: 'center'}}>
            <div style={{flex: 1}}>
              <div className="d-side-label">Créer dans l'espace</div>
              <select className="settings-input" style={{width: '100%'}} value={ws} onChange={e => setWs(e.target.value)}>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button className="btn ghost" onClick={() => { setPhase('idle'); setResult(null); setFile(null); setImgUrl(null); }}>
              Recommencer
            </button>
            <button className="btn primary" onClick={create}>
              <IconPlus/>Créer le brouillon
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StepItem({ label, state }) {
  return (
    <div className={`step ${state === 'active' ? 'active' : state === 'done' ? 'done' : ''}`}>
      <span className="icon-slot">
        {state === 'active'
          ? <span className="ai-loading" style={{borderTopColor: 'var(--accent)'}}/>
          : state === 'done'
            ? <IconCheck size={12}/>
            : '·'}
      </span>
      {label}
    </div>
  );
}

Object.assign(window, { ImportView, loadTesseract, preprocessImage, cleanText, detectPlatform });

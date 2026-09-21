// Extended mockups + Queue + Snippet viewer + Moodboard
const { useState: useStateX, useMemo: useMemoX } = React;

// ================= CAROUSEL IG (multi-slides) =================
function CarouselMockup({ draft }) {
  const [cur, setCur] = useStateX(0);
  const slides = draft.slides || draft.images.map((img, i) => ({ kind: 'image', bg: img, title: `Slide ${i+1}` }));
  const total = slides.length;

  return (
    <div className="carousel-mockup">
      <div className="carousel-slides-wrap">
        {slides.map((s, i) => (
          <CarouselSlide key={i} s={s} idx={i} total={total} hidden={i !== cur}/>
        ))}
        <div className="cs-slide-num">{cur + 1} / {total}</div>
        {cur > 0 && <button className="carousel-nav prev" onClick={() => setCur(cur - 1)}><IconChevronLeft size={16}/></button>}
        {cur < total - 1 && <button className="carousel-nav next" onClick={() => setCur(cur + 1)}><IconChevronRight size={16}/></button>}
        <div className="carousel-dots">
          {slides.map((_, i) => <span key={i} className={`dot ${i === cur ? 'active' : ''}`}/>)}
        </div>
      </div>
      <div className="mockup-ig-actions" style={{padding:'8px 12px 4px'}}>
        <IconHeart/><IconMessageCircle/><IconSend/>
        <div style={{flex:1}}/>
        <IconBookmark/>
      </div>
      <div className="mockup-ig-caption">
        <strong>aureliaskin</strong>
        {draft.variants?.ig || draft.body}
      </div>
      <div className="carousel-thumbs">
        {slides.map((s, i) => (
          <div key={i} className={`carousel-thumb ${i === cur ? 'active' : ''}`} onClick={() => setCur(i)}>
            <div className="idx">{i+1}</div>
            {s.bg ? <img src={s.bg} alt=""/> : <div style={{width:'100%', height:'100%', background:'var(--bg-4)', display:'grid', placeItems:'center', color:'var(--text-3)', fontSize:10, fontFamily:'var(--mono)'}}>{s.kind}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CarouselSlide({ s, idx, total, hidden }) {
  const cls = `carousel-slide ${s.kind || 'image'} ${s.bg ? 'bg-img' : ''} ${hidden ? 'hidden' : ''}`;
  return (
    <div className={cls}>
      {s.bg && <img className="bg" src={s.bg} alt=""/>}
      {s.title && <div className="cs-title">{s.title}</div>}
      {s.subtitle && <div className="cs-subtitle">{s.subtitle}</div>}
    </div>
  );
}

// ================= TIKTOK MOCKUP =================
function TikTokMockup({ draft }) {
  const cap = draft.variants?.tt || draft.body;
  return (
    <div className="mockup-tt">
      <div className="mockup-tt-media">
        {draft.images[0] && <img src={draft.images[0]} alt=""/>}
      </div>
      <div className="mockup-tt-overlay"/>
      <div className="mockup-tt-top">
        <span>Abonnements</span>
        <span className="active">Pour toi</span>
      </div>
      <div className="mockup-tt-side">
        <div className="av"/>
        <div className="item">
          <IconHeart fill="white"/>
          <span className="num">12.4K</span>
        </div>
        <div className="item">
          <IconMessageCircle fill="white"/>
          <span className="num">341</span>
        </div>
        <div className="item">
          <IconBookmark fill="white"/>
          <span className="num">892</span>
        </div>
        <div className="item">
          <IconSend fill="white"/>
          <span className="num">1.2K</span>
        </div>
      </div>
      <div className="mockup-tt-bottom">
        <div className="un">@aureliaskin</div>
        <div className="cap">{cap}
{'\n'}{(draft.hashtags || []).slice(0,3).map(h => '#' + h).join(' ')}
        </div>
      </div>
    </div>
  );
}

// ================= X MOCKUP =================
function XMockup({ draft }) {
  const cap = draft.variants?.x || draft.body;
  const ws = window.CD_DATA.workspaces.find(w => w.id === draft.ws);
  const renderCap = (txt) => {
    if (!txt) return null;
    return txt.split(/(\s+)/).map((p, i) => {
      if (p.startsWith('#')) return <span key={i} className="hashtag">{p}</span>;
      if (p.startsWith('@')) return <span key={i} className="mention">{p}</span>;
      return p;
    });
  };
  return (
    <div className="mockup-x">
      <div className="mockup-x-head">
        <div className="av"/>
        <div style={{flex:1}}>
          <div className="meta">
            <span className="name">{ws?.name || 'ContentDock'}</span>
            <IconCheck size={13} stroke="#1d9bf0" sw={2.5} fill="none"/>
            <span className="handle">@{ws?.slug || 'contentdock'} · 2h</span>
          </div>
        </div>
        <IconMoreH size={16} stroke="var(--text-3)"/>
      </div>
      <div className="mockup-x-body">{renderCap(cap)}</div>
      {draft.images[0] && (
        <div className="mockup-x-img"><img src={draft.images[0]} alt=""/></div>
      )}
      <div className="mockup-x-stats">
        <span>💬 24</span>
        <span>🔁 87</span>
        <span>❤️ 342</span>
        <span>📊 12K</span>
      </div>
    </div>
  );
}

// ================= SNIPPET VIEWER (dev) =================
function SnippetBlock({ code, onToast }) {
  const [copied, setCopied] = useStateX(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.source);
      setCopied(true);
      onToast?.('Snippet copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 1200);
    } catch(e) {}
  };

  const filename = code.lang === 'python' ? 'snippet.py' : code.lang === 'javascript' ? 'useLocalStorage.js' : 'snippet.txt';
  const lines = code.source.split('\n');

  return (
    <div className="snippet-block">
      <div className="snippet-head">
        <div className="dots"><span className="r"/><span className="y"/><span className="g"/></div>
        <span className="filename">{filename}</span>
        <span className="lang">{code.lang}</span>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
          {copied ? <IconCheck size={11}/> : <IconCopy size={11}/>}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <div className="snippet-code">
        <table>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="ln">{i + 1}</td>
                <td className="code" dangerouslySetInnerHTML={{ __html: highlight(line, code.lang) }}/>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Minimal token-based highlighter — tokenize FIRST, then escape each token.
function highlight(line, lang) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokens = [];
  const commentRe = lang === 'python' ? /#[^\n]*$/ : /\/\/[^\n]*$/;

  // 1) Extract comment (rest of line)
  let commentPart = '';
  const cm = line.match(commentRe);
  let body = line;
  if (cm) { commentPart = cm[0]; body = line.slice(0, cm.index); }

  // 2) Regex to tokenize the body
  //    strings ("…", '…', `…`), numbers, words, operators, punctuation, whitespace
  const re = /(".*?"|'.*?'|`.*?`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\w\s"'`])/g;
  const kwJs = new Set(['import','from','export','const','let','var','function','return','if','else','for','while','try','catch','new','typeof','true','false','null','undefined','async','await','class','extends','of','in','instanceof','throw']);
  const kwPy = new Set(['import','from','def','class','return','if','elif','else','for','while','try','except','with','as','pass','break','continue','True','False','None','lambda','yield','in','not','and','or','is','raise','self']);
  const kws = lang === 'python' ? kwPy : kwJs;

  let out = '';
  let m;
  let lastEnd = 0;
  const wrapped = [];
  const pieces = [];
  while ((m = re.exec(body)) !== null) {
    if (m[1]) pieces.push({ kind: 'str', v: m[1] });
    else if (m[2]) pieces.push({ kind: 'num', v: m[2] });
    else if (m[3]) pieces.push({ kind: 'word', v: m[3] });
    else if (m[4]) pieces.push({ kind: 'ws', v: m[4] });
    else if (m[5]) pieces.push({ kind: 'op', v: m[5] });
  }
  // Second pass: is next non-ws char '(' ? mark as fn
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.kind === 'word') {
      if (kws.has(p.v)) { out += `<span class="kw">${esc(p.v)}</span>`; continue; }
      // look ahead
      let j = i + 1;
      while (j < pieces.length && pieces[j].kind === 'ws') j++;
      if (j < pieces.length && pieces[j].kind === 'op' && pieces[j].v === '(') {
        out += `<span class="fn">${esc(p.v)}</span>`;
        continue;
      }
      out += esc(p.v);
    } else if (p.kind === 'str') {
      out += `<span class="str">${esc(p.v)}</span>`;
    } else if (p.kind === 'num') {
      out += `<span class="num">${esc(p.v)}</span>`;
    } else if (p.kind === 'op') {
      out += esc(p.v);
    } else {
      out += p.v; // whitespace, preserve
    }
  }
  if (commentPart) out += `<span class="com">${esc(commentPart)}</span>`;
  return out || '&nbsp;';
}

// ================= MOODBOARD (graphist) =================
function MoodboardBlock({ draft, onToast }) {
  if (!draft.palette && !draft.typography && !draft.images?.length) return null;
  return (
    <div style={{marginTop: 12}}>
      {draft.palette && (
        <>
          <div className="d-side-label">Palette extraite ({draft.palette.length} couleurs)</div>
          <div className="palette-strip">
            {draft.palette.map((c, i) => (
              <div key={i} className="palette-swatch"
                   style={{background: c}}
                   onClick={() => {
                     navigator.clipboard?.writeText(c);
                     onToast?.(`${c} copié`);
                   }}>
                <div className="hex">{c.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {draft.typography && (
        <div style={{marginTop: 16}}>
          <div className="d-side-label">Typographie</div>
          {draft.typography.map((t, i) => (
            <div key={i} className="typography-row">
              <div>
                <div className="fam" style={{fontFamily: 'var(--sans)'}}>{t.family}</div>
                <div className="w">{t.weight}</div>
              </div>
              <div className="use">{t.use}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= QUEUE VIEW (CM) =================
function QueueView({ drafts, onOpen }) {
  const queued = useMemoX(() => {
    return drafts
      .filter(d => d.scheduled && d.status !== 'published')
      .sort((a, b) => {
        if (a.scheduled.day !== b.scheduled.day) return a.scheduled.day - b.scheduled.day;
        return a.scheduled.hour - b.scheduled.hour;
      });
  }, [drafts]);

  const now = new Date();
  const monthNames = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

  if (!queued.length) {
    return <EmptyView label="File d'attente vide" hint="Programmez des brouillons pour qu'ils apparaissent ici."/>;
  }

  return (
    <div>
      <div style={{color: 'var(--text-3)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--mono)'}}>
        {queued.length} publication{queued.length>1?'s':''} programmée{queued.length>1?'s':''} · ordre chronologique
      </div>
      <div className="queue-list">
        {queued.map(d => (
          <div key={d.id} className="queue-item" onClick={() => onOpen(d.id)}>
            <div className="queue-time">
              <div className="day">{String(d.scheduled.day).padStart(2,'0')} {monthNames[now.getMonth()]}</div>
              <div>{String(d.scheduled.hour).padStart(2,'0')}:00</div>
            </div>
            <div className="queue-thumb">
              {d.images[0]
                ? <img src={d.images[0]} alt=""/>
                : <div style={{width:'100%', height:'100%', display:'grid', placeItems:'center', color:'var(--text-4)'}}><IconHash size={16}/></div>}
            </div>
            <div className="queue-body">
              <div className="t">{d.title}</div>
              <div className="meta">
                <ChannelBadge ch={d.channel} size={14}/>
                <span>{window.CD_DATA.channels[d.channel]?.label}</span>
                <span style={{color:'var(--text-4)'}}>·</span>
                <StatusPill status={d.status}/>
              </div>
            </div>
            <div className="queue-actions" onClick={e => e.stopPropagation()}>
              <button title="Publier maintenant"><IconSend size={13}/></button>
              <button title="Repousser"><IconClock size={13}/></button>
              <button title="Plus"><IconMoreV size={13}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CarouselMockup, TikTokMockup, XMockup, SnippetBlock, MoodboardBlock, QueueView });

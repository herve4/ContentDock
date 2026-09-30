// Capture modal — real paste + drag & drop + universal attachments
const { useState: useStateCap, useEffect: useEffectCap, useRef: useRefCap } = React;

function CaptureModal({ workspaces, currentWs, channels, onManageChannels, seed, onClose, onCreate, onToast }) {
  const [text, setText] = useStateCap(seed?.text || '');
  const [images, setImages] = useStateCap([]);
  const [attachments, setAttachments] = useStateCap([]);
  const [attachPreview, setAttachPreview] = useStateCap(null);
  const [dragOver, setDragOver] = useStateCap(false);
  const [ws, setWs] = useStateCap(currentWs && currentWs !== 'all' && currentWs !== 'inbox' ? currentWs : workspaces[0].id);
  const wsObj = workspaces.find(w => w.id === ws);
  const isDev = wsObj?.kind === 'dev';
  const channelList = Array.isArray(channels) ? channels : Object.values(channels || window.CD_DATA?.channels || {});
  const [channel, setChannel] = useStateCap(channelList[0]?.id || (isDev ? 'li' : 'ig'));
  const [detectedLang, setDetectedLang] = useStateCap(null);
  const dropRef = useRefCap(null);

  // Process seed files (images, videos, and universal attachments)
  useEffectCap(() => {
    if (!seed?.files) return;
    const mediaFiles = seed.files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const nonMedia = seed.files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    if (mediaFiles.length) {
      Promise.all(mediaFiles.map(async f => ({
        url: await window.fileToDataUrl(f),
        name: f.name || `paste-${Date.now()}`,
        size: f.size,
        isVideo: f.type.startsWith('video/')
      }))).then(items => setImages(prev => [...prev, ...items]));
    }
    if (nonMedia.length) {
      Promise.all(nonMedia.map(f => window.fileToAttachment(f)))
        .then(atts => setAttachments(prev => [...prev, ...atts]));
    }
  }, []);

  // Détection intelligente sécurisée de code ou diagramme (évite tout crash)
  useEffectCap(() => {
    try {
      if (text && typeof window.detectLangFromContent === 'function') {
        const lang = window.detectLangFromContent(text);
        setDetectedLang(lang);
      } else {
        setDetectedLang(null);
      }
    } catch (err) {
      console.warn('[Capture] Détection de langue ignorée avec sécurité :', err);
      setDetectedLang(null);
    }
  }, [text, isDev]);

  const hasContent = text.length > 0 || images.length > 0 || attachments.length > 0;

  // Listen paste globally when modal is open
  useEffectCap(() => {
    const handler = async e => {
      const items = e.clipboardData?.items;
      if (!items) return;
      let gotText = e.clipboardData.getData('text/plain');
      const newMedia = [];
      const newFiles = [];
      for (const it of items) {
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) {
            if (f.type.startsWith('image/') || f.type.startsWith('video/')) newMedia.push(f);
            else newFiles.push(f);
          }
        }
      }
      if (gotText || newMedia.length > 0 || newFiles.length > 0) {
        e.preventDefault();
        if (gotText) setText(prev => prev ? prev + '\n' + gotText : gotText);
        if (newMedia.length) {
          const items = await Promise.all(newMedia.map(async f => ({
            url: await window.fileToDataUrl(f),
            name: f.name || `paste-${Date.now()}`,
            size: f.size,
            isVideo: f.type.startsWith('video/')
          })));
          setImages(prev => [...prev, ...items]);
        }
        if (newFiles.length) {
          Promise.all(newFiles.map(f => window.fileToAttachment(f)))
            .then(atts => setAttachments(prev => [...prev, ...atts]));
        }
        const parts = [];
        if (gotText) parts.push('texte');
        if (newMedia.length) parts.push(`${newMedia.length} média${newMedia.length>1?'s':''}`);
        if (newFiles.length) parts.push(`${newFiles.length} document${newFiles.length>1?'s':''}`);
        onToast(`Ajouté : ${parts.join(' + ')}`);
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);

  useEffectCap(() => {
    const onKey = e => { if (e.key === 'Escape' && !attachPreview) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, attachPreview]);

  const handleFiles = async (files) => {
    const arr = [...files];
    const mediaList = [];
    const nonMedia = [];
    for (const f of arr) {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        const dataUrl = await window.fileToDataUrl(f);
        mediaList.push({
          url: dataUrl,
          name: f.name,
          size: f.size,
          isVideo: f.type.startsWith('video/')
        });
      } else if (f.type.startsWith('text/') || /\.(txt|md)$/i.test(f.name)) {
        // Plain text = merge into text
        const reader = new FileReader();
        reader.onload = e => setText(prev => (prev ? prev + '\n' : '') + String(e.target.result));
        reader.readAsText(f);
      } else {
        nonMedia.push(f);
      }
    }
    if (mediaList.length) setImages(prev => [...prev, ...mediaList]);
    if (nonMedia.length) {
      const atts = await Promise.all(nonMedia.map(f => window.fileToAttachment(f)));
      setAttachments(prev => [...prev, ...atts]);
      onToast(`${atts.length} document${atts.length>1?'s':''} attaché${atts.length>1?'s':''}`);
    }
  };

  const onDrop = e => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const removeImg = i => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removeAtt = id => setAttachments(prev => prev.filter(a => a.id !== id));

  const submit = () => {
    if (!hasContent) return;
    const isDiagram = detectedLang === 'diagram' || detectedLang === 'mermaid';
    const isCode = isDev && detectedLang && !isDiagram && text.trim().length > 20;

    // Extraction d'un titre représentatif même pour les schémas ASCII
    const cleanLines = text.split('\n')
      .map(l => l.replace(/^[#+\-|=*\s─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]+/, '').replace(/[#+\-|=*\s─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]+$/, '').trim())
      .filter(l => l.length > 2);
    const candidateTitle = cleanLines[0] || (isDiagram ? 'Schéma d’architecture IA' : attachments[0]?.name || 'Brouillon sans titre');

    const draft = {
      id: 'new-' + Date.now(),
      ws,
      title: candidateTitle.slice(0, 80),
      body: text,
      variants: {},
      hashtags: (text.match(/#[a-zA-Z0-9_]+/g) || []).map(s => s.slice(1)),
      images: images.map(i => i.url),
      attachments,
      status: 'idea',
      channel,
      tags: isDiagram ? ['diagramme'] : [],
      scheduled: null,
      triage: 'pending'
    };
    if (isCode) {
      draft.code = { lang: detectedLang, source: text };
      draft.body = ''; // move to code, keep body clean
    }
    onCreate(draft);
    onClose();
  };

  const isDiagramDetected = detectedLang === 'diagram' || detectedLang === 'mermaid';

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="capture-modal">
        <div className="capture-head">
          <IconPaste size={14}/>
          <span className="title">Capturer un contenu</span>
          <div className="kbd-hint">
            <kbd>⌘V</kbd> ou <kbd>Ctrl+V</kbd> pour coller · <kbd>Esc</kbd> pour fermer
          </div>
        </div>

        <div ref={dropRef}
             className={`capture-drop ${hasContent ? 'has-content' : ''} ${dragOver ? 'drag-over' : ''}`}
             onDragOver={e => { e.preventDefault(); setDragOver(true); }}
             onDragLeave={() => setDragOver(false)}
             onDrop={onDrop}
             onClick={() => !hasContent && document.getElementById('cap-file').click()}>
          {!hasContent ? (
            <div className="drop-hint">
              <IconUpload/>
              <div className="big">Collez, glissez ou cliquez pour importer</div>
              <div>Images, texte, diagrammes IA, PDF, Word, code, CSV — tout est accepté</div>
              <div style={{marginTop: 12, color:'var(--text-4)', fontFamily:'var(--mono)', fontSize:11}}>
                💡 collez un schéma d'architecture ou du texte directement
              </div>
            </div>
          ) : (
            <div style={{width:'100%'}}>
              {(images.length > 0 || text) && (
                <div className="capture-preview">
                  <div className={`capture-preview-media ${images.length === 0 ? 'empty' : ''}`}>
                    {images[0] ? (
                      (images[0].isVideo || window.isVideoMedia(images[0].url)) ? (
                        <div className="card-video-wrap" style={{width:'100%', height:'100%', borderRadius:6, position:'relative'}}>
                          <video src={images[0].url} muted autoPlay loop playsInline style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                          <div className="card-video-badge" style={{position:'absolute', top:6, left:6}}>▶ VIDÉO</div>
                          {images.length > 1 && <div className="count-badge">+{images.length - 1}</div>}
                        </div>
                      ) : (
                        <>
                          <img src={images[0].url} alt=""/>
                          {images.length > 1 && <div className="count-badge">+{images.length - 1}</div>}
                        </>
                      )
                    ) : (
                      <div style={{padding: 8, textAlign: 'center'}}>
                        {isDiagramDetected ? <span style={{fontSize: 28}}>📐</span> : 'Aucun média — texte seul'}
                        {isDiagramDetected && <div style={{fontSize: 10.5, marginTop: 4, color: 'var(--accent)'}}>Schéma IA</div>}
                      </div>
                    )}
                  </div>
                  <div
                    className={`capture-preview-text ${!text ? 'empty' : ''}`}
                    style={isDiagramDetected ? {
                      fontFamily: 'var(--mono)',
                      whiteSpace: 'pre',
                      overflowX: 'auto',
                      fontSize: 11,
                      lineHeight: 1.35
                    } : {}}
                  >
                    {text || 'Aucun texte capturé — média seul'}
                  </div>
                </div>
              )}
              {attachments.length > 0 && (
                <div style={{padding:'0 14px 14px'}}>
                  <div style={{fontSize: 10.5, color: 'var(--text-4)', textTransform:'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 500}}>
                    Documents attachés ({attachments.length})
                  </div>
                  <window.AttachmentList
                    attachments={attachments}
                    onRemove={removeAtt}
                    onPreview={a => setAttachPreview(a)}/>
                </div>
              )}
            </div>
          )}
        </div>
        <input id="cap-file" type="file" multiple
               accept="image/*,video/*,text/*,application/*,.pdf,.docx,.txt,.md"
               style={{display:'none'}}
               onChange={e => handleFiles(e.target.files)}/>

        {hasContent && (
          <div style={{padding:'0 14px 12px', display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'end'}}>
            <div>
              <div style={{fontSize:10.5, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4, fontWeight:500}}>Espace</div>
              <select className="d-select" value={ws} onChange={e => setWs(e.target.value)}>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <div style={{fontSize:10.5, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:500}}>Canal cible</div>
                {onManageChannels && (
                  <button
                    type="button"
                    onClick={onManageChannels}
                    style={{background:'none', border:'none', color:'var(--accent)', fontSize:10.5, cursor:'pointer', padding:0, fontWeight:600}}
                    title="Gérer, ajouter ou supprimer des canaux cibles"
                  >
                    + Gérer
                  </button>
                )}
              </div>
              <select className="d-select" value={channel} onChange={e => setChannel(e.target.value)}>
                {channelList.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {images.length > 0 && (
              <button className="btn ghost" onClick={() => setImages([])} title="Retirer les images">
                <IconTrash/>{images.length} img
              </button>
            )}
          </div>
        )}

        {isDiagramDetected && (
          <div style={{padding:'0 14px 10px', display:'flex', alignItems:'center', gap:8, color:'var(--accent)', fontSize:11, fontFamily:'var(--mono)'}}>
            <IconHash size={12}/>
            Schéma d’architecture / Diagramme détecté — mise en forme préservée
          </div>
        )}

        {detectedLang && !isDiagramDetected && isDev && text.length > 20 && (
          <div style={{padding:'0 14px 10px', display:'flex', alignItems:'center', gap:8, color:'var(--info)', fontSize:11, fontFamily:'var(--mono)'}}>
            <IconHash size={12}/>
            Code <b style={{color:'var(--text)'}}>{detectedLang}</b> détecté — sera enregistré comme snippet
          </div>
        )}

        <div className="capture-foot">
          <div className="foot-info">
            {hasContent
              ? `${text.length} car · ${images.length} img · ${attachments.length} doc${(text.match(/#[a-zA-Z0-9_]+/g)||[]).length ? ' · ' + (text.match(/#[a-zA-Z0-9_]+/g)||[]).length + ' tags' : ''}`
              : 'en attente…'}
          </div>
          <div className="foot-sep"/>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" disabled={!hasContent} onClick={submit}>
            <IconPlus/>Créer le brouillon
          </button>
        </div>
      </div>

      {attachPreview && (
        <window.AttachmentPreview
          attachment={attachPreview}
          onClose={() => setAttachPreview(null)}
          onUpdate={(updatedAtt) => {
            setAttachments(prev => prev.map(a => a.id === updatedAtt.id ? updatedAtt : a));
            setAttachPreview(updatedAtt);
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

Object.assign(window, { CaptureModal });

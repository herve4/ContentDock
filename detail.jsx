// Draft detail drawer + IG/LinkedIn mockup previews + Interactive Media Lightbox
const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD, useRef: useRefD } = React;

// ============================================================
// INTERACTIVE MEDIA VIEWER / LIGHTBOX MODAL (PHOTO & VIDEO)
// ============================================================
function MediaLightboxModal({
  images,
  currentIndex,
  onClose,
  onSelectIndex,
  onDelete,
  onReplace,
  onToast
}) {
  const [isPlaying, setIsPlaying] = useStateD(true);
  const [isMuted, setIsMuted] = useStateD(false);
  const [currentTime, setCurrentTime] = useStateD(0);
  const [duration, setDuration] = useStateD(0);
  const [volume, setVolume] = useStateD(1);
  const [isLoop, setIsLoop] = useStateD(true);
  const videoRef = useRefD(null);
  const replaceInputRef = useRefD(null);

  const currentSrc = images[currentIndex];
  const isVideo = window.isVideoMedia && window.isVideoMedia(currentSrc);
  const hasMultiple = images.length > 1;

  useEffectD(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasMultiple) onSelectIndex((currentIndex + 1) % images.length);
      if (e.key === 'ArrowLeft' && hasMultiple) onSelectIndex((currentIndex - 1 + images.length) % images.length);
      if (e.key === ' ' && isVideo && videoRef.current) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, images.length, isVideo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pos * duration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentSrc;
    a.download = `contentdock-media-${currentIndex + 1}.${isVideo ? 'mp4' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast?.('Téléchargement démarré');
  };

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await window.fileToDataUrl(file);
    onReplace(currentIndex, dataUrl);
    e.target.value = '';
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="cd-media-viewer-backdrop" onClick={onClose}>
      <div className="cd-media-viewer-topbar" onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', gap: 12}}>
          <div style={{
            background: isVideo ? 'linear-gradient(135deg, #ff5a1f, #ff834f)' : 'var(--bg-3)',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            {isVideo ? '▶ LECTEUR VIDÉO' : '📷 IMAGE'}
          </div>
          <span style={{fontSize: 13, color: 'var(--text-2)'}}>
            Média {currentIndex + 1} sur {images.length}
          </span>
        </div>

        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="d-action"
            style={{fontSize: 12, padding: '6px 12px', background: 'var(--bg-3)', border: '1px solid var(--line-strong)'}}
            title="Remplacer ce média">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Remplacer
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*,video/*"
            style={{display:'none'}}
            onChange={handleReplaceFile}/>

          <button
            onClick={handleDownload}
            className="d-action"
            style={{fontSize: 12, padding: '6px 12px', background: 'var(--bg-3)', border: '1px solid var(--line-strong)'}}
            title="Télécharger sur votre ordinateur">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Télécharger
          </button>

          <button
            onClick={() => onDelete(currentIndex)}
            className="d-action"
            style={{fontSize: 12, padding: '6px 12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'}}
            title="Supprimer ce média">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Supprimer
          </button>

          <button
            onClick={onClose}
            className="icon-btn"
            style={{marginLeft: 8, fontSize: 18, color: 'var(--text-3)'}}
            title="Fermer (Esc)">
            ✕
          </button>
        </div>
      </div>

      <div className="cd-media-viewer-content" onClick={e => e.stopPropagation()}>
        {hasMultiple && (
          <button
            onClick={() => onSelectIndex((currentIndex - 1 + images.length) % images.length)}
            style={{
              position: 'absolute',
              left: 24,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(20,20,26,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
            title="Précédent (←)">
            ‹
          </button>
        )}

        {isVideo ? (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%'}}>
            <video
              ref={videoRef}
              src={currentSrc}
              autoPlay
              loop={isLoop}
              playsInline
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              style={{cursor:'pointer'}}
            />

            <div className="cd-video-controls-panel">
              <div className="cd-video-progress-bar" onClick={handleSeek} title="Cliquer pour naviguer dans la vidéo">
                <div className="cd-video-progress-fill" style={{width: `${progressPercent}%`}}/>
              </div>

              <div className="cd-video-btn-row">
                <div style={{display:'flex', alignItems:'center', gap: 12}}>
                  <button className="cd-video-play-btn-large" onClick={togglePlay} title={isPlaying ? "Pause (Espace)" : "Lire (Espace)"}>
                    {isPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>

                  <div style={{fontSize: 12.5, fontFamily: 'var(--mono)', color: 'var(--text-2)', letterSpacing: 0.5}}>
                    <span style={{color: '#fff', fontWeight: 600}}>{formatTime(currentTime)}</span>
                    <span style={{color: 'var(--text-4)', margin: '0 4px'}}>/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div style={{display:'flex', alignItems:'center', gap: 14}}>
                  <button
                    onClick={() => setIsLoop(!isLoop)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isLoop ? '#ff5a1f' : 'var(--text-4)',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600
                    }}
                    title={isLoop ? "Boucle active" : "Boucle inactive"}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                    {isLoop ? 'En boucle' : 'Une fois'}
                  </button>

                  <div style={{display:'flex', alignItems:'center', gap: 6}}>
                    <button onClick={toggleMute} style={{background:'none', border:'none', color:'var(--text-2)', cursor:'pointer'}} title={isMuted ? "Activer le son" : "Couper le son"}>
                      {isMuted || volume === 0 ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      style={{width: 70, height: 4, accentColor: '#ff5a1f', cursor: 'pointer'}}
                      title="Volume sonore"/>
                  </div>

                  <button
                    onClick={() => {
                      if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
                    }}
                    style={{background:'none', border:'none', color:'var(--text-2)', cursor:'pointer', padding: 4}}
                    title="Plein écran">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <img src={currentSrc} alt="" />
        )}

        {hasMultiple && (
          <button
            onClick={() => onSelectIndex((currentIndex + 1) % images.length)}
            style={{
              position: 'absolute',
              right: 24,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(20,20,26,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
            title="Suivant (→)">
            ›
          </button>
        )}
      </div>
    </div>
  );
}

function DraftDrawer({ draft, onClose, onUpdate, onToast, onPublish }) {
  const [tab, setTab] = useStateD('body'); // body | ig | li | x | preview
  const [copiedKey, setCopiedKey] = useStateD(null);
  const [attachPreview, setAttachPreview] = useStateD(null);
  const [publishOpen, setPublishOpen] = useStateD(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useStateD(null);
  const [tagInputValue, setTagInputValue] = useStateD('');
  const mediaFileInputRef = useRefD(null);

  useEffectD(() => {
    const onKey = e => { if (e.key === 'Escape' && selectedMediaIndex === null) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, selectedMediaIndex]);

  if (!draft) return null;
  const ws = window.CD_DATA.workspaces.find(w => w.id === draft.ws);
  const currentText = tab === 'body' ? draft.body : (draft.variants[tab] || '');
  const chars = currentText.length;
  const charLimits = { x: 280, ig: 2200, li: 3000, body: null };
  const limit = charLimits[tab] ?? null;

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onToast('Texte copié dans le presse-papiers');
      setTimeout(() => setCopiedKey(null), 1400);
    } catch(e) { onToast('Copie non autorisée par le navigateur'); }
  };

  const copyImage = async () => {
    if (!draft.images[0]) return;
    try {
      const res = await fetch(draft.images[0]);
      const blob = await res.blob();
      // Convert to PNG for widest support
      const img = await new Promise((res2, rej) => {
        const im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = () => res2(im); im.onerror = rej; im.src = URL.createObjectURL(blob);
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(async pngBlob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
          onToast('Image copiée dans le presse-papiers');
        } catch(e) { onToast('Copie image non supportée par ce navigateur'); }
      }, 'image/png');
    } catch(e) { onToast('Impossible de copier l\'image'); }
  };

  const copyPack = async () => {
    const parts = [];
    if (tab !== 'body' && draft.variants[tab]) parts.push(draft.variants[tab]);
    else parts.push(draft.body);
    if (draft.hashtags?.length) parts.push('\n' + draft.hashtags.map(h => '#' + h).join(' '));
    await copyText(parts.join('\n'), 'pack');
  };

  const setBody = v => onUpdate({ ...draft, body: v });
  const setVariant = (k, v) => onUpdate({ ...draft, variants: { ...draft.variants, [k]: v } });
  const setField = (k, v) => onUpdate({ ...draft, [k]: v });

  // Gestion des médias : Ajout, Suppression, Remplacement
  const handleAddMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const newUrls = await Promise.all(files.map(f => window.fileToDataUrl(f)));
      const updatedImages = [...(draft.images || []), ...newUrls];
      setField('images', updatedImages);
      onToast(`${files.length} média${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}`);
    } catch (err) {
      onToast('Erreur lors de l\'ajout du média');
    }
    e.target.value = '';
  };

  const handleDeleteMedia = (index, e) => {
    if (e) e.stopPropagation();
    const updatedImages = (draft.images || []).filter((_, i) => i !== index);
    setField('images', updatedImages);
    if (selectedMediaIndex === index) {
      setSelectedMediaIndex(null);
    } else if (selectedMediaIndex > index) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    }
    onToast('Média retiré du brouillon');
  };

  const handleReplaceMedia = (index, dataUrl) => {
    const updatedImages = [...(draft.images || [])];
    updatedImages[index] = dataUrl;
    setField('images', updatedImages);
    onToast('Média remplacé avec succès');
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <span className="ws-dot" style={{width:9, height:9, borderRadius:2, background: ws?.color}}/>
          <span style={{color:'var(--text-3)', fontSize:12}}>{ws?.name}</span>
          <span style={{color:'var(--text-4)', fontSize:11}}>·</span>
          <StatusPill status={draft.status}/>
          <div style={{flex:1}}/>
          <window.PresenceStack team={window.TEAM.filter(u => u.status === 'online')} maxVisible={3}/>
          <button className="d-action" onClick={() => onToast('Lien de revue copié (démo)')}><IconLink/>Partager</button>
          <button className="d-action primary" onClick={() => setPublishOpen(true)}><IconSend/>Publier</button>
          <button className="icon-btn" onClick={onClose} title="Fermer (Esc)"><IconX/></button>
        </div>

        <div className="drawer-body">
          <div className="drawer-cols">
            <div>
              <input className="d-title-input"
                     value={draft.title}
                     onChange={e => setField('title', e.target.value)}
                     placeholder="Titre du brouillon"/>
              <div style={{color:'var(--text-3)', fontSize:11.5}}>
                {draft.images.length} média{draft.images.length !== 1 ? 's' : ''} · dernière modif il y a 2 h
              </div>

              {/* Media strip */}
              <div className="d-media-strip">
                {(draft.images || []).map((src, i) => {
                  const isVid = window.isVideoMedia && window.isVideoMedia(src);
                  return (
                    <div
                      key={i}
                      className="d-media-thumb"
                      onClick={() => setSelectedMediaIndex(i)}
                      title={isVid ? "Cliquer pour visionner la vidéo" : "Cliquer pour agrandir l'image"}>
                      {isVid ? (
                        <>
                          <video src={src} muted preload="metadata" playsInline />
                          <div className="d-media-video-badge">▶ VIDÉO</div>
                          <div className="d-media-play-overlay">
                            <div className="d-media-play-icon">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={src} alt=""/>
                      )}
                      <button
                        type="button"
                        className="d-media-del"
                        onClick={(e) => handleDeleteMedia(i, e)}
                        title="Supprimer ce média">
                        ✕
                      </button>
                    </div>
                  );
                })}
                <div
                  className="d-media-thumb add"
                  onClick={() => mediaFileInputRef.current?.click()}
                  title="Ajouter une image ou une vidéo">
                  <IconPlus size={20}/>
                </div>
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{display: 'none'}}
                  onChange={handleAddMedia}/>
              </div>

              {/* Tabs */}
              <div className="d-tabs">
                <button className={`d-tab ${tab === 'body' ? 'active' : ''}`} onClick={() => setTab('body')}>
                  <IconEdit size={12}/>Corps
                </button>
                <button className={`d-tab ${tab === 'ig' ? 'active' : ''}`} onClick={() => setTab('ig')}>
                  <span className="ch-mini channel-ig">IG</span>Instagram
                </button>
                <button className={`d-tab ${tab === 'li' ? 'active' : ''}`} onClick={() => setTab('li')}>
                  <span className="ch-mini channel-li">in</span>LinkedIn
                </button>
                <button className={`d-tab ${tab === 'x' ? 'active' : ''}`} onClick={() => setTab('x')}>
                  <span className="ch-mini channel-x">𝕏</span>X
                </button>
                <button className={`d-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
                  <IconEye size={12}/>Preview
                </button>
              </div>

              {/* Body */}
              {tab === 'preview' ? (
                <PreviewPane draft={draft} onToast={onToast}/>
              ) : (
                <>
                  <textarea className="d-copy-area"
                            value={currentText}
                            onChange={e => tab === 'body' ? setBody(e.target.value) : setVariant(tab, e.target.value)}
                            placeholder={tab === 'body'
                              ? 'Corps principal du brouillon…'
                              : `Variante ${tab.toUpperCase()} — sera copiée en un clic`}/>
                  {/* AI generation button for variant tabs */}
                  {['ig','li','x','tt'].includes(tab) && draft.body && !currentText && (
                    <div style={{marginTop:8, padding:'8px 10px', background:'var(--bg-2)', border:'1px dashed var(--line-strong)', borderRadius:6, display:'flex', gap:8, alignItems:'center', fontSize:11.5, color:'var(--text-3)'}}>
                      Aucune variante {tab.toUpperCase()} — 
                      <AIGenerateButton draft={draft} kind={tab}
                                        onGenerated={out => setVariant(tab, out)}
                                        onToast={onToast}/>
                      à partir du corps.
                    </div>
                  )}
                  {['ig','li','x','tt'].includes(tab) && currentText && (
                    <div style={{marginTop:6, display:'flex', gap:6, alignItems:'center'}}>
                      <AIGenerateButton draft={draft} kind={tab}
                                        onGenerated={out => setVariant(tab, out)}
                                        onToast={onToast}/>
                      <span style={{color:'var(--text-4)', fontSize:11}}>Régénère la variante {tab.toUpperCase()}</span>
                    </div>
                  )}
                  {/* Domain extras: snippet + moodboard + attachments */}
                  {tab === 'body' && draft.code && <SnippetBlock code={draft.code} onToast={onToast}/>}
                  {tab === 'body' && (draft.palette || draft.typography) && <MoodboardBlock draft={draft} onToast={onToast}/>}
                  {tab === 'body' && draft.attachments?.length > 0 && (
                    <div style={{marginTop:14}}>
                      <div className="d-side-label">Documents attachés ({draft.attachments.length})</div>
                      <window.AttachmentList attachments={draft.attachments}
                                              onRemove={id => setField('attachments', draft.attachments.filter(a => a.id !== id))}
                                              onPreview={a => setAttachPreview(a)}/>
                    </div>
                  )}
                  <div className="d-copy-stats">
                    <span className={limit && chars > limit ? 'over' : ''}>
                      {chars}{limit ? ` / ${limit}` : ''} car.
                    </span>
                    <span>{currentText.split(/\s+/).filter(Boolean).length} mots</span>
                    {draft.hashtags?.length > 0 && <span>{draft.hashtags.length} hashtag{draft.hashtags.length>1?'s':''}</span>}
                  </div>

                  <div className="d-actions-row">
                    <button className={`d-action primary ${copiedKey === 'text' ? 'copied' : ''}`}
                            onClick={() => copyText(currentText, 'text')}>
                      {copiedKey === 'text' ? <IconCheck/> : <IconCopy/>}
                      {copiedKey === 'text' ? 'Copié' : 'Copier la légende'}
                    </button>
                    <button className={`d-action ${copiedKey === 'pack' ? 'copied' : ''}`} onClick={copyPack}>
                      {copiedKey === 'pack' ? <IconCheck/> : <IconClipboard/>}
                      Copier légende + hashtags
                    </button>
                    <button className="d-action" onClick={copyImage} disabled={!draft.images[0]}>
                      <IconImage/>Copier l'image
                    </button>
                    <button className="d-action" onClick={() => window.exportDraftAsZip(draft, onToast)}>
                      <IconDownload/>Télécharger le pack (ZIP)
                    </button>
                    <button className="d-action" onClick={() => onToast('Brouillon dupliqué pour déclinaison (démo)')}>
                      <IconLayers/>Dupliquer
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right sidebar */}
            <div>
              <div className="d-side-block">
                <div className="d-side-label">Statut</div>
                <select className="d-select" value={draft.status}
                        onChange={e => setField('status', e.target.value)}>
                  {window.CD_DATA.statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Assigné à</div>
                <window.AssigneePicker draft={draft}
                                        workspaces={window.CD_DATA.workspaces}
                                        onAssign={(userId) => setField('assigneeId', userId)}
                                        onToast={onToast}/>
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Canal principal</div>
                <div className="d-channels">
                  {Object.values(window.CD_DATA.channels).map(c => (
                    <button key={c.id}
                            className={`d-channel-btn ${draft.channel === c.id ? 'on' : ''}`}
                            onClick={() => setField('channel', c.id)}>
                      <ChannelBadge ch={c.id} size={14}/>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Planification</div>
                {draft.scheduled ? (
                  <>
                    <div className="value" style={{marginBottom:6, fontFamily:'var(--mono)', fontSize:12}}>
                      Jour {String(draft.scheduled.day).padStart(2,'0')} · {String(draft.scheduled.hour).padStart(2,'0')}:00
                    </div>
                    <button className="d-action" style={{width:'100%', justifyContent:'center'}}
                            onClick={() => setField('scheduled', null)}>
                      <IconX/>Retirer du planning
                    </button>
                  </>
                ) : (
                  <button className="d-action" style={{width:'100%', justifyContent:'center'}}
                          onClick={() => setField('scheduled', { day: new Date().getDate(), hour: 10 })}>
                    <IconCalendar/>Planifier
                  </button>
                )}
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Tags</div>
                <div className="d-tags-input">
                  {(draft.tags || []).map(tid => {
                    const allTags = window.CD_TAGS || window.CD_DATA?.tags || [];
                    const t = allTags.find(x => x.id === tid) || window.CD_DATA?.tags?.find(x => x.id === tid);
                    if (!t) return null;
                    return (
                      <span key={tid} className="d-tag" style={{borderLeftColor: t.color || '#a78bfa'}}>
                        #{t.label}
                        <button onClick={() => setField('tags', draft.tags.filter(x => x !== tid))} title="Retirer ce tag">
                          <IconX size={9}/>
                        </button>
                      </span>
                    );
                  })}
                  <input
                    placeholder="+ tag (Entrée)"
                    value={tagInputValue}
                    onChange={e => setTagInputValue(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInputValue.trim()) {
                        e.preventDefault();
                        const clean = tagInputValue.trim().replace(/^#+/, '');
                        if (!clean) return;
                        const allTags = window.CD_TAGS || window.CD_DATA?.tags || [];
                        let existing = allTags.find(x => x.label.toLowerCase() === clean.toLowerCase());
                        if (existing) {
                          if (!(draft.tags || []).includes(existing.id)) {
                            setField('tags', [...(draft.tags || []), existing.id]);
                            onToast?.(`Tag #${existing.label} associé`);
                          }
                        } else {
                          const newTag = {
                            id: 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
                            label: clean,
                            color: '#a78bfa',
                            ws: draft.ws || null
                          };
                          if (window.CD_DB) window.CD_DB.saveTag(newTag);
                          if (window.CD_TAGS) window.CD_TAGS.push(newTag);
                          window.dispatchEvent(new CustomEvent('cd-tag-created', { detail: newTag }));
                          setField('tags', [...(draft.tags || []), newTag.id]);
                          onToast?.(`Nouveau tag #${clean} créé`);
                        }
                        setTagInputValue('');
                      }
                    }}
                    style={{background:'transparent', border:'none', color:'var(--text)', fontSize:11.5, minWidth:80, fontFamily:'var(--mono)'}}/>
                </div>
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Hashtags</div>
                <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.6, fontFamily:'var(--mono)'}}>
                  {(draft.hashtags || []).map(h => (
                    <span key={h} style={{color:'var(--info)'}}>#{h} </span>
                  ))}
                </div>
              </div>

              <div className="d-side-block">
                <div className="d-side-label">Actions rapides</div>
                <button className="d-action primary" style={{width:'100%', justifyContent:'flex-start', marginBottom:4}}
                        onClick={() => setPublishOpen(true)}>
                  <IconSend/>Publier maintenant
                </button>
                <button className="d-action" style={{width:'100%', justifyContent:'flex-start', marginBottom:4}}
                        onClick={() => window.exportDraftAsZip(draft, onToast)}>
                  <IconDownload/>Exporter en ZIP
                </button>
                <button className="d-action" style={{width:'100%', justifyContent:'flex-start'}}>
                  <IconTrash/>Archiver
                </button>
              </div>
            </div>
          </div>

          {/* Comments panel (bottom) */}
          <window.CommentsPanel draftId={draft.id} onToast={onToast}/>
        </div>
      </div>
      {attachPreview && (
        <window.AttachmentPreview attachment={attachPreview}
                                   onClose={() => setAttachPreview(null)}
                                   onToast={onToast}/>
      )}
      {publishOpen && (
        <window.PublishDialog draft={draft}
                               onClose={() => setPublishOpen(false)}
                               onDone={() => { setField('status', 'published'); onToast('Publication réussie 🎉'); }}
                               onToast={onToast}/>
      )}
      {selectedMediaIndex !== null && draft.images && draft.images[selectedMediaIndex] && (
        <MediaLightboxModal
          images={draft.images}
          currentIndex={selectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
          onSelectIndex={(idx) => setSelectedMediaIndex(idx)}
          onDelete={handleDeleteMedia}
          onReplace={handleReplaceMedia}
          onToast={onToast}
        />
      )}
    </>
  );
}

// ------------- PREVIEW PANE -------------
function PreviewPane({ draft, onToast }) {
  // Default to whatever platform matches the draft's channel if we support it
  const defaultPlat = ['ig','li','x','tt','carrousel'].includes(draft.channel) ? draft.channel : (draft.slides ? 'carrousel' : 'ig');
  const [platform, setPlatform] = useStateD(defaultPlat);
  const ws = window.CD_DATA.workspaces.find(w => w.id === draft.ws);
  const igCaption = draft.variants.ig || draft.body;
  const liCaption = draft.variants.li || draft.body;
  const hasCarousel = draft.slides && draft.slides.length > 1;

  const renderCaption = txt => {
    if (!txt) return null;
    const parts = txt.split(/(\s+)/);
    return parts.map((p, i) => p.startsWith('#') ? <span key={i} className="hashtag">{p}</span> : p);
  };

  return (
    <>
      <div style={{display:'flex', gap:6, marginBottom:12, flexWrap:'wrap'}}>
        <button className={`d-action ${platform==='ig'?'primary':''}`} onClick={() => setPlatform('ig')}>
          <ChannelBadge ch="ig" size={14}/>Instagram
        </button>
        {hasCarousel && (
          <button className={`d-action ${platform==='carrousel'?'primary':''}`} onClick={() => setPlatform('carrousel')}>
            <IconLayers size={12}/>Carrousel ({draft.slides.length})
          </button>
        )}
        <button className={`d-action ${platform==='li'?'primary':''}`} onClick={() => setPlatform('li')}>
          <ChannelBadge ch="li" size={14}/>LinkedIn
        </button>
        <button className={`d-action ${platform==='x'?'primary':''}`} onClick={() => setPlatform('x')}>
          <ChannelBadge ch="x" size={14}/>𝕏
        </button>
        <button className={`d-action ${platform==='tt'?'primary':''}`} onClick={() => setPlatform('tt')}>
          <ChannelBadge ch="tt" size={14}/>TikTok
        </button>
      </div>

      <div className="preview-wrap">
        {platform === 'carrousel' ? (
          <CarouselMockup draft={draft}/>
        ) : platform === 'x' ? (
          <XMockup draft={draft}/>
        ) : platform === 'tt' ? (
          <TikTokMockup draft={draft}/>
        ) : platform === 'ig' ? (
          <div className="mockup-ig">
            <div className="mockup-ig-head">
              <div className="av"/>
              <div>
                <div className="un">{ws?.slug || 'contentdock'}</div>
                <div className="loc">Publication programmée</div>
              </div>
              <div style={{marginLeft:'auto', color:'var(--text-3)'}}><IconMoreH size={16}/></div>
            </div>
            {draft.images[0] && (
              <div className="mockup-ig-img">
                {window.isVideoMedia && window.isVideoMedia(draft.images[0]) ? (
                  <video src={draft.images[0]} controls playsInline style={{width:'100%', maxHeight:320, background:'#000'}}/>
                ) : (
                  <img src={draft.images[0]} alt=""/>
                )}
              </div>
            )}
            <div className="mockup-ig-actions">
              <IconHeart/>
              <IconMessageCircle/>
              <IconSend/>
              <div className="flex1"/>
              <IconBookmark/>
            </div>
            <div className="mockup-ig-caption">
              <strong>{ws?.slug || 'contentdock'}</strong>
              {renderCaption(igCaption)}
              {draft.hashtags?.length > 0 && (
                <div style={{marginTop:6}}>
                  {draft.hashtags.map(h => <span key={h} className="hashtag">#{h} </span>)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mockup-li">
            <div className="mockup-li-head">
              <div className="av"/>
              <div>
                <div className="name">{ws?.name || 'ContentDock'}</div>
                <div className="role">Studio · 4 218 abonnés</div>
                <div className="time">Programmé · publié dans 2 h · 🌐</div>
              </div>
              <div style={{marginLeft:'auto', color:'var(--text-3)'}}><IconMoreH size={16}/></div>
            </div>
            <div className="mockup-li-body">{liCaption}</div>
            {draft.images[0] && (
              <div className="mockup-li-img">
                {window.isVideoMedia && window.isVideoMedia(draft.images[0]) ? (
                  <video src={draft.images[0]} controls playsInline style={{width:'100%', maxHeight:320, background:'#000'}}/>
                ) : (
                  <img src={draft.images[0]} alt=""/>
                )}
              </div>
            )}
            <div className="mockup-li-footer">
              <span>👍 Like</span>
              <span>💬 Commenter</span>
              <span>↻ Repartager</span>
              <span>➤ Envoyer</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Object.assign(window, { DraftDrawer, PreviewPane });

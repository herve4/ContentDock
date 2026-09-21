// Universal attachment handling — any file type.
// - Text-based (txt, md, csv, json, log, code): read + preview
// - PDF: parse via PDF.js (CDN) - extract text
// - DOCX: unzip inline, parse word/document.xml
// - Images: already handled elsewhere as inline media
// - Any other: keep as opaque asset with icon
const { useState: useStateAt, useEffect: useEffectAt, useMemo: useMemoAt } = React;

// --------- Type detection ---------
const CODE_EXTS = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python',
  html: 'html', htm: 'html', xml: 'xml',
  css: 'css', scss: 'css', sass: 'css',
  json: 'json',
  md: 'markdown',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  yml: 'yaml', yaml: 'yaml',
  sql: 'sql',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
  java: 'java', kt: 'kotlin', swift: 'swift',
  c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
  vue: 'vue', svelte: 'svelte',
  toml: 'toml', ini: 'ini', env: 'env',
  dockerfile: 'docker',
};

function detectKind(filenameOrType, mime) {
  const name = (filenameOrType || '').toLowerCase();
  const ext = name.split('.').pop();
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('video/')) return 'video';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx' || mime?.includes('wordprocessingml')) return 'docx';
  if (ext === 'xlsx' || mime?.includes('spreadsheetml')) return 'xlsx';
  if (ext === 'pptx' || mime?.includes('presentationml')) return 'pptx';
  if (ext === 'csv') return 'csv';
  if (ext === 'zip') return 'zip';
  if (['txt', 'log'].includes(ext)) return 'txt';
  if (ext === 'md') return 'md';
  if (CODE_EXTS[ext]) return 'code';
  if (ext === 'json') return 'json';
  if (mime?.startsWith('text/')) return 'txt';
  return 'generic';
}

function detectLangFromExt(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  return CODE_EXTS[ext] || null;
}

function detectLangFromContent(text) {
  const s = text.trim();
  if (/^\s*<!DOCTYPE html|<html/i.test(s)) return 'html';
  if (/^\s*<\?xml/.test(s)) return 'xml';
  if (/^\s*(from|import)\s+[\w.]+/.test(s) && /def\s+\w+|class\s+\w+\s*:/.test(s)) return 'python';
  if (/^\s*(import|export)\s+.*from\s+['"]/.test(s) || /\bconst\s+\w+\s*=/.test(s)) return 'javascript';
  if (/^\s*(interface|type)\s+\w+\s*[<={]/.test(s)) return 'typescript';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/i.test(s)) return 'sql';
  if (/^\s*[{[]/.test(s) && /[}\]]\s*$/.test(s)) {
    try { JSON.parse(s); return 'json'; } catch(e) {}
  }
  if (/^#!\/usr\/bin\/env\s+bash|^#!\/bin\/(ba)?sh/.test(s)) return 'bash';
  if (/^\s*(package|import)\s+.*\n.*func\s+\w+/.test(s)) return 'go';
  if (/^\s*<template>|^\s*<script/.test(s)) return 'vue';
  if (/^\s*#\s+/.test(s)) return 'markdown';
  return null;
}

async function fileToAttachment(file) {
  const kind = detectKind(file.name, file.type);
  const base = {
    id: 'att-' + Math.random().toString(36).slice(2, 10),
    name: file.name || `capture-${Date.now()}`,
    size: file.size,
    mime: file.type || '',
    kind,
    url: URL.createObjectURL(file),
  };

  try {
    if (kind === 'image') {
      // Handled elsewhere as media, but return preview
      return { ...base, thumbUrl: base.url };
    }
    if (kind === 'txt' || kind === 'md' || kind === 'csv' || kind === 'json' || kind === 'code') {
      const text = await file.text();
      let lang = detectLangFromExt(file.name);
      if (!lang && kind === 'code') lang = detectLangFromContent(text);
      if (kind === 'json') lang = 'json';
      if (kind === 'md') lang = 'markdown';
      return { ...base, text, lang, lines: text.split('\n').length };
    }
    if (kind === 'pdf') {
      const buf = await file.arrayBuffer();
      const text = await extractPdfText(buf);
      return { ...base, text, pages: text.split('\f').length };
    }
    if (kind === 'docx') {
      const buf = await file.arrayBuffer();
      const text = await extractDocxText(buf);
      return { ...base, text };
    }
    return base;
  } catch (e) {
    console.warn('attachment parse failed', e);
    return { ...base, error: e.message };
  }
}

// --------- PDF text extraction via PDF.js CDN ---------
let _pdfjsLoading;
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (_pdfjsLoading) return _pdfjsLoading;
  _pdfjsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _pdfjsLoading;
}

async function extractPdfText(buf) {
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const parts = [];
    for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it => it.str).join(' ');
      parts.push(pageText);
    }
    return parts.join('\n\f\n');
  } catch (e) {
    return `[Impossible d'extraire le PDF : ${e.message}]`;
  }
}

// --------- DOCX text extraction (unzip inline) ---------
async function extractDocxText(buf) {
  try {
    const bytes = new Uint8Array(buf);
    const dv = new DataView(buf);
    // Locate EOCD
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return '[DOCX invalide]';
    const cdOffset = dv.getUint32(eocd + 16, true);
    const totalEntries = dv.getUint16(eocd + 10, true);

    let p = cdOffset;
    let target = null;
    for (let i = 0; i < totalEntries; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const lhOffset = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen));
      if (name === 'word/document.xml') {
        target = { method, compSize, lhOffset };
        break;
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    if (!target) return '[document.xml introuvable]';
    const lh = target.lhOffset;
    const nameLen = dv.getUint16(lh + 26, true);
    const extraLen = dv.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nameLen + extraLen;
    const compBytes = bytes.slice(dataStart, dataStart + target.compSize);
    let xml;
    if (target.method === 0) xml = new TextDecoder().decode(compBytes);
    else {
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([compBytes]).stream().pipeThrough(ds);
      const decompressed = await new Response(stream).arrayBuffer();
      xml = new TextDecoder().decode(decompressed);
    }
    // Extract text
    return xml
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<w:br[^>]*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    return `[Impossible d'extraire le DOCX : ${e.message}]`;
  }
}

// --------- Format bytes ---------
function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

// --------- UI: attachment list ---------
function AttachmentList({ attachments, onRemove, onPreview }) {
  if (!attachments?.length) return null;
  return (
    <div className="attach-list">
      {attachments.map(a => (
        <div key={a.id} className="attach-item" onClick={() => onPreview?.(a)}>
          <div className={`attach-icon ${a.kind}`}>{iconLabel(a)}</div>
          <div className="attach-body">
            <div className="attach-name">{a.name}</div>
            <div className="attach-meta">
              {a.kind.toUpperCase()} · {fmtBytes(a.size)}
              {a.lines ? ` · ${a.lines} lignes` : ''}
              {a.pages ? ` · ${a.pages} page${a.pages>1?'s':''}` : ''}
              {a.lang ? ` · ${a.lang}` : ''}
              {a.text && !a.pages && !a.lines ? ` · ${a.text.length} car.` : ''}
            </div>
          </div>
          <div className="attach-actions" onClick={e => e.stopPropagation()}>
            {a.text && (
              <button title="Copier le texte extrait" onClick={async () => {
                await navigator.clipboard.writeText(a.text);
              }}><IconCopy size={12}/></button>
            )}
            <button title="Télécharger" onClick={() => {
              const link = document.createElement('a');
              link.href = a.url; link.download = a.name; link.click();
            }}><IconDownload size={12}/></button>
            {onRemove && <button title="Retirer" onClick={() => onRemove(a.id)}><IconX size={12}/></button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function iconLabel(a) {
  const map = { pdf: 'PDF', docx: 'DOC', xlsx: 'XLS', pptx: 'PPT', csv: 'CSV', json: '{}', md: 'MD', txt: 'TXT', code: '</>', zip: 'ZIP', audio: '♪', video: '▶', image: '🖼', generic: '?' };
  return map[a.kind] || (a.name.split('.').pop() || '?').slice(0, 4).toUpperCase();
}

// --------- Attachment preview modal ---------
function AttachmentPreview({ attachment, onClose, onToast }) {
  const a = attachment;
  if (!a) return null;

  const copy = async () => {
    if (a.text) {
      await navigator.clipboard.writeText(a.text);
      onToast?.('Contenu extrait copié');
    }
  };

  return (
    <div className="doc-preview-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="doc-preview-card">
        <div className="doc-preview-head">
          <div className={`attach-icon ${a.kind}`} style={{width:32, height:32}}>{iconLabel(a)}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a.name}</div>
            <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)'}}>
              {a.kind.toUpperCase()} · {fmtBytes(a.size)}
              {a.pages ? ` · ${a.pages} pages` : ''}
              {a.lines ? ` · ${a.lines} lignes` : ''}
              {a.lang ? ` · ${a.lang}` : ''}
            </div>
          </div>
          {a.text && (
            <button className="d-action" onClick={copy}><IconCopy/>Copier le texte</button>
          )}
          <button className="d-action" onClick={() => {
            const link = document.createElement('a');
            link.href = a.url; link.download = a.name; link.click();
          }}><IconDownload/>Télécharger</button>
          <button className="icon-btn" onClick={onClose}><IconX/></button>
        </div>
        <div className="doc-preview-body">
          <AttachmentBody a={a}/>
        </div>
      </div>
    </div>
  );
}

function AttachmentBody({ a }) {
  if (a.kind === 'image') {
    return <img src={a.url} alt="" style={{maxWidth:'100%', display:'block', margin:'0 auto', borderRadius:6}}/>;
  }
  if (a.kind === 'audio') return <audio controls src={a.url} style={{width:'100%'}}/>;
  if (a.kind === 'video') return <video controls src={a.url} style={{width:'100%', borderRadius:6}}/>;
  if (a.kind === 'pdf') {
    return (
      <div>
        <iframe src={a.url} style={{width:'100%', height:'70vh', border:'1px solid var(--line)', borderRadius:6, background:'white'}}/>
        {a.text && (
          <details style={{marginTop:12}}>
            <summary style={{cursor:'pointer', color:'var(--text-3)', fontSize:12}}>
              Texte extrait ({a.text.length} car.)
            </summary>
            <pre style={{marginTop:8}}>{a.text.slice(0, 8000)}{a.text.length > 8000 ? '\n\n[…tronqué]' : ''}</pre>
          </details>
        )}
      </div>
    );
  }
  if (a.kind === 'csv' && a.text) {
    const rows = a.text.split(/\r?\n/).slice(0, 100).map(r => r.split(','));
    return (
      <table className="csv">
        <thead><tr>{rows[0]?.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    );
  }
  if (a.kind === 'json' && a.text) {
    try {
      return <pre>{JSON.stringify(JSON.parse(a.text), null, 2)}</pre>;
    } catch(e) { /* fallthrough */ }
  }
  if (a.kind === 'code' && a.text && a.lang) {
    // Reuse the SnippetBlock highlighter (via window.highlight isn't exported — quick inline reuse)
    const codeObj = { source: a.text, lang: a.lang };
    return <SnippetBlock code={codeObj}/>;
  }
  if (a.text) return <pre>{a.text}</pre>;
  return <div style={{color:'var(--text-3)', textAlign:'center', padding:40}}>Aperçu non disponible pour ce format. Vous pouvez le télécharger.</div>;
}

Object.assign(window, {
  fileToAttachment, detectKind, detectLangFromExt, detectLangFromContent,
  AttachmentList, AttachmentPreview, fmtBytes,
});

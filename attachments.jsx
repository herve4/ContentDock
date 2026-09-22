// ContentDock — Universal Document & Attachment Engine
// Support complet : PDF, Word (.docx), Excel (.xlsx, .csv), PowerPoint (.pptx), Texte, Markdown, Code, JSON
// Lecture, prévisualisation interactive haute fidélité et modification avec persistance locale
const { useState: useStateAt, useEffect: useEffectAt, useMemo: useMemoAt, useRef: useRefAt } = React;

// --------- Détection des extensions & types MIME ---------
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
  if (ext === 'docx' || mime?.includes('wordprocessingml') || ext === 'doc') return 'docx';
  if (ext === 'xlsx' || ext === 'xls' || mime?.includes('spreadsheetml')) return 'xlsx';
  if (ext === 'pptx' || ext === 'ppt' || mime?.includes('presentationml')) return 'pptx';
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

// --------- Helper Unzip OpenXML universel (sans dépendance externe) ---------
async function extractZipEntries(buf) {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;

  const cdOffset = dv.getUint32(eocd + 16, true);
  const totalEntries = dv.getUint16(eocd + 10, true);
  const entries = {};

  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const lhOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen));
    entries[name] = { method, compSize, lhOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }

  async function readText(name) {
    const target = entries[name];
    if (!target) return null;
    const lh = target.lhOffset;
    const nameLen = dv.getUint16(lh + 26, true);
    const extraLen = dv.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nameLen + extraLen;
    const compBytes = bytes.slice(dataStart, dataStart + target.compSize);
    if (target.method === 0) {
      return new TextDecoder().decode(compBytes);
    } else {
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([compBytes]).stream().pipeThrough(ds);
      const decompressed = await new Response(stream).arrayBuffer();
      return new TextDecoder().decode(decompressed);
    }
  }

  return { entries, readText };
}

// --------- 1. Parseur Word (.docx) structuré ---------
async function extractDocxStructured(buf) {
  try {
    const zip = await extractZipEntries(buf);
    if (!zip) return { text: '[Fichier DOCX invalide]', blocks: [] };
    const xml = await zip.readText('word/document.xml');
    if (!xml) return { text: '[Document Word sans contenu]', blocks: [] };

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const pNodes = doc.querySelectorAll('p');
    const blocks = [];
    const plainLines = [];

    pNodes.forEach(p => {
      const pStyle = p.querySelector('pStyle')?.getAttribute('w:val') || '';
      const isHeading1 = /heading\s*1|titre\s*1/i.test(pStyle);
      const isHeading2 = /heading\s*2|titre\s*2/i.test(pStyle);
      const isHeading3 = /heading\s*3|titre\s*3/i.test(pStyle);
      const isBullet = !!p.querySelector('numPr');
      const tNodes = p.querySelectorAll('t');
      const text = Array.from(tNodes).map(t => t.textContent).join('');

      if (text.trim()) {
        const type = isHeading1 ? 'h1' : isHeading2 ? 'h2' : isHeading3 ? 'h3' : isBullet ? 'bullet' : 'p';
        blocks.push({ type, text });
        plainLines.push(text);
      }
    });

    const fullText = plainLines.join('\n\n');
    return { text: fullText, blocks };
  } catch (e) {
    return { text: `[Erreur lecture DOCX : ${e.message}]`, blocks: [] };
  }
}

// --------- 2. Parseur Excel (.xlsx) structuré ---------
async function extractXlsxData(buf) {
  try {
    const zip = await extractZipEntries(buf);
    if (!zip) return { sheets: [{ name: 'Feuille 1', rows: [['Fichier Excel invalide']] }] };

    // 1. Lire sharedStrings.xml
    const ssXml = await zip.readText('xl/sharedStrings.xml');
    const sharedStrings = [];
    if (ssXml) {
      const parser = new DOMParser();
      const ssDoc = parser.parseFromString(ssXml, 'application/xml');
      ssDoc.querySelectorAll('si').forEach(si => {
        const t = Array.from(si.querySelectorAll('t')).map(x => x.textContent).join('');
        sharedStrings.push(t);
      });
    }

    // 2. Lire la première feuille de calcul
    const sheetXml = await zip.readText('xl/worksheets/sheet1.xml') || await zip.readText('xl/worksheets/sheet.xml');
    if (!sheetXml) return { sheets: [{ name: 'Feuille 1', rows: [['Feuille vide']] }] };

    const parser = new DOMParser();
    const wsDoc = parser.parseFromString(sheetXml, 'application/xml');
    const rowNodes = wsDoc.querySelectorAll('row');
    const rows = [];

    rowNodes.forEach(r => {
      const rowArr = [];
      const cNodes = r.querySelectorAll('c');
      cNodes.forEach(c => {
        const t = c.getAttribute('t');
        const vNode = c.querySelector('v');
        let val = vNode ? vNode.textContent : '';
        if (t === 's' && sharedStrings[parseInt(val)]) {
          val = sharedStrings[parseInt(val)];
        } else if (t === 'inlineStr') {
          val = c.querySelector('is t')?.textContent || '';
        }
        rowArr.push(val);
      });
      if (rowArr.length > 0) rows.push(rowArr);
    });

    if (rows.length === 0) rows.push(['Feuille sans données']);
    return {
      sheets: [{ name: 'Feuille 1', rows }],
      totalRows: rows.length,
      totalCols: Math.max(...rows.map(r => r.length), 1)
    };
  } catch (e) {
    return {
      sheets: [{ name: 'Erreur', rows: [[`Erreur lecture Excel : ${e.message}`]] }],
      totalRows: 1,
      totalCols: 1
    };
  }
}

// --------- 3. Parseur PowerPoint (.pptx) structuré ---------
async function extractPptxData(buf) {
  try {
    const zip = await extractZipEntries(buf);
    if (!zip) return { slides: [{ index: 1, title: 'Présentation', points: ['Fichier PPTX invalide'] }] };

    const slideNames = Object.keys(zip.entries)
      .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
        return numA - numB;
      });

    if (slideNames.length === 0) {
      return { slides: [{ index: 1, title: 'Présentation vide', points: [] }] };
    }

    const parser = new DOMParser();
    const slides = [];

    for (let i = 0; i < slideNames.length; i++) {
      const xml = await zip.readText(slideNames[i]);
      if (!xml) continue;
      const doc = parser.parseFromString(xml, 'application/xml');
      const pNodes = doc.querySelectorAll('p');
      const lines = [];

      pNodes.forEach(p => {
        const tNodes = p.querySelectorAll('t');
        const text = Array.from(tNodes).map(t => t.textContent).join('').trim();
        if (text) lines.push(text);
      });

      const title = lines[0] || `Diapositive ${i + 1}`;
      const points = lines.slice(1);
      slides.push({
        index: i + 1,
        title,
        points: points.length > 0 ? points : ['[Contenu visuel ou graphique]']
      });
    }

    return { slides: slides.length > 0 ? slides : [{ index: 1, title: 'Diapositive 1', points: [] }] };
  } catch (e) {
    return { slides: [{ index: 1, title: 'Erreur PPTX', points: [e.message] }] };
  }
}

// --------- 4. Parseur CSV & Délimiteurs ---------
function parseCsvData(text) {
  const lines = (text || '').split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [['']];
  const first = lines[0];
  const delim = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
  return lines.map(line => line.split(delim).map(cell => cell.trim().replace(/^"|"$/g, '')));
}

function exportRowsToCsv(rows, delim = ',') {
  return (rows || [])
    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(delim))
    .join('\n');
}

// --------- 5. Extraction PDF via PDF.js ---------
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
    return `[Impossible d'extraire le texte PDF : ${e.message}]`;
  }
}

// --------- 6. Conversion Universelle d'un Fichier en Pièce Jointe ---------
async function fileToAttachment(file) {
  const kind = detectKind(file.name, file.type);
  const blobUrl = URL.createObjectURL(file);

  // Conversion en DataURL pour persistance locale SQLite pérenne
  let dataUrl = '';
  try {
    if (file.size < 15 * 1024 * 1024) {
      dataUrl = await window.fileToDataUrl(file);
    }
  } catch(e) {}

  const base = {
    id: 'att-' + Math.random().toString(36).slice(2, 10),
    name: file.name || `document-${Date.now()}`,
    size: file.size,
    mime: file.type || '',
    kind,
    url: blobUrl,
    dataUrl: dataUrl || blobUrl,
    updated_at: Date.now()
  };

  try {
    if (kind === 'image') {
      return { ...base, thumbUrl: base.dataUrl || base.url };
    }

    if (kind === 'pdf') {
      const buf = await file.arrayBuffer();
      const text = await extractPdfText(buf);
      return { ...base, text, pages: text.split('\f').length };
    }

    if (kind === 'docx') {
      const buf = await file.arrayBuffer();
      const docxData = await extractDocxStructured(buf);
      return { ...base, text: docxData.text, blocks: docxData.blocks };
    }

    if (kind === 'xlsx') {
      const buf = await file.arrayBuffer();
      const xlsxData = await extractXlsxData(buf);
      const textCsv = exportRowsToCsv(xlsxData.sheets[0].rows);
      return { ...base, sheets: xlsxData.sheets, text: textCsv, rowsCount: xlsxData.totalRows };
    }

    if (kind === 'pptx') {
      const buf = await file.arrayBuffer();
      const pptxData = await extractPptxData(buf);
      const textSummary = pptxData.slides.map(s => `# ${s.title}\n${s.points.join('\n')}`).join('\n\n');
      return { ...base, slides: pptxData.slides, text: textSummary };
    }

    if (kind === 'csv') {
      const text = await file.text();
      const rows = parseCsvData(text);
      return { ...base, text, sheets: [{ name: 'CSV', rows }], rowsCount: rows.length };
    }

    if (['txt', 'md', 'json', 'code'].includes(kind)) {
      const text = await file.text();
      let lang = detectLangFromExt(file.name);
      if (kind === 'json') lang = 'json';
      if (kind === 'md') lang = 'markdown';
      return { ...base, text, lang, lines: text.split('\n').length };
    }

    return base;
  } catch (e) {
    console.warn('[ContentDock] Erreur analyse attachment :', e);
    return { ...base, error: e.message };
  }
}

// Helper pour créer un document vierge directement dans un brouillon
function createBlankDoc(kind, customName) {
  const id = 'att-' + Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  if (kind === 'xlsx' || kind === 'csv') {
    const rows = [
      ['Titre', 'Description', 'Priorité', 'Statut'],
      ['Lancement Q4', 'Préparation communication', 'Haute', 'En cours'],
      ['Shooting visuels', 'Packshots produits 4K', 'Moyenne', 'Prêt'],
      ['Revue équipe', 'Point hebdomadaire', 'Basse', 'Planifié']
    ];
    const text = exportRowsToCsv(rows);
    return {
      id,
      name: customName || `Tableur_${new Date().toISOString().slice(0,10)}.xlsx`,
      kind: 'xlsx',
      size: 1024,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sheets: [{ name: 'Feuille 1', rows }],
      text,
      rowsCount: rows.length,
      updated_at: now
    };
  }
  if (kind === 'pptx') {
    const slides = [
      { index: 1, title: 'Stratégie de Publication', points: ['Objectifs de croissance', 'Cible principale', 'Calendrier prévisionnel'] },
      { index: 2, title: 'Axes Éditoriaux', points: ['Contenus pédagogiques', 'Témoignages & retours d’expérience', 'Annonces produits'] },
      { index: 3, title: 'Prochaines Étapes', points: ['Validation des brouillons', 'Programmation des créneaux', 'Suivi des performances'] }
    ];
    return {
      id,
      name: customName || `Presentation_${new Date().toISOString().slice(0,10)}.pptx`,
      kind: 'pptx',
      size: 2048,
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      slides,
      text: slides.map(s => `# ${s.title}\n${s.points.join('\n')}`).join('\n\n'),
      updated_at: now
    };
  }
  if (kind === 'docx') {
    const text = `# Note de Cadrage — ContentDock\n\nCe document regroupe les orientations éditoriales et les notes de production.\n\n## Points Clés\n- Clarté et concision\n- Respect de la charte visuelle\n- Planification sur les créneaux optimaux`;
    return {
      id,
      name: customName || `Document_${new Date().toISOString().slice(0,10)}.docx`,
      kind: 'docx',
      size: 1536,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text,
      blocks: [
        { type: 'h1', text: 'Note de Cadrage — ContentDock' },
        { type: 'p', text: 'Ce document regroupe les orientations éditoriales et les notes de production.' },
        { type: 'h2', text: 'Points Clés' },
        { type: 'bullet', text: 'Clarté et concision' },
        { type: 'bullet', text: 'Respect de la charte visuelle' },
        { type: 'bullet', text: 'Planification sur les créneaux optimaux' }
      ],
      updated_at: now
    };
  }
  // Par défaut : Note texte/markdown
  return {
    id,
    name: customName || `Note_${new Date().toISOString().slice(0,10)}.md`,
    kind: 'md',
    size: 512,
    mime: 'text/markdown',
    text: `# Nouvelle Note\n\nRédigez votre contenu ici...`,
    lang: 'markdown',
    lines: 3,
    updated_at: now
  };
}

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' Ko';
  return (n / 1024 / 1024).toFixed(1) + ' Mo';
}

function iconLabel(a) {
  const map = {
    pdf: 'PDF', docx: 'DOC', xlsx: 'XLS', pptx: 'PPT',
    csv: 'CSV', json: '{}', md: 'MD', txt: 'TXT', code: '</>',
    zip: 'ZIP', audio: '♪', video: '▶', image: '🖼', generic: '?'
  };
  return map[a.kind] || (a.name.split('.').pop() || '?').slice(0, 4).toUpperCase();
}

function kindBadgeStyle(kind) {
  const colors = {
    pdf: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    docx: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    xlsx: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    csv: { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
    pptx: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
    md: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
    txt: { bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1', border: 'rgba(148,163,184,0.3)' },
    code: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    json: { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
  };
  return colors[kind] || { bg: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: 'rgba(255,255,255,0.15)' };
}

// =========================================================================
// COMPOSANT 1 : Visionneuse & Éditeur Excel / CSV (Tableur interactif)
// =========================================================================
function SheetViewerEditor({ attachment, isEditing, onUpdateData }) {
  const sheets = attachment.sheets || [{ name: 'Feuille 1', rows: parseCsvData(attachment.text || '') }];
  const currentSheet = sheets[0] || { name: 'Feuille 1', rows: [['']] };
  const [rows, setRows] = useStateAt(currentSheet.rows || [['']]);
  const [activeCell, setActiveCell] = useStateAt(null);
  const [searchQuery, setSearchQuery] = useStateAt('');

  useEffectAt(() => {
    if (currentSheet.rows) setRows(currentSheet.rows);
  }, [attachment]);

  const updateCell = (rIdx, cIdx, val) => {
    const copy = rows.map((r, i) => i === rIdx ? r.map((c, j) => j === cIdx ? val : c) : [...r]);
    setRows(copy);
    onUpdateData?.({
      sheets: [{ name: currentSheet.name, rows: copy }],
      text: exportRowsToCsv(copy)
    });
  };

  const addRow = () => {
    const colCount = Math.max(...rows.map(r => r.length), 1);
    const newRow = new Array(colCount).fill('');
    const copy = [...rows, newRow];
    setRows(copy);
    onUpdateData?.({ sheets: [{ name: currentSheet.name, rows: copy }], text: exportRowsToCsv(copy) });
  };

  const addColumn = () => {
    const copy = rows.map(r => [...r, '']);
    setRows(copy);
    onUpdateData?.({ sheets: [{ name: currentSheet.name, rows: copy }], text: exportRowsToCsv(copy) });
  };

  const deleteRow = (rIdx) => {
    if (rows.length <= 1) return;
    const copy = rows.filter((_, i) => i !== rIdx);
    setRows(copy);
    onUpdateData?.({ sheets: [{ name: currentSheet.name, rows: copy }], text: exportRowsToCsv(copy) });
  };

  const colHeaders = useMemoAt(() => {
    const maxCols = Math.max(...rows.map(r => r.length), 1);
    return Array.from({ length: maxCols }, (_, i) => String.fromCharCode(65 + (i % 26)));
  }, [rows]);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', minHeight:420}}>
      {/* Barre d'outils tableur */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-2, #18191d)', borderBottom:'1px solid var(--line, #282930)', gap:8, flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:12, fontWeight:700, color:'var(--accent, #ff5a1f)'}}>📊 {currentSheet.name}</span>
          <span style={{fontSize:11, color:'var(--text-3, #888)'}}>· {rows.length} lignes · {colHeaders.length} colonnes</span>
          {activeCell && (
            <span style={{fontSize:11, fontFamily:'var(--mono)', background:'var(--bg-3, #22232a)', padding:'2px 8px', borderRadius:4, color:'var(--text-2)'}}>
              fx ({colHeaders[activeCell.col]}{activeCell.row + 1}) : {rows[activeCell.row]?.[activeCell.col] || '—'}
            </span>
          )}
        </div>

        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <input
            type="text"
            placeholder="Rechercher dans les cellules…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{background:'var(--bg-3, #22232a)', border:'1px solid var(--line, #333)', borderRadius:6, padding:'4px 8px', fontSize:11.5, color:'#fff', width:180}}
          />
          {isEditing && (
            <>
              <button className="btn ghost" onClick={addRow} style={{padding:'4px 8px', fontSize:11}}>+ Ligne</button>
              <button className="btn ghost" onClick={addColumn} style={{padding:'4px 8px', fontSize:11}}>+ Colonne</button>
            </>
          )}
        </div>
      </div>

      {/* Grille du tableur */}
      <div style={{flex:1, overflow:'auto', background:'var(--bg, #101014)', padding:8}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:'-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'}}>
          <thead>
            <tr>
              <th style={{width:40, background:'var(--bg-3, #1e1f26)', border:'1px solid var(--line, #2c2d36)', padding:'6px 8px', color:'var(--text-4, #777)', fontSize:11, textAlign:'center'}}>#</th>
              {colHeaders.map((h, i) => (
                <th key={i} style={{background:'var(--bg-3, #1e1f26)', border:'1px solid var(--line, #2c2d36)', padding:'6px 12px', color:'var(--text-2, #ccc)', fontWeight:600, textAlign:'left', minWidth:120}}>
                  {h}
                </th>
              ))}
              {isEditing && <th style={{width:40, background:'var(--bg-3, #1e1f26)', border:'1px solid var(--line, #2c2d36)'}}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const matchesSearch = !searchQuery || row.some(c => String(c).toLowerCase().includes(searchQuery.toLowerCase()));
              if (!matchesSearch) return null;

              return (
                <tr key={rIdx} style={{background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'}}>
                  <td style={{background:'var(--bg-2, #18191d)', border:'1px solid var(--line, #282932)', padding:'6px 8px', textAlign:'center', color:'var(--text-4, #777)', fontSize:11, userSelect:'none'}}>
                    {rIdx + 1}
                  </td>
                  {colHeaders.map((_, cIdx) => {
                    const cellVal = row[cIdx] || '';
                    const isMatched = searchQuery && String(cellVal).toLowerCase().includes(searchQuery.toLowerCase());

                    return (
                      <td
                        key={cIdx}
                        onClick={() => setActiveCell({ row: rIdx, col: cIdx })}
                        style={{
                          border:'1px solid var(--line, #282932)',
                          padding: isEditing ? 2 : '6px 10px',
                          color: isMatched ? '#ff834f' : 'var(--text, #eee)',
                          background: isMatched ? 'rgba(255,90,31,0.1)' : activeCell?.row === rIdx && activeCell?.col === cIdx ? 'rgba(255,90,31,0.06)' : 'transparent',
                          outline: activeCell?.row === rIdx && activeCell?.col === cIdx ? '1px solid var(--accent, #ff5a1f)' : 'none'
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={cellVal}
                            onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                            style={{width:'100%', background:'transparent', border:'none', color:'inherit', padding:'4px 6px', fontSize:12, fontFamily:'inherit'}}
                          />
                        ) : (
                          <div style={{minHeight:18, wordBreak:'break-word'}}>{cellVal || <span style={{color:'var(--text-4, #555)'}}>—</span>}</div>
                        )}
                      </td>
                    );
                  })}
                  {isEditing && (
                    <td style={{border:'1px solid var(--line, #282932)', textAlign:'center', padding:2}}>
                      <button
                        title="Supprimer la ligne"
                        onClick={() => deleteRow(rIdx)}
                        style={{background:'none', border:'none', color:'var(--danger, #f87171)', cursor:'pointer', fontSize:12, padding:'2px 6px'}}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// COMPOSANT 2 : Visionneuse & Éditeur Word (.docx) & Documents Textes
// =========================================================================
function DocxViewerEditor({ attachment, isEditing, onUpdateData }) {
  const [text, setText] = useStateAt(attachment.text || '');

  useEffectAt(() => {
    setText(attachment.text || '');
  }, [attachment.text]);

  const handleChange = val => {
    setText(val);
    onUpdateData?.({ text: val, lines: val.split('\n').length });
  };

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('docx-editor-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end) || 'Texte';
    const replacement = `${prefix}${selected}${suffix}`;
    const nextText = text.substring(0, start) + replacement + text.substring(end);
    handleChange(nextText);
  };

  const wordCount = useMemoAt(() => text.split(/\s+/).filter(Boolean).length, [text]);
  const charCount = text.length;
  const readTimeMin = Math.max(1, Math.round(wordCount / 200));

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', minHeight:420}}>
      {/* Barre d'outils du document */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'var(--bg-2, #18191d)', borderBottom:'1px solid var(--line, #282930)', gap:8, flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, fontSize:11.5, color:'var(--text-3, #888)'}}>
          <span style={{fontWeight:600, color:'var(--text-2, #ccc)'}}>📄 {attachment.name}</span>
          <span>· {wordCount} mots · {charCount} caractères · ~{readTimeMin} min de lecture</span>
        </div>

        {isEditing && (
          <div style={{display:'flex', gap:4, alignItems:'center'}}>
            <button className="btn ghost" onClick={() => insertFormatting('# ', '')} style={{padding:'3px 8px', fontSize:11}}>H1</button>
            <button className="btn ghost" onClick={() => insertFormatting('## ', '')} style={{padding:'3px 8px', fontSize:11}}>H2</button>
            <button className="btn ghost" onClick={() => insertFormatting('**', '**')} style={{padding:'3px 8px', fontSize:11}}><b>B</b></button>
            <button className="btn ghost" onClick={() => insertFormatting('*', '*')} style={{padding:'3px 8px', fontSize:11}}><i>I</i></button>
            <button className="btn ghost" onClick={() => insertFormatting('- ', '')} style={{padding:'3px 8px', fontSize:11}}>• Puces</button>
            <button className="btn ghost" onClick={() => insertFormatting('> ', '')} style={{padding:'3px 8px', fontSize:11}}>Citation</button>
          </div>
        )}
      </div>

      {/* Corps du document */}
      <div style={{flex:1, overflow:'auto', background:'var(--bg, #0d0d10)', padding:'24px 16px', display:'flex', justifyContent:'center'}}>
        <div style={{
          width:'100%',
          maxWidth: 780,
          background: 'var(--bg-2, #16171c)',
          border: '1px solid var(--line, #2a2b33)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          padding: '36px 40px',
          minHeight: 520
        }}>
          {isEditing ? (
            <textarea
              id="docx-editor-textarea"
              value={text}
              onChange={e => handleChange(e.target.value)}
              placeholder="Rédigez ou modifiez votre document ici (support Markdown et texte riche)..."
              style={{
                width: '100%',
                height: 480,
                background: 'transparent',
                border: 'none',
                color: 'var(--text, #f0f0f4)',
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          ) : (
            <div style={{color:'var(--text, #ececf2)', fontSize:14.5, lineHeight:1.75}}>
              {text ? text.split('\n\n').map((para, idx) => {
                if (para.startsWith('# ')) {
                  return <h1 key={idx} style={{fontSize:22, fontWeight:800, margin:'18px 0 10px', color:'var(--text-1, #fff)'}}>{para.replace('# ', '')}</h1>;
                }
                if (para.startsWith('## ')) {
                  return <h2 key={idx} style={{fontSize:18, fontWeight:700, margin:'16px 0 8px', color:'var(--accent, #ff5a1f)'}}>{para.replace('## ', '')}</h2>;
                }
                if (para.startsWith('### ')) {
                  return <h3 key={idx} style={{fontSize:15, fontWeight:600, margin:'14px 0 6px'}}>{para.replace('### ', '')}</h3>;
                }
                if (para.startsWith('- ') || para.startsWith('• ')) {
                  const items = para.split('\n');
                  return (
                    <ul key={idx} style={{paddingLeft:22, margin:'10px 0'}}>
                      {items.map((it, j) => <li key={j} style={{marginBottom:4}}>{it.replace(/^[-•]\s*/, '')}</li>)}
                    </ul>
                  );
                }
                return <p key={idx} style={{marginBottom:14, color:'var(--text-2, #d5d5df)'}}>{para}</p>;
              }) : (
                <div style={{color:'var(--text-4, #777)', fontStyle:'italic', textAlign:'center', padding:40}}>
                  Ce document ne contient pas encore de texte. Cliquez sur « ✏️ Modifier » pour commencer la rédaction.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// COMPOSANT 3 : Visionneuse & Éditeur PowerPoint (.pptx)
// =========================================================================
function PptxViewerEditor({ attachment, isEditing, onUpdateData }) {
  const slides = attachment.slides || [{ index: 1, title: 'Présentation', points: ['Contenu de diapositive'] }];
  const [currentSlideIdx, setCurrentSlideIdx] = useStateAt(0);

  const activeSlide = slides[currentSlideIdx] || slides[0] || { index: 1, title: 'Diapositive', points: [] };

  const updateSlideTitle = title => {
    const copy = slides.map((s, idx) => idx === currentSlideIdx ? { ...s, title } : s);
    onUpdateData?.({ slides: copy });
  };

  const updateSlidePoint = (pIdx, text) => {
    const copy = slides.map((s, idx) => {
      if (idx !== currentSlideIdx) return s;
      const pts = s.points.map((p, j) => j === pIdx ? text : p);
      return { ...s, points: pts };
    });
    onUpdateData?.({ slides: copy });
  };

  const addPoint = () => {
    const copy = slides.map((s, idx) => idx === currentSlideIdx ? { ...s, points: [...s.points, 'Nouvel axe'] } : s);
    onUpdateData?.({ slides: copy });
  };

  const deletePoint = (pIdx) => {
    const copy = slides.map((s, idx) => idx === currentSlideIdx ? { ...s, points: s.points.filter((_, j) => j !== pIdx) } : s);
    onUpdateData?.({ slides: copy });
  };

  const addSlide = () => {
    const newSlide = {
      index: slides.length + 1,
      title: `Diapositive ${slides.length + 1}`,
      points: ['Nouveau point clé']
    };
    const copy = [...slides, newSlide];
    onUpdateData?.({ slides: copy });
    setCurrentSlideIdx(copy.length - 1);
  };

  const deleteSlide = (sIdx) => {
    if (slides.length <= 1) return;
    const copy = slides.filter((_, idx) => idx !== sIdx).map((s, i) => ({ ...s, index: i + 1 }));
    onUpdateData?.({ slides: copy });
    setCurrentSlideIdx(Math.max(0, sIdx - 1));
  };

  return (
    <div style={{display:'flex', height:'100%', minHeight:440, background:'var(--bg, #0e0f13)'}}>
      {/* Volet gauche : Vignettes des diapositives */}
      <div style={{width:180, background:'var(--bg-2, #16171c)', borderRight:'1px solid var(--line, #262730)', padding:12, overflowY:'auto', display:'flex', flexDirection:'column', gap:10}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
          <span style={{fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--text-3, #888)'}}>Diapositives</span>
          {isEditing && (
            <button className="btn ghost" onClick={addSlide} style={{padding:'2px 6px', fontSize:11}} title="Ajouter une diapositive">+</button>
          )}
        </div>

        {slides.map((s, idx) => (
          <div
            key={idx}
            onClick={() => setCurrentSlideIdx(idx)}
            style={{
              borderRadius: 6,
              padding: '8px 10px',
              cursor: 'pointer',
              background: idx === currentSlideIdx ? 'rgba(255,90,31,0.12)' : 'var(--bg-3, #1f2027)',
              border: idx === currentSlideIdx ? '1px solid var(--accent, #ff5a1f)' : '1px solid var(--line, #2c2d36)',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            <div style={{fontSize:10, color:'var(--text-4, #777)', marginBottom:2}}>Slide {idx + 1}</div>
            <div style={{fontSize:11.5, fontWeight:600, color: idx === currentSlideIdx ? 'var(--accent, #ff5a1f)' : 'var(--text-2, #ddd)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {s.title}
            </div>
            {isEditing && slides.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                style={{position:'absolute', top:4, right:4, background:'none', border:'none', color:'var(--danger, #f87171)', fontSize:11, cursor:'pointer'}}
                title="Supprimer la slide"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Zone centrale : Écran 16:9 de la diapositive */}
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24}}>
        <div style={{
          width: '100%',
          maxWidth: 680,
          aspectRatio: '16 / 9',
          background: 'linear-gradient(135deg, #181920, #22232d)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
          padding: '36px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* En-tête de la slide */}
          <div>
            <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:1.2, color:'var(--accent, #ff5a1f)', fontWeight:700, marginBottom:8}}>
              ContentDock Presentation · {currentSlideIdx + 1}/{slides.length}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={activeSlide.title}
                onChange={e => updateSlideTitle(e.target.value)}
                placeholder="Titre de la diapositive..."
                style={{
                  width:'100%',
                  fontSize:22,
                  fontWeight:800,
                  color:'#fff',
                  background:'transparent',
                  border:'none',
                  borderBottom:'1px dashed var(--accent, #ff5a1f)',
                  padding:'4px 0',
                  outline:'none'
                }}
              />
            ) : (
              <h2 style={{fontSize:24, fontWeight:800, color:'#ffffff', margin:0, letterSpacing:-0.3}}>
                {activeSlide.title}
              </h2>
            )}
          </div>

          {/* Points de la slide */}
          <div style={{flex:1, marginTop:24, display:'flex', flexDirection:'column', gap:12}}>
            {activeSlide.points.map((pt, pIdx) => (
              <div key={pIdx} style={{display:'flex', alignItems:'center', gap:10}}>
                <span style={{color:'var(--accent, #ff5a1f)', fontSize:16, fontWeight:700}}>•</span>
                {isEditing ? (
                  <div style={{display:'flex', flex:1, gap:6, alignItems:'center'}}>
                    <input
                      type="text"
                      value={pt}
                      onChange={e => updateSlidePoint(pIdx, e.target.value)}
                      style={{flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid var(--line, #333)', borderRadius:6, padding:'6px 10px', color:'#fff', fontSize:13}}
                    />
                    <button onClick={() => deletePoint(pIdx)} style={{background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:12}}>✕</button>
                  </div>
                ) : (
                  <span style={{fontSize:14.5, color:'var(--text-2, #e0e0ea)', lineHeight:1.5}}>{pt}</span>
                )}
              </div>
            ))}
            {isEditing && (
              <button className="btn ghost" onClick={addPoint} style={{alignSelf:'flex-start', padding:'4px 10px', fontSize:11, marginTop:6}}>
                + Ajouter une puce
              </button>
            )}
          </div>

          {/* Pied de diapositive */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12}}>
            <span style={{fontSize:10.5, color:'var(--text-4, #777)'}}>ContentDock · Publication & Présentations</span>
            <span style={{fontSize:11, fontWeight:600, color:'var(--text-3, #aaa)', fontFamily:'var(--mono)'}}>Slide {currentSlideIdx + 1}</span>
          </div>
        </div>

        {/* Contrôles de navigation */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginTop:18}}>
          <button
            className="btn ghost"
            disabled={currentSlideIdx === 0}
            onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
            style={{padding:'6px 14px', fontSize:12}}
          >
            ← Précédente
          </button>
          <span style={{fontSize:12, color:'var(--text-3, #888)'}}>
            {currentSlideIdx + 1} / {slides.length}
          </span>
          <button
            className="btn ghost"
            disabled={currentSlideIdx === slides.length - 1}
            onClick={() => setCurrentSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
            style={{padding:'6px 14px', fontSize:12}}
          >
            Suivante →
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// COMPOSANT 4 : Visionneuse & Annotations PDF
// =========================================================================
function PdfViewerEditor({ attachment, isEditing, onUpdateData }) {
  const [tab, setTab] = useStateAt('preview'); // 'preview' ou 'text'
  const [notes, setNotes] = useStateAt(attachment.notes || '');

  const handleNotesChange = val => {
    setNotes(val);
    onUpdateData?.({ notes: val });
  };

  const pdfUrl = attachment.dataUrl || attachment.url;

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', minHeight:440}}>
      {/* Barre de sélection d'affichage */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'var(--bg-2, #18191d)', borderBottom:'1px solid var(--line, #282930)'}}>
        <div style={{display:'flex', gap:6}}>
          <button className={`btn ${tab === 'preview' ? 'primary' : 'ghost'}`} onClick={() => setTab('preview')} style={{padding:'4px 10px', fontSize:11.5}}>
            👁️ Document PDF
          </button>
          <button className={`btn ${tab === 'text' ? 'primary' : 'ghost'}`} onClick={() => setTab('text')} style={{padding:'4px 10px', fontSize:11.5}}>
            📝 Texte extrait ({attachment.text?.length || 0} car.)
          </button>
        </div>
        <div style={{fontSize:11, color:'var(--text-3, #888)'}}>
          {attachment.pages ? `${attachment.pages} page${attachment.pages>1?'s':''}` : 'Aperçu haute fidélité'}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{flex:1, overflow:'hidden', display:'flex'}}>
        {tab === 'preview' ? (
          <iframe
            src={pdfUrl}
            title={attachment.name}
            style={{width:'100%', height:'100%', minHeight:460, border:'none', background:'#fff'}}
          />
        ) : (
          <div style={{flex:1, padding:16, overflowY:'auto', background:'var(--bg, #101014)'}}>
            <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word', color:'var(--text-2, #ccc)', fontSize:12.5, lineHeight:1.6, fontFamily:'var(--mono)'}}>
              {attachment.text || 'Aucun texte n’a pu être extrait de ce document.'}
            </pre>
          </div>
        )}

        {/* Volet latéral de notes / annotations */}
        {isEditing && (
          <div style={{width:260, background:'var(--bg-2, #16171c)', borderLeft:'1px solid var(--line, #282930)', padding:14, display:'flex', flexDirection:'column'}}>
            <div style={{fontSize:12, fontWeight:700, color:'var(--accent, #ff5a1f)', marginBottom:8}}>📌 Notes sur le PDF</div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Ajoutez vos annotations, résumés ou directives sur ce document..."
              style={{flex:1, width:'100%', background:'var(--bg-3, #22232a)', border:'1px solid var(--line, #333)', borderRadius:6, padding:8, color:'#fff', fontSize:12, resize:'none'}}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// COMPOSANT 5 : Visionneuse & Éditeur Texte / Markdown / Code
// =========================================================================
function TextViewerEditor({ attachment, isEditing, onUpdateData }) {
  const [text, setText] = useStateAt(attachment.text || '');

  const handleChange = val => {
    setText(val);
    onUpdateData?.({ text: val, lines: val.split('\n').length });
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', minHeight:420}}>
      <div style={{padding:'8px 14px', background:'var(--bg-2, #18191d)', borderBottom:'1px solid var(--line, #282930)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontSize:11.5, color:'var(--text-3, #888)'}}>{attachment.lang || 'texte'} · {text.split('\n').length} lignes</span>
      </div>
      <div style={{flex:1, padding:14, background:'var(--bg, #101014)', overflow:'auto'}}>
        {isEditing ? (
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            style={{width:'100%', height:'100%', minHeight:380, background:'transparent', border:'none', color:'var(--text, #eee)', fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.6, outline:'none'}}
          />
        ) : (
          <pre style={{margin:0, color:'var(--text-2, #ccc)', fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.6, whiteSpace:'pre-wrap'}}>
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// MODALE MAÎTRESSE : AttachmentPreview (Lecture & Édition)
// =========================================================================
function AttachmentPreview({ attachment, onClose, onUpdate, onToast }) {
  const [mode, setMode] = useStateAt('view'); // 'view' ou 'edit'
  const [currentAttachment, setCurrentAttachment] = useStateAt(attachment);
  const [hasChanges, setHasChanges] = useStateAt(false);

  useEffectAt(() => {
    setCurrentAttachment(attachment);
    setHasChanges(false);
  }, [attachment]);

  if (!currentAttachment) return null;
  const a = currentAttachment;
  const badge = kindBadgeStyle(a.kind);

  const handleUpdateData = changes => {
    setCurrentAttachment(prev => ({ ...prev, ...changes, updated_at: Date.now() }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate?.(currentAttachment);
    setHasChanges(false);
    onToast?.('Modifications du document enregistrées');
  };

  const handleCopy = async () => {
    const textToCopy = a.text || JSON.stringify(a.sheets || a.slides || '');
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      onToast?.('Contenu du document copié');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    // Si modifié ou document texte/tableur généré, télécharger les données modifiées
    if (a.sheets && (a.kind === 'xlsx' || a.kind === 'csv')) {
      const csv = exportRowsToCsv(a.sheets[0].rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      link.href = URL.createObjectURL(blob);
      link.download = a.name.replace(/\.[^.]+$/, '') + '.csv';
    } else if (a.text && !a.url?.startsWith('http')) {
      const blob = new Blob([a.text], { type: 'text/plain;charset=utf-8;' });
      link.href = URL.createObjectURL(blob);
      link.download = a.name;
    } else {
      link.href = a.dataUrl || a.url;
      link.download = a.name;
    }
    link.click();
  };

  return (
    <div className="doc-preview-modal" onClick={e => e.target === e.currentTarget && onClose()} style={{zIndex:99999}}>
      <div className="doc-preview-card" style={{maxWidth: 1020, width:'94vw', maxHeight:'92vh', display:'flex', flexDirection:'column', borderRadius:10, overflow:'hidden', background:'var(--bg-1, #141418)', border:'1px solid var(--line, #282932)', boxShadow:'0 24px 64px rgba(0,0,0,0.7)'}}>
        
        {/* En-tête de la modale */}
        <div className="doc-preview-head" style={{padding:'12px 18px', borderBottom:'1px solid var(--line, #262730)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background:'var(--bg-2, #18191f)'}}>
          <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1}}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, letterSpacing: 0.5
            }}>
              {iconLabel(a)}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:700, color:'var(--text, #fff)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                {a.name}
              </div>
              <div style={{fontSize:11, color:'var(--text-3, #888)', fontFamily:'var(--mono)'}}>
                {a.kind.toUpperCase()} · {fmtBytes(a.size)}
                {a.pages ? ` · ${a.pages} pages` : ''}
                {a.rowsCount ? ` · ${a.rowsCount} lignes` : ''}
                {a.slides ? ` · ${a.slides.length} slides` : ''}
              </div>
            </div>
          </div>

          {/* Sélecteur de mode : Aperçu / Modifier */}
          <div style={{display:'flex', background:'var(--bg-3, #22232a)', padding:3, borderRadius:7, border:'1px solid var(--line, #333)'}}>
            <button
              onClick={() => setMode('view')}
              style={{
                background: mode === 'view' ? 'var(--accent, #ff5a1f)' : 'transparent',
                color: mode === 'view' ? '#fff' : 'var(--text-3, #999)',
                border: 'none', borderRadius: 5, padding: '4px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition:'all 0.15s'
              }}
            >
              👁️ Aperçu
            </button>
            <button
              onClick={() => setMode('edit')}
              style={{
                background: mode === 'edit' ? 'var(--accent, #ff5a1f)' : 'transparent',
                color: mode === 'edit' ? '#fff' : 'var(--text-3, #999)',
                border: 'none', borderRadius: 5, padding: '4px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition:'all 0.15s'
              }}
            >
              ✏️ Modifier
            </button>
          </div>

          {/* Actions globales */}
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            {hasChanges && (
              <button className="btn primary" onClick={handleSave} style={{padding:'5px 12px', fontSize:11.5}}>
                💾 Sauvegarder
              </button>
            )}
            <button className="btn ghost" onClick={handleCopy} title="Copier le texte" style={{padding:'5px 10px', fontSize:11.5}}>
              <IconCopy size={13}/>
            </button>
            <button className="btn ghost" onClick={handleDownload} title="Télécharger" style={{padding:'5px 10px', fontSize:11.5}}>
              <IconDownload size={13}/>
            </button>
            <button className="icon-btn" onClick={onClose} style={{background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:16, padding:'4px 8px'}}>
              ✕
            </button>
          </div>
        </div>

        {/* Corps modifiable selon le type */}
        <div style={{flex:1, overflow:'hidden', position:'relative', minHeight:440}}>
          {a.kind === 'xlsx' || a.kind === 'csv' ? (
            <SheetViewerEditor attachment={a} isEditing={mode === 'edit'} onUpdateData={handleUpdateData}/>
          ) : a.kind === 'docx' ? (
            <DocxViewerEditor attachment={a} isEditing={mode === 'edit'} onUpdateData={handleUpdateData}/>
          ) : a.kind === 'pptx' ? (
            <PptxViewerEditor attachment={a} isEditing={mode === 'edit'} onUpdateData={handleUpdateData}/>
          ) : a.kind === 'pdf' ? (
            <PdfViewerEditor attachment={a} isEditing={mode === 'edit'} onUpdateData={handleUpdateData}/>
          ) : (
            <TextViewerEditor attachment={a} isEditing={mode === 'edit'} onUpdateData={handleUpdateData}/>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// LISTE DES PIÈCES JOINTES AVEC BADGES DE FORMATS
// =========================================================================
function AttachmentList({ attachments, onRemove, onPreview }) {
  if (!attachments?.length) return null;

  return (
    <div className="attach-list" style={{display:'flex', flexDirection:'column', gap:6}}>
      {attachments.map(a => {
        const badge = kindBadgeStyle(a.kind);
        return (
          <div
            key={a.id}
            className="attach-item"
            onClick={() => onPreview?.(a)}
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'8px 12px', borderRadius:8, background:'var(--bg-2, #18191f)',
              border:'1px solid var(--line, #282932)', cursor:'pointer', transition:'all 0.15s ease'
            }}
          >
            <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1}}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize: 10, fontWeight: 800, letterSpacing: 0.5
              }}>
                {iconLabel(a)}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12.5, fontWeight:600, color:'var(--text, #fff)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {a.name}
                </div>
                <div style={{fontSize:10.5, color:'var(--text-3, #888)', fontFamily:'var(--mono)'}}>
                  {a.kind.toUpperCase()} · {fmtBytes(a.size)}
                  {a.pages ? ` · ${a.pages} p.` : ''}
                  {a.rowsCount ? ` · ${a.rowsCount} lig.` : ''}
                  {a.slides ? ` · ${a.slides.length} slides` : ''}
                </div>
              </div>
            </div>

            <div className="attach-actions" style={{display:'flex', alignItems:'center', gap:4}} onClick={e => e.stopPropagation()}>
              <button
                className="icon-btn"
                title="Consulter et modifier"
                onClick={() => onPreview?.(a)}
                style={{background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:4}}
              >
                <IconEye size={13}/>
              </button>
              {onRemove && (
                <button
                  className="icon-btn"
                  title="Supprimer la pièce jointe"
                  onClick={() => onRemove(a.id)}
                  style={{background:'none', border:'none', color:'var(--danger, #f87171)', cursor:'pointer', padding:4}}
                >
                  <IconX size={13}/>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export global pour utilisation dans toute l'application
Object.assign(window, {
  fileToAttachment,
  createBlankDoc,
  detectKind,
  detectLangFromExt,
  AttachmentList,
  AttachmentPreview,
  SheetViewerEditor,
  DocxViewerEditor,
  PptxViewerEditor,
  PdfViewerEditor,
  TextViewerEditor,
  fmtBytes,
});

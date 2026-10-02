// ContentDock — Données et Configuration Initiales
window.CD_DATA = (function() {

  // Espace par défaut propre (neutre et prêt à l'emploi)
  const workspaces = [
    { id: 'ws-main', name: 'Mon Espace', slug: 'mon-espace', color: '#ff5a1f', kind: 'mixed' },
  ];

  // Tags : démarre vierge pour que l'utilisateur crée ses propres tags personnalisés
  const tags = [];

  // Canaux de publication supportés
  const channels = {
    ig: { id: 'ig', label: 'Instagram', short: 'IG' },
    li: { id: 'li', label: 'LinkedIn',  short: 'in' },
    x:  { id: 'x',  label: 'X',         short: '𝕏' },
    fb: { id: 'fb', label: 'Facebook',  short: 'f'  },
    tt: { id: 'tt', label: 'TikTok',    short: 'TT' },
    bl: { id: 'bl', label: 'Blog',      short: '≡'  },
  };

  // Statuts ordonnés du flux de travail
  const statuses = [
    { id: 'idea',       label: 'Idée' },
    { id: 'creation',   label: 'En création' },
    { id: 'review',     label: 'À valider' },
    { id: 'ready',      label: 'Prêt' },
    { id: 'published',  label: 'Publié' },
  ];

  // Brouillons : démarre vierge pour que l'utilisateur commence sur une base saine
  const drafts = [];

  return { workspaces, tags, channels, statuses, drafts };
})();

// Helpers Médias & Protection Mémoire V8 (évite Out of Memory)
window.compressImageFile = async function(file, maxDimension = 1920, quality = 0.82) {
  if (!file || typeof file === 'string') return file;
  if (!file.type || !file.type.startsWith('image/')) return window.readAsRawDataUrl(file);
  // SVG et GIF animés ne doivent pas passer par le canvas pour préserver animations et vectoriel
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    if (file.size > 15 * 1024 * 1024) return URL.createObjectURL(file);
    return window.readAsRawDataUrl(file);
  }

  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          window.readAsRawDataUrl(file).then(resolve).catch(() => resolve(blobUrl));
          return;
        }

        // Si l'image est déjà légère (< 350 Ko) et de dimensions raisonnables (< 1920px)
        if (file.size < 350 * 1024 && width <= maxDimension && height <= maxDimension) {
          window.readAsRawDataUrl(file).then(resolve).catch(() => resolve(blobUrl));
          return;
        }

        // Redimensionnement proportionnel (réduit drastiquement l'usage mémoire)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          window.readAsRawDataUrl(file).then(resolve).catch(() => resolve(blobUrl));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // WebP offre la meilleure compression avec préservation de transparence
        let outMime = 'image/webp';
        let dataUrl = canvas.toDataURL(outMime, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          outMime = 'image/jpeg';
          dataUrl = canvas.toDataURL(outMime, quality);
        }
        resolve(dataUrl);
      } catch (err) {
        console.warn('[ContentDock ImageCompress] Fallback suite à erreur canvas :', err);
        window.readAsRawDataUrl(file).then(resolve).catch(() => resolve(blobUrl));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      window.readAsRawDataUrl(file).then(resolve).catch(() => resolve(blobUrl));
    };
    img.src = blobUrl;
  });
};

window.readAsRawDataUrl = function(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (typeof file === 'string') return resolve(file);
    // Garde anti-crash Out of Memory : si fichier > 15 Mo, utiliser un blob URL
    if (file.size > 15 * 1024 * 1024) {
      return resolve(URL.createObjectURL(file));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
};

window.fileToDataUrl = async function(file) {
  if (!file) return '';
  if (typeof file === 'string') return file;
  if (file.type && file.type.startsWith('image/')) {
    return await window.compressImageFile(file);
  }
  return await window.readAsRawDataUrl(file);
};

window.isVideoMedia = function(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('data:video/') ||
    url.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url)
  );
};

// Ouvreur de liens universel (Compatible Web, Tauri Desktop v2, et Mobile)
window.openUrl = async function(url) {
  if (!url) return;
  try {
    if (window.__TAURI__?.opener?.openUrl) {
      await window.__TAURI__.opener.openUrl(url);
      return;
    }
  } catch(e) {}
  try {
    if (window.__TAURI__?.shell?.open) {
      await window.__TAURI__.shell.open(url);
      return;
    }
  } catch(e) {}
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ============================================================
// HELPERS PARTAGE WHATSAPP (Direct, Formaté, & Récapitulatif)
// ============================================================
window.formatDraftForWhatsApp = function(draft, variantKey = null) {
  if (!draft) return '';
  const lines = [];
  lines.push(`📌 *${(draft.title || 'Sans titre').trim()}*`);

  const ch = window.CD_DATA?.channels?.[draft.channel]?.label || draft.channel?.toUpperCase() || 'Réseau Social';
  lines.push(`📡 _Canal cible : ${ch}_`);

  let textContent = '';
  if (variantKey && variantKey !== 'body' && draft.variants?.[variantKey]) {
    textContent = draft.variants[variantKey];
  } else {
    textContent = draft.body || '';
  }

  if (textContent.trim()) {
    lines.push('');
    lines.push(textContent.trim());
  }

  if (draft.hashtags && draft.hashtags.length > 0) {
    lines.push('');
    lines.push(draft.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
  }

  if (draft.attachments && draft.attachments.length > 0) {
    lines.push('');
    lines.push(`📎 _${draft.attachments.length} document(s) associé(s) : ${draft.attachments.map(a => a.name).join(', ')}_`);
  }

  lines.push('');
  lines.push(`— _Créé avec ContentDock_`);

  return lines.join('\n');
};

window.formatWorkspaceForWhatsApp = function(workspaceName, draftsList) {
  const list = draftsList || [];
  const lines = [];
  lines.push(`🚀 *ContentDock — Planning & Récapitulatif*`);
  lines.push(`📁 *Espace :* ${workspaceName || 'Mon Espace'}`);
  lines.push(`📊 *Total de contenus :* ${list.length}`);
  lines.push(`📅 *Date :* ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('─────────────────────────');

  if (list.length === 0) {
    lines.push(`_Aucun contenu dans cet espace pour le moment._`);
  } else {
    list.forEach((d, idx) => {
      const ch = window.CD_DATA?.channels?.[d.channel]?.label || d.channel?.toUpperCase() || 'Social';
      const statusLabel = window.CD_DATA?.statuses?.find(s => s.id === d.status)?.label || d.status;
      const triageEmoji = d.triage === 'good' ? ' [👍 Retenu]' : (d.triage === 'bad' ? ' [👎 À enlever]' : '');
      lines.push(`${idx + 1}️⃣ *${d.title || 'Sans titre'}*${triageEmoji}`);
      lines.push(`   📡 ${ch} · 🏷️ Statut : ${statusLabel}`);
      if (d.scheduled) {
        lines.push(`   ⏰ Prévu : Jour ${d.scheduled.day} à ${d.scheduled.hour}h`);
      }
      if (d.body) {
        const shortBody = d.body.length > 180 ? d.body.slice(0, 180).trim() + '…' : d.body.trim();
        lines.push(`   📝 ${shortBody.replace(/\n+/g, ' ')}`);
      }
      if (d.hashtags && d.hashtags.length > 0) {
        lines.push(`   🏷️ ${d.hashtags.map(h => `#${h}`).join(' ')}`);
      }
      lines.push('');
    });
  }

  lines.push('─────────────────────────');
  lines.push(`_Généré en direct depuis ContentDock Desktop & Mobile_`);
  return lines.join('\n');
};

window.shareToWhatsApp = function(text, onToast = null) {
  if (!text) return;
  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;
  window.openUrl(waUrl);
  if (onToast) onToast('Ouverture de WhatsApp…');
};

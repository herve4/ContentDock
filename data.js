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

// Helpers Médias Universels : Conversion Base64 hors-ligne & Détection Vidéo
window.fileToDataUrl = function(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (typeof file === 'string') return resolve(file);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
};

window.isVideoMedia = function(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('data:video/') ||
    /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url)
  );
};

// ContentDock — demo data
window.CD_DATA = (function() {

  const workspaces = [
    { id: 'ws-graph',  name: 'Studio Rouages',   slug: 'graph',  color: '#f472b6', kind: 'graph' },
    { id: 'ws-dev',    name: 'Dev Snippets',     slug: 'dev',    color: '#60a5fa', kind: 'dev'   },
    { id: 'ws-cm-a',   name: 'CM · Kombu Café',  slug: 'kombu',  color: '#4ade80', kind: 'cm'    },
    { id: 'ws-cm-b',   name: 'CM · Aurelia Skin',name: 'CM · Aurelia Skin', slug: 'aurelia', color: '#f59e0b', kind: 'cm' },
  ];

  const tags = [
    { id: 't-carrousel', label: 'carrousel', color: '#a78bfa', ws: 'ws-cm-a' },
    { id: 't-promo',     label: 'promo',     color: '#f472b6', ws: null },
    { id: 't-uiux',      label: 'ui-ux',     color: '#60a5fa', ws: 'ws-graph' },
    { id: 't-veille',    label: 'veille',    color: '#2dd4bf', ws: null },
    { id: 't-snippet',   label: 'snippet',   color: '#fbbf24', ws: 'ws-dev' },
    { id: 't-launch',    label: 'launch',    color: '#f87171', ws: 'ws-cm-b' },
    { id: 't-moodboard', label: 'moodboard', color: '#a78bfa', ws: 'ws-graph' },
    { id: 't-shortform', label: 'short-form',color: '#2dd4bf', ws: null },
  ];

  // Fix duplicate name issue
  workspaces[3] = { id: 'ws-cm-b', name: 'CM · Aurelia Skin', slug: 'aurelia', color: '#f59e0b', kind: 'cm' };

  const channels = {
    ig: { id: 'ig', label: 'Instagram', short: 'IG' },
    li: { id: 'li', label: 'LinkedIn',  short: 'in' },
    x:  { id: 'x',  label: 'X',         short: '𝕏' },
    fb: { id: 'fb', label: 'Facebook',  short: 'f'  },
    tt: { id: 'tt', label: 'TikTok',    short: 'TT' },
    bl: { id: 'bl', label: 'Blog',      short: '≡'  },
  };

  // Statuses in workflow order
  const statuses = [
    { id: 'idea',       label: 'Idée' },
    { id: 'creation',   label: 'En création' },
    { id: 'review',     label: 'À valider' },
    { id: 'ready',      label: 'Prêt' },
    { id: 'published',  label: 'Publié' },
  ];

  // Use ISO date strings YYYY-MM-DD. We'll use current UTC month for a coherent calendar.
  // Anchor date: 2026-09-16 (system-info) — but calendar starts empty of scheduled; we'll add
  // sample scheduled ones scattered across current month.

  const drafts = [
    // ---- CM · Kombu Café (posts pour un café) ----
    {
      id: 'd1', ws: 'ws-cm-a',
      title: 'Latte art du lundi — behind the bar',
      body: "Un lundi qui commence bien, c'est un lundi avec un cœur dessiné dans la mousse.\n\nCette semaine on remet en avant notre latte au caramel salé — le classique qui divise les avis en salle. Team caramel ou team matcha ?\n\n👉 Passez nous voir 7–17h, Rue des Tanneurs.",
      variants: {
        ig: "☕️ Lundi, mode doux.\nLatte caramel salé & rayons obliques — la formule.\n\nTeam caramel ✋ ou team matcha 🍵 ? On lit tout en commentaire.\n\n📍 Rue des Tanneurs · 7h-17h",
        x:  "lundi ≠ ennemi.\nlatte caramel salé, lumière d'automne, playlist lente. on ouvre à 7h ☕️",
        li: "Petit rappel : la meilleure façon de commencer sa semaine, ce n'est pas une to-do list.\n\nC'est un café pris debout au comptoir, en regardant les premiers rayons traverser la vitrine.\n\nOn vous attend."
      },
      hashtags: ['coffee', 'latteart', 'kombucafe', 'mondaymotivation', 'specialtycoffee'],
      images: ['assets/img/coffee-cup.jpg', 'assets/img/coffee-flatlay.jpg'],
      status: 'ready', channel: 'ig', tags: ['t-shortform'],
      scheduled: { day: 3, hour: 8 }, // day offset in current month
    },
    {
      id: 'd2', ws: 'ws-cm-a',
      title: 'Nouveau grain — Éthiopie Yirgacheffe',
      body: "Notre nouveau grain single-origin arrive vendredi. Notes de bergamote et de fleur d'oranger, torréfaction claire — parfait en filtre.",
      variants: {
        ig: "Nouveau grain ✨\nYirgacheffe · Éthiopie · torréfaction claire\nnotes de bergamote & fleur d'oranger\n\nDispo dès vendredi, en tasse et en sachet 250g.",
        li: "Sourcer un café, c'est raconter une histoire.\n\nCelle-ci commence à 1 900 m d'altitude, dans la coopérative Konga, région de Yirgacheffe.\n\nNotes de bergamote, corps léger, finale florale. Un café qui se laisse écouter.\n\nDispo à partir de vendredi ↓",
      },
      hashtags: ['ethiopia', 'yirgacheffe', 'singleorigin', 'filtercoffee'],
      images: ['assets/img/coffee-shop-laptop.jpg', 'assets/img/coffee-shop.jpg'],
      status: 'creation', channel: 'ig', tags: ['t-shortform', 't-promo'],
      scheduled: { day: 12, hour: 11 },
    },
    {
      id: 'd3', ws: 'ws-cm-a',
      title: 'Concours — 2 places brunch samedi',
      body: "Concours en story dimanche : 2 places brunch pour samedi prochain.",
      variants: {
        ig: "🎁 CONCOURS 🎁\n2 places pour notre brunch samedi 26.\n1. Follow @kombucafe\n2. Like ce post\n3. Tag 2 gourmand·es\n\nTirage au sort vendredi.",
      },
      hashtags: ['concours', 'brunchparis', 'giveaway'],
      images: ['assets/img/coffee-flatlay.jpg'],
      status: 'idea', channel: 'ig', tags: ['t-promo'],
      scheduled: null,
    },
    {
      id: 'd4', ws: 'ws-cm-a',
      title: 'Playlist automne — Spotify',
      body: "On a mis à jour notre playlist Spotify avec 20 nouveaux morceaux pour l'automne.",
      variants: {
        li: "Le café n'a jamais été qu'une affaire de tasse.\nUn bar, c'est aussi une lumière, une odeur, une playlist.\n\nNotre curation d'automne est en ligne : jazz feutré, ambient chaud, quelques classiques japonais.\n\n🎧 Lien en bio.",
      },
      hashtags: ['playlist', 'coffeeshopvibes', 'spotify'],
      images: ['assets/img/coffee-shop.jpg'],
      status: 'review', channel: 'li', tags: [],
      scheduled: { day: 8, hour: 17 },
    },

    // ---- CM · Aurelia Skin (marque skincare) ----
    {
      id: 'd5', ws: 'ws-cm-b',
      title: 'Sérum n°03 — teasing lancement',
      body: "Notre sérum bakuchiol arrive. On teasing sur 5 jours, avec un carrousel « avant / après » et une story quiz.",
      variants: {
        ig: "Un actif végétal, une texture huile-en-gel, une formule courte.\n\nn°03 · Sérum de nuit régénérant\nlancement · 24 septembre\n\nInscription liste d'attente — lien en bio.",
        li: "Nous sommes fiers d'annoncer le lancement de notre Sérum n°03.\n\nUne formule courte (11 ingrédients), autour du bakuchiol — l'alternative végétale au rétinol.\n\nDisponible le 24 septembre. Liste d'attente ouverte dès aujourd'hui.",
        x:  "n°03 est en route.\nsérum de nuit, bakuchiol, 11 ingrédients.\ndispo le 24/09 · liste d'attente en bio",
      },
      hashtags: ['skincare', 'bakuchiol', 'cleanbeauty', 'aureliaskin', 'newlaunch'],
      images: ['assets/img/skincare-1.jpg', 'assets/img/skincare-2.jpg'],
      status: 'ready', channel: 'ig', tags: ['t-launch', 't-carrousel'],
      scheduled: { day: 16, hour: 19 },
    },
    {
      id: 'd6', ws: 'ws-cm-b',
      title: 'Routine soir · carousel 5 slides',
      body: "Carrousel éducatif — 5 étapes routine du soir.",
      variants: {
        ig: "Une routine du soir, en 5 gestes :\n\n1. Double nettoyage · huile puis mousse\n2. Tonique hydratant\n3. Sérum n°03 · 3 gouttes\n4. Crème de nuit\n5. Baume à lèvres\n\nOn commence par quoi ce soir ? 🌙",
      },
      hashtags: ['nightroutine', 'skincareroutine', 'skincaretips'],
      images: ['assets/img/skincare-2.jpg', 'assets/img/skincare-1.jpg', 'assets/img/portrait-2.jpg'],
      status: 'creation', channel: 'ig', tags: ['t-carrousel'],
      scheduled: { day: 22, hour: 20 },
    },
    {
      id: 'd7', ws: 'ws-cm-b',
      title: 'UGC — mise en situation matinale',
      body: "Photo cliente + citation. À valider avec l'équipe légal.",
      variants: {
        ig: "« Ça a changé ma routine du matin. »\n— Léa, Marseille · 32 ans\n\nMerci pour tes mots ✨\n(photo par @lea.mrs)",
      },
      hashtags: ['ugc', 'testimonial', 'aureliaskin'],
      images: ['assets/img/portrait-1.jpg'],
      status: 'review', channel: 'ig', tags: [],
      scheduled: null,
    },

    // ---- Studio Rouages (graphiste — moodboards, réfs) ----
    {
      id: 'd8', ws: 'ws-graph',
      title: 'Moodboard — refonte Aurelia (v1)',
      body: "Direction éditoriale — palette neutre chaude, portraits en lumière tamisée, typo serif éditoriale.",
      variants: {
        li: "Petite exploration en cours pour un client beauté.\n\nOn cherche à sortir du \"minimalisme scandinave\" pour aller vers quelque chose de plus chaud, plus incarné — sans tomber dans le nostalgique.\n\nRéférences ci-dessous. Vos retours ?",
      },
      hashtags: ['moodboard', 'branding', 'beauty'],
      images: ['assets/img/portrait-2.jpg', 'assets/img/skincare-1.jpg', 'assets/img/gradient-1.jpg', 'assets/img/arch-2.jpg'],
      status: 'review', channel: 'li', tags: ['t-moodboard', 't-uiux'],
      scheduled: null,
    },
    {
      id: 'd9', ws: 'ws-graph',
      title: 'Explorations typo — poster série concert',
      body: "Recherches type-design pour la série de posters « Nocturne ».",
      variants: {},
      hashtags: ['typography', 'posterdesign', 'graphicdesign'],
      images: ['assets/img/poster-1.jpg', 'assets/img/poster-2.jpg'],
      status: 'creation', channel: 'bl', tags: ['t-moodboard'],
      scheduled: null,
    },
    {
      id: 'd10', ws: 'ws-graph',
      title: 'Ref arch. — projet identité galerie',
      body: "Références d'architecture pour un projet d'identité de galerie d'art contemporain.",
      variants: {},
      hashtags: ['architecture', 'brandidentity'],
      images: ['assets/img/arch-1.jpg', 'assets/img/arch-2.jpg'],
      status: 'idea', channel: 'bl', tags: ['t-moodboard'],
      scheduled: null,
    },
    {
      id: 'd11', ws: 'ws-graph',
      title: 'Story client — desk shot final',
      body: "Photo finale pour la story client — mise en situation.",
      variants: {
        ig: "Nouveau projet — direction artistique complète pour un studio de danse.\nOn vous montre ça très bientôt 🖤",
      },
      hashtags: ['workinprogress', 'branding'],
      images: ['assets/img/desk-2.jpg', 'assets/img/desk-1.jpg'],
      status: 'ready', channel: 'ig', tags: ['t-shortform'],
      scheduled: { day: 5, hour: 12 },
    },

    // ---- Dev Snippets ----
    {
      id: 'd12', ws: 'ws-dev',
      title: 'Snippet — React useLocalStorage hook',
      body: "Hook custom pour synchroniser un état React avec localStorage. Publier avec la capture VSCode.",
      variants: {
        li: "Un hook que j'utilise dans presque tous mes projets React.\n\n`useLocalStorage(key, defaultValue)` — même API que useState, mais persiste. Zéro dépendance, ~15 lignes.\n\nCode en commentaire ↓",
        x:  "useLocalStorage — le hook que j'utilise partout.\n15 lignes, zéro dépendance, même API que useState.\n\nsnippet en réponse 🧵",
      },
      hashtags: ['react', 'javascript', 'webdev', 'frontend'],
      images: ['assets/img/code-1.jpg', 'assets/img/code-2.jpg'],
      status: 'ready', channel: 'li', tags: ['t-snippet'],
      scheduled: { day: 10, hour: 9 },
    },
    {
      id: 'd13', ws: 'ws-dev',
      title: 'Django DRF — pagination custom cursor',
      body: "Explication technique de la pagination cursor-based en DRF.",
      variants: {
        bl: "# Pagination cursor en Django REST Framework\n\nLa pagination par offset est simple, mais elle a un coût O(n) sur les gros jeux de données…",
      },
      hashtags: ['django', 'drf', 'backend', 'python'],
      images: ['assets/img/code-3.jpg'],
      status: 'creation', channel: 'bl', tags: ['t-snippet'],
      scheduled: null,
    },
    {
      id: 'd14', ws: 'ws-dev',
      title: 'Idée — thread sur les Signals Django',
      body: "Idée à creuser : thread X sur les Django signals (bonnes pratiques et pièges).",
      variants: {},
      hashtags: ['django', 'python'],
      images: [],
      status: 'idea', channel: 'x', tags: ['t-snippet', 't-veille'],
      scheduled: null,
    },
    {
      id: 'd15', ws: 'ws-dev',
      title: 'Veille — CSS container queries',
      body: "Article intéressant à partager sur les container queries CSS.",
      variants: {
        x: "les container queries CSS ont enfin le support qu'elles méritent.\nun tour d'horizon rapide de ce que ça change, dans le thread 👇",
      },
      hashtags: ['css', 'webdev'],
      images: [],
      status: 'published', channel: 'x', tags: ['t-veille'],
      scheduled: { day: 1, hour: 14 },
    },
    {
      id: 'd16', ws: 'ws-cm-a',
      title: 'Recap semaine — 3 photos best-of',
      body: "Récap visuel de la semaine.",
      variants: {},
      hashtags: ['coffeeshop', 'weekly'],
      images: ['assets/img/coffee-shop.jpg', 'assets/img/food-1.jpg', 'assets/img/coffee-cup.jpg'],
      status: 'published', channel: 'ig', tags: [],
      scheduled: { day: 6, hour: 19 },
    },

    // ---- Extras : contenus spécifiques par domaine ----
    {
      id: 'd17', ws: 'ws-cm-b',
      title: 'Carrousel 6 slides — Guide bakuchiol',
      body: "Carrousel éducatif pour introduire l'ingrédient star du sérum n°03.",
      variants: {
        ig: "Le bakuchiol, c'est quoi exactement ? 6 slides pour tout comprendre 👉\n\n(swipe droite)",
      },
      hashtags: ['bakuchiol', 'skincare', 'education', 'aureliaskin', 'ingredientspotlight'],
      images: [
        'assets/img/skincare-1.jpg',
        'assets/img/plant-1.jpg',
        'assets/img/portrait-2.jpg',
        'assets/img/skincare-2.jpg',
        'assets/img/portrait-1.jpg',
        'assets/img/gradient-1.jpg',
      ],
      slides: [
        { kind: 'cover', title: 'Le bakuchiol', subtitle: '6 choses à savoir', bg: 'assets/img/skincare-1.jpg' },
        { kind: 'stat',  title: '100 %', subtitle: 'végétal — extrait de Psoralea corylifolia' },
        { kind: 'text',  title: '01', subtitle: "L'alternative naturelle au rétinol, sans les effets secondaires (rougeurs, desquamation)." },
        { kind: 'text',  title: '02', subtitle: "Compatible grossesse — validé par les dermatologues." },
        { kind: 'text',  title: '03', subtitle: "Actif photostable — s'utilise matin ET soir sans risque." },
        { kind: 'cta',   title: 'À découvrir', subtitle: 'Sérum n°03 · 24/09', bg: 'assets/img/skincare-2.jpg' },
      ],
      status: 'ready', channel: 'ig', tags: ['t-launch', 't-carrousel'],
      scheduled: { day: 18, hour: 18 },
    },
    {
      id: 'd18', ws: 'ws-cm-b',
      title: 'Reel TikTok — Application sérum ASMR',
      body: "Vidéo 15s ASMR, dropper + texture, close-up peau.",
      variants: {
        tt: "3 gouttes. le geste. la texture. ✨\n#skincare #routine #asmr",
        ig: "🎬 Rituel du soir en 15 secondes.\n3 gouttes, un geste, la nuit qui commence.",
      },
      hashtags: ['skincare', 'asmr', 'nightroutine', 'aureliaskin', 'reel'],
      images: ['assets/img/portrait-2.jpg', 'assets/img/skincare-1.jpg'],
      status: 'creation', channel: 'tt', tags: ['t-shortform'],
      scheduled: { day: 20, hour: 21 },
    },

    // Graphiste — moodboard étendu avec palette
    {
      id: 'd19', ws: 'ws-graph',
      title: 'DA — Céramiste indépendant · Kiln & Clay',
      body: "Direction artistique complète pour un céramiste. Palette terreuse, typographie humaniste, photographies contact.",
      variants: {
        li: "Nouveau projet — identité complète pour un céramiste indépendant.\n\nOn est parti d'une contrainte forte : traduire visuellement le geste manuel sans tomber dans le \"handmade\" cliché.\n\nPalette terreuse, typographie humaniste (Söhne), photographies au grain moyen. Le résultat en carrousel ↓",
      },
      hashtags: ['branding', 'ceramics', 'artdirection'],
      images: [
        'assets/img/pottery-1.jpg', 'assets/img/pottery-2.jpg', 'assets/img/pottery-3.jpg',
        'assets/img/palette-1.jpg', 'assets/img/palette-2.jpg', 'assets/img/arch-2.jpg',
      ],
      palette: ['#3d2f24', '#8b6f56', '#c7a582', '#e6d5b8', '#f5ede0', '#1a1512'],
      typography: [
        { family: 'Söhne', weight: 'Regular', use: 'Titre' },
        { family: 'GT Alpina', weight: 'Italic', use: 'Accents' },
        { family: 'Söhne Mono', weight: 'Regular', use: 'Détails' },
      ],
      status: 'creation', channel: 'li', tags: ['t-moodboard', 't-uiux'],
      scheduled: null,
    },
    {
      id: 'd20', ws: 'ws-graph',
      title: 'Refs — Palette éditoriale automne 2026',
      body: "Références visuelles pour la ligne éditoriale des campagnes automne.",
      variants: {},
      hashtags: ['moodboard', 'seasonal'],
      images: [
        'assets/img/palette-1.jpg', 'assets/img/palette-2.jpg', 'assets/img/palette-3.jpg',
        'assets/img/coffee-flatlay.jpg',
      ],
      palette: ['#7a5a3a', '#c07840', '#d99a5b', '#eab676', '#fce3b8'],
      status: 'idea', channel: 'bl', tags: ['t-moodboard'],
      scheduled: null,
    },

    // Dev — vrai snippet
    {
      id: 'd21', ws: 'ws-dev',
      title: 'useLocalStorage — hook React zéro dépendance',
      body: "Hook custom : même API que useState, persistance transparente.",
      variants: {
        li: "Un hook que j'utilise dans presque tous mes projets React.\n\n`useLocalStorage(key, defaultValue)` — même API que useState, mais persiste. Zéro dépendance, ~20 lignes.\n\nSSR-safe, listener cross-tab inclus.",
      },
      code: {
        lang: 'javascript',
        source: `import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((val) => {
    setValue(prev => {
      const next = val instanceof Function ? val(prev) : val;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue) setValue(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, setStoredValue];
}`,
      },
      hashtags: ['react', 'javascript', 'webdev', 'frontend', 'hooks'],
      images: ['assets/img/code-1.jpg'],
      status: 'ready', channel: 'li', tags: ['t-snippet'],
      scheduled: { day: 14, hour: 9 },
    },
    {
      id: 'd22', ws: 'ws-dev',
      title: 'Python — décorateur retry avec backoff exponentiel',
      body: "Décorateur pratique pour retry avec backoff, à publier sur X en thread.",
      variants: {
        x: "un décorateur Python que j'aimerais avoir écrit plus tôt 🐍\n\n@retry(3, backoff=2) → retry auto avec délai exponentiel.\n\ncode 👇",
      },
      code: {
        lang: 'python',
        source: `import time
from functools import wraps

def retry(attempts=3, backoff=2, exceptions=(Exception,)):
    """Retry avec backoff exponentiel.
    
    @retry(attempts=3, backoff=2)
    def flaky_call(): ...
    """
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            delay = 1
            for attempt in range(1, attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == attempts:
                        raise
                    time.sleep(delay)
                    delay *= backoff
        return wrapper
    return deco`,
      },
      hashtags: ['python', 'decorators', 'devtips'],
      images: ['assets/img/code-2.jpg'],
      status: 'creation', channel: 'x', tags: ['t-snippet'],
      scheduled: null,
    },
  ];

  return { workspaces, tags, channels, statuses, drafts };
})();

// Universal Media Helpers: Offline Base64 conversion & Video detection
window.fileToDataUrl = function(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (typeof file === 'string') return resolve(file);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier média'));
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


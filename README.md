# Handoff: ContentDock

## Overview

**ContentDock** est une plateforme web unifiée pour capturer, organiser, planifier et publier du contenu textuel + visuel — pensée pour community managers, graphistes, développeurs et équipes créatives multi-clients.

L'application élimine les allers-retours entre fichiers texte, dossiers de téléchargements et éditeurs en offrant :
- Une **zone tampon hybride** (Clipboard Engine) qui capture texte + image en un seul geste
- Des **workspaces** par métier/client avec vues adaptées (storyboard, kanban, liste, calendrier, queue, analytics)
- Un **système de collaboration** avec rôles, invitations, commentaires, mentions et journal d'activité
- Des **intégrations** de publication (Buffer, Zapier, Meta Graph, Webhooks, Hootsuite, Mailchimp)
- Un **assistant IA** pour générer variantes multi-plateformes, threads X et storytelling LinkedIn
- Un **import OCR** de posts existants depuis screenshots
- Un mode **PWA installable** avec support offline

---

## About the Design Files

Les fichiers de ce bundle sont des **références de design créées en HTML/React** — des prototypes montrant l'apparence et le comportement souhaités, **pas du code de production à copier tel quel**.

L'objectif est de **recréer ces designs dans l'environnement de code de destination** (Genspark Code recommandé, ou votre stack existante) en utilisant les patterns et bibliothèques établis. Si aucun environnement n'existe encore, la stack recommandée est **React 18 + Vite + Tailwind CSS + shadcn/ui** côté frontend, et **Django 5 + DRF + PostgreSQL + Celery + Redis** côté backend (voir README.backend.md et README.frontend.md à la racine du projet pour les specs complètes).

---

## Fidelity

**High-fidelity (hifi)** — Les prototypes sont pixel-perfect, avec couleurs finales, typographie, espacements et interactions abouties. Recréez l'UI de manière fidèle en utilisant la bibliothèque de composants du codebase de destination.

Les prototypes sont **fonctionnels de bout en bout** en mode démo :
- Drag & drop opérationnel (kanban, calendrier)
- Paste réel du presse-papiers (texte + image + documents)
- OCR fonctionnel via Tesseract.js
- Export ZIP réel via JSZip
- Génération IA via `window.genspark.complete`
- Simulation d'API pour la publication (log terminal)
- Persistance localStorage pour toutes les données

---

## Screens / Views

### 1. Shell principal (Topbar + Sidebar + Main)

**Layout**
- Grid CSS : `grid-template-columns: 232px 1fr` · `grid-template-rows: 44px 1fr`
- Sidebar fixe 232px, main scrollable

**Topbar (44px de haut)**
- Brand mark orange 22×22 avec logo dock SVG + wordmark "ContentDock" + badge "beta"
- Barre de recherche/palette au centre (déclenche ⌘K)
- Pile d'avatars de présence (utilisateurs en ligne)
- Bouton **"Capturer"** orange (accent) avec icône paste + kbd "V"
- Icônes : notifications (avec badge unread), toggle thème (sun/moon), settings, avatar utilisateur

**Sidebar (232px)**
- Sections : Navigation (Tous / Non planifiés / Favoris / Archivés), Espaces (workspaces), Tags, Widget membres du workspace actif, Section Outils (mobile-only : Templates/Importer/Assistant/Équipe/Paramètres), User info en bas
- Chaque item : height 26px, radius 5px, hover bg-2, active bg-3 avec border-left orange 2px
- Chaque workspace : dot coloré 8×8 + nom + count + bouton edit (crayon) au hover
- Clic droit sur workspace → modal d'édition

**Main**
- Header avec titre + sous-titre + domain hint (pill orange) + view tabs (à droite)
- View tabs : pills 4px radius, active bg-4, adaptées selon domaine (CM ajoute Queue + Analytics)
- Filter bar avec chips scrollables (statuts × canaux)
- Content area

---

### 2. Vue Storyboard (`view === 'storyboard'`)

**Layout**
- Grille masonry CSS `columns: 4` (desktop), `columns: 3` (1400px), `columns: 2` (mobile)

**Draft card**
- Background bg-1, border 1px line, radius 8px
- Cover image full-width (aspect ratio libre)
- Badge count (top-right) si plusieurs médias : "N" + icon layers
- Overlay hover : gradient sombre + texte du body (2 lignes)
- Body : channel badge + titre (500 weight) + status pill + heure programmée + tags
- Hover : translate-y -1px + shadow-md

---

### 3. Vue Kanban (`view === 'kanban'`)

**Layout**
- 5 colonnes flex (Idée / En création / À valider / Prêt / Publié)
- Chaque colonne : header (status pill + label uppercase + count + bouton +) + body scrollable

**Kanban card (draggable)**
- Thumb 16:10 en haut
- Titre 12px 500 + meta (channel badge + heure)
- Cursor grab, opacity .4 quand dragging
- Drop target : border orange + accent-soft background

Mobile : `grid-auto-flow: column; grid-auto-columns: 82vw; overflow-x: auto; scroll-snap-type: x mandatory`.

---

### 4. Vue Liste (`view === 'list'`)

**Table** : thead sticky, hover bg-2, colonnes Thumb 32×32 · Titre · Statut · Canal · Tags · Planifié · Médias · Actions.
Mobile : masque colonnes Canal/Tags/Médias/Actions.

---

### 5. Vue Calendrier (`view === 'calendar'`)

**Layout**
- Grid `240px 1fr` : panneau "Non planifiés" à gauche + calendrier à droite
- Modes : Mois (grille 7×6) ou Semaine (7 colonnes × 14 heures)

**Cellule mois** (min-height 100px)
- Numéro du jour (top-left)
- Events empilés : bg-3 + border-left channel color + badge canal + titre + heure
- Today : accent-soft background
- Drag over : accent-soft + shadow inset orange

**Drag & drop**
- Depuis panneau "Non planifiés" ou d'une cellule vers une autre
- Depuis calendrier vers panneau → unschedule

---

### 6. Vue Analytics (`view === 'analytics'`)

- **4 KPI cards** en grid : Brouillons / Programmés / En cours / Publiés (avec sparkline SVG)
- **Chart hebdo** : barres empilées par canal, height 140px
- **Répartition canal** : barres horizontales avec couleurs plateformes (IG rose, LI bleu, X noir, TT cyan, FB bleu, BL violet)
- **Créneaux fréquents** : grid 4 colonnes avec heure + nombre d'utilisations
- **Statuts en cours** : barres horizontales par statut
- **Heatmap semaine × horaire** : grid 7×12 cellules 14×14px, opacity proportionnelle au count

---

### 7. Vue Queue (`view === 'queue'`)

- Liste triée chronologiquement des publications programmées
- Chaque item : grid `90px 60px 1fr auto` = date/heure + thumb + body + actions (Publier maintenant / Repousser / Menu)

---

### 8. Vue Templates (`view === 'templates'`)

- Grid `auto-fill minmax(260px, 1fr)`
- 7 templates seed : Lundi motivation (série hebdo), Récap vendredi (série), Carrousel 5 conseils, Citation visuelle, Storytelling LinkedIn, Thread X, Lancement produit
- Cards : cover gradient personnalisé + badge Série/Template + nom + desc + jours de la semaine (si série) ou compteur slides

---

### 9. Vue Import (OCR)

- Dropzone dashed border + upload icon
- 4 pills plateformes cibles (IG/LI/X/TikTok)
- Toggle "Affinage IA" (recommandé)
- Pipeline visible en 4 étapes : Pré-traitement / OCR / Nettoyage / Refine IA
- Résultat : grid `200px 1fr` = screenshot preview + texte extrait + hashtags + mentions + confidence badge

---

### 10. Vue Assistant Script

- Textarea grande pour sujet
- Picker de format : Thread X (5-8 tweets) ou Storytelling LinkedIn
- Bouton "Générer" avec animation loading (spinner)
- Résultat Thread : chaque tweet en bulle avec border-left orange 2px + compteur 280 car
- Résultat LinkedIn : format post avec hook (border-bottom) + histoire + leçons numérotées + CTA + hashtags bleus

---

### 11. Vue Équipe (`view === 'team'`)

**Header** : titre + stats (Membres, En ligne, Invitations)

**Toolbar** : tabs (Membres/Invitations/Activité) + search input + filter workspace + bouton Inviter

**Table Members**
- Colonnes : Membre (avatar coloré 32×32 + presence dot + nom + email mono) · Espaces & rôles (chips ws + role-pill) · Rejoint (date) · Actions (menu)

**Table Invites** : pending badge orange, actions Renvoyer/Annuler

**Activity list** : avatar 24×24 + verb + target (accent orange) + temps mono

**Role pills** : owner (orange), admin (violet), editor (bleu), reviewer (jaune), viewer (gris), guest (teal)

---

### 12. Vue Settings

**Layout** : grid `200px 1fr` = nav vertical + content
Mobile : nav en scroll horizontal (pill orange sur active).

**Tabs** : Profil / Apparence (thème + accent color + densité) / Notifications (permission bureau + toggles par type) / Intégrations (6 cards) / Installation (PWA install + SW) / Raccourcis (table + relance tour) / Données (export JSON/ZIP + reset)

---

### 13. Drawer détail brouillon (drawer droit)

**Layout** : `width: 720px`, plein écran mobile, animation slideRight

**Head** : ws dot + ws name + status pill + presence stack + boutons Partager/Publier/Close

**Body Cols** : grid `1fr 260px` (main + sidebar)

**Main** :
- Titre input (20px 600)
- Media strip : thumbnails 96×96 + slot "+" pour ajouter
- Tabs : Corps / IG / LI / X / Preview
- Textarea copy area 180px min avec compteur caractères (limites : X=280, IG=2200, LI=3000)
- Actions row : Copier légende (primary) · Copier + hashtags · Copier image · Télécharger ZIP · Dupliquer
- Bouton "Générer avec IA" pour chaque variante
- Snippet block (dev workspaces) : dark bg + traffic lights + syntax highlighting
- Moodboard block (graph workspaces) : palette swatches + typo rows
- Attachments list : icônes colorées par type (PDF rouge, DOCX bleu, XLSX vert...)

**Sidebar** : Statut · **Assigné à** (AssigneePicker dropdown) · Canal principal (grid 3 cols) · Planification · Tags · Hashtags · Actions rapides

**Bottom** : **Comments panel** avec fil de discussion + composer avec mention picker (@user)

**Preview pane** : bouttons Instagram / Carrousel / LinkedIn / X / TikTok + rendu mockup fidèle

---

### 14. Modal Capture

- Backdrop blur 4px
- Modal 640px, animation slideUp
- Zone drop : dashed border → solid quand contenu
- Preview grid `180px 1fr` = image + texte
- Attachments list en dessous
- Foot : select workspace + select canal + info compte + Créer

Paste global (⌘V n'importe où) : ouvre la modal préremplie.

---

### 15. Modal Invitation

- Chip-based email input (validation regex, chip rouge si invalide)
- Role picker en grid 2 colonnes (5 cartes : Admin/Éditeur/Reviewer/Viewer/Guest)
- Ws checklist (checkbox custom + dot workspace)
- Textarea message optionnel
- Success screen : icône check + lien copiable

---

### 16. Autres modals

- **Publish Dialog** : channel picker + log terminal style (bg #0a0a0d, vert #22c55e, rouge #f87171, jaune #fbbf24, timestamps monospace)
- **Workspace Edit** : nom + 4 types métier + 10 couleurs + delete confirm
- **Command Palette** (⌘K) : cmdk positionné 12vh du top, input focus auto, groupes Actions/Espaces/Brouillons, navigation ↑↓↵
- **Notif panel** : top: 50px right: 12px, width: 380px, liste scrollable
- **Doc Preview** : plein écran modal pour PDF (iframe) / CSV (table) / JSON (pre) / code (SnippetBlock)

---

### 17. Onboarding (6 étapes)

- Backdrop noir 70% opacity + spotlight animé sur les éléments cibles (`box-shadow: 0 0 0 4000px rgba(0,0,0,.65), 0 0 0 3px accent`)
- Card 400px : step counter (mono orange) + h3 + p + kbd demo + steps dots + boutons Précédent/Passer/Suivant

---

### 18. Mobile (< 780px)

- Bottom nav fixe : 5 boutons (Board / Agenda / **FAB Capturer** central 52×52 orange / Queue / Menu)
- Topbar 48px avec hamburger (mobile-only) + brand + Capturer (cercle) + notif + theme
- Sidebar → drawer overlay 280px avec backdrop
- View tabs scrollables horizontalement (pill style, snap)
- Calendrier compact (event = badge canal + heure sans titre)
- Kanban en swipe horizontal (colonnes 82vw)
- Drawer plein écran
- Toutes les modals contraintes à `calc(100vw - 16px)`

---

## Interactions & Behavior

### Global paste
- Listener `paste` sur window
- Ignore si target = INPUT/TEXTAREA/SELECT ou contentEditable
- Si drawer ouvert : ajoute directement au draft courant
- Sinon : ouvre modal Capture préremplie avec le contenu

### Raccourcis clavier
| Action | Touche |
|---|---|
| Capturer | `V` |
| Command palette | `⌘K` / `Ctrl+K` |
| Coller partout | `⌘V` / `Ctrl+V` |
| Vue Storyboard | `G` |
| Vue Kanban | `K` |
| Vue Liste | `L` |
| Vue Calendrier | `C` |
| Vue Analytics | `A` |
| Vue Queue | `Q` |
| Fermer modal | `Esc` |
| Envoyer commentaire | `⌘↵` |

### Drag & drop
- **Kanban** : dnd HTML5 natif via `draggable`, `dataTransfer.setData('text/plain', id)`
- **Calendrier** : idem, plus drop sur unscheduled panel pour retirer du planning
- **Media strip** : réorganisation par drag (non implémenté, spec)

### Animations & transitions
- Modals : fadeIn 150ms + slideUp 220ms cubic-bezier(.2,.7,.2,1)
- Drawer : slideRight 220ms
- Onboarding spotlight : 300ms cubic-bezier(.2,.7,.2,1) sur `top/left/width/height`
- Loading dots : bounceDot 1.2s infinite
- Toast : slideUp 200ms
- Live cursors : transform 120ms

### Live collaboration
- Simulation : 4 avatars animés bougent aléatoirement sur la page (curseurs SVG + name tag)
- Toutes les 2-5 secondes, target aléatoire, ease 0.9 dt

### AI helpers
- `generateVariant(kind, sourceText, hashtags, wsName)` — via `window.genspark.complete`
- `generateXThread(source)` → array de tweets JSON
- `generateLinkedInStory(source)` → `{hook, story, lessons[], cta, hashtags[]}` JSON
- `refineWithLLM(rawText, platform)` pour l'OCR

### OCR pipeline
1. Preprocess : upscale x2 vers 1200-1600px + grayscale + sigmoid contrast
2. Tesseract.js `eng+fra`
3. Nettoyage : 20+ regex par plateforme + fusion lignes fragmentées + dedup
4. Refine LLM (optionnel) : reconstitution sémantique via JSON

### Notifications
- `Notification.requestPermission()` pour bureau
- Push web (spec seulement, non implémentée) via VAPID
- Centre in-app : localStorage `cd-notifs` (max 50, icônes React strippées à la sérialisation)

### PWA
- `manifest.json` avec icônes SVG inline base64
- Service Worker (`sw.js`) : stale-while-revalidate sur ~25 assets locaux
- `beforeinstallprompt` capturé, install triggerable depuis Settings

---

## State Management

### État global (dans `App.tsx`)
- `theme` (dark/light) → CSS var switching + localStorage
- `accent` couleur d'accent → CSS var `--accent` + variations
- `workspaces[]` → CRUD localStorage
- `drafts[]` → CRUD localStorage
- `currentWs` : 'all' | 'inbox' | workspace id
- `view` : 'storyboard' | 'kanban' | 'list' | 'calendar' | 'analytics' | 'queue' | 'templates' | 'import' | 'assistant' | 'team' | 'settings'
- `statusFilter`, `channelFilter`
- `openDraftId`, `captureOpen`, `captureSeed`, `cmdkOpen`, `notifOpen`, `mobileNavOpen`, `wsEditOpen`, `inviteOpen`
- `onboarding` (bool)
- `toast` (message)

### Persistance localStorage
```
cd-theme        → 'dark' | 'light'
cd-accent       → hex color
cd-drafts-v3    → Draft[]
cd-workspaces   → Workspace[]
cd-ws           → current ws id
cd-view         → current view
cd-settings-tab → current settings tab
cd-onboarded    → '1' if done
cd-profile      → { name, handle, email, bio, signature }
cd-notifs       → Notification[]
cd-notif-prefs  → { desktopEnabled, silent, mute_* }
cd-integrations → { [providerId]: { enabled, ...credentials } }
cd-templates    → custom templates (defaults not stored)
cd-comments     → { [draftId]: Comment[] }
cd-members      → Member[]
cd-invites      → Invite[]
cd-activity     → ActivityEntry[]
```

### Data fetching
En prod, remplacer localStorage par appels API DRF documentés dans `README.backend.md` (endpoints `/api/v1/drafts/`, `/api/v1/workspaces/`, `/api/v1/comments/`, etc.). Utiliser React Query avec optimistic updates pour le drag & drop.

---

## Design Tokens

### Couleurs (dark mode par défaut, light disponible)

```css
/* Dark */
--bg: #0a0a0b;         /* body background */
--bg-1: #101012;       /* cards, sidebar, drawer */
--bg-2: #16161a;       /* subtle raised */
--bg-3: #1c1c22;       /* hover, chips */
--bg-4: #24242c;       /* deep raised, toggles */
--line: #26262e;
--line-strong: #33333d;
--text: #ececf1;
--text-2: #a7a7b3;
--text-3: #6e6e7a;
--text-4: #4a4a55;
--accent: #ff5a1f;      /* dock orange — primary */
--accent-soft: rgba(255,90,31,0.14);
--accent-line: rgba(255,90,31,0.35);
--ok: #4ade80;
--warn: #fbbf24;
--info: #60a5fa;
--danger: #f87171;
--violet: #a78bfa;
--pink: #f472b6;
--teal: #2dd4bf;

/* Light overrides */
--bg: #f7f7f5;  --bg-1: #ffffff;  --bg-2: #fafaf8;
--bg-3: #f0f0ec;  --bg-4: #e8e8e2;
--text: #131318;  --accent: #e14a12;
```

### Couleurs plateformes
```
IG: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)
LI: #0a66c2
X:  #000
FB: #1877f2
TT: #000 (cyan #25f4ee accent)
Blog: linear-gradient(135deg, #7c3aed, #db2777)
```

### Couleurs statuts
```
idea:      text-4 dot (#4a4a55)
creation:  info (#60a5fa)
review:    warn (#fbbf24)
ready:     teal (#2dd4bf)
published: ok (#4ade80)
```

### Couleurs rôles
```
owner:    accent (#ff5a1f)
admin:    #a78bfa
editor:   #60a5fa
reviewer: #fbbf24
viewer:   #94a3b8
guest:    #2dd4bf
```

### Typographies
```
--sans: "Inter Tight", "SF Pro Display", system-ui, sans-serif
--mono: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace

body: 13px / 1.45  (mobile: 14px / 1.45)
h1:   20px / 700 / -0.01em
h2:   15px / 600 / -0.01em
h3:   12px / 600 uppercase 0.04em
titles: 15px / 600
body-text: 13px / 500
meta: 11-12px / var(--text-3)
mono: 10.5-11.5px
```

### Espacements
Base 4px : gap 2/4/6/8/10/12/14/16/20/24 px. Padding classique 8-16px pour cards.

### Radii
```
--radius-sm: 6px
--radius:    8px  (cards, buttons)
--radius-lg: 12px (modals, drawer top)
--radius (full): 50% (avatars)
```

### Shadows
```
--shadow-sm: 0 1px 0 rgba(255,255,255,.03) inset, 0 1px 2px rgba(0,0,0,.5)
--shadow-md: 0 10px 30px -12px rgba(0,0,0,.7), 0 2px 6px rgba(0,0,0,.4)
--shadow-lg: 0 30px 60px -20px rgba(0,0,0,.75), 0 8px 20px rgba(0,0,0,.4)
```

### Breakpoints
```
Mobile:   ≤ 780px  (bottom nav, drawer sidebar, view tabs scroll)
Compact:  ≤ 400px  (1 column storyboard, brand text hidden)
Tablet:   781-1024px (sidebar 200px, storyboard 3 cols)
Desktop:  ≥ 1025px  (default 4 cols)
Landscape: max-height 500px + max-width 900px (paddings réduits)
```

---

## Assets

### Images
Images de démo dans `assets/img/` — 24 photos réelles sourcées via image_search (licences CC/Public Domain) : cafés, mode streetwear, gradients, workspaces macbook, code screenshots, skincare, portraits, architecture, food, plants, poteries, palettes.

Ces images sont à remplacer par de vrais uploads utilisateurs en production. Voir également les images générées par le user via drag & drop, paste, ou capture.

### Icônes
SVG inline React (Lucide-style) définis dans `icons.jsx`. ~45 icônes : IconSearch, IconPlus, IconClipboard, IconGrid, IconColumns, IconList, IconCalendar, IconEye, IconCopy, IconDownload, IconMoon, IconSun, IconChevronLeft/Right/Down, IconX, IconImage, IconLayers, IconClock, IconFilter, IconTag, IconFolder, IconInbox, IconStar, IconArchive, IconLink, IconHeart, IconMessageCircle, IconSend, IconBookmark, IconCheck, IconMoreH/V, IconEdit, IconTrash, IconCommand, IconSparkles, IconAnchor, IconHash, IconSettings, IconBell, IconPaste, IconUpload, IconZap, IconLayout.

En prod, utiliser `lucide-react` directement (mêmes icônes).

### Fonts
Google Fonts CDN : Inter Tight (400/500/600/700/800) + JetBrains Mono (400/500).

### Librairies externes (chargées à la demande)
- `pdfjs-dist@3.11.174` pour preview PDF (CDN jsdelivr)
- `tesseract.js@5.0.5` pour OCR (CDN jsdelivr)
- `jszip@3.10.1` pour export ZIP (CDN cloudflare)

---

## Files

### Fichiers HTML/JSX/CSS de design (dans ce bundle)
- `ContentDock.html` — shell HTML avec chargement des scripts
- `styles.css` — tous les tokens + styles (3300+ lignes)
- `data.js` — données seed (workspaces, tags, channels, statuses, drafts avec code snippets/palettes/slides)
- `icons.jsx` — bibliothèque d'icônes SVG
- `shell.jsx` — Topbar + Sidebar + primitives (ChannelBadge, StatusPill)
- `app.jsx` — App orchestrator (state, routing, shortcuts, global paste)
- `views.jsx` — StoryboardView + KanbanView + ListView + StoryCard
- `calendar.jsx` — CalendarView (Mois + Semaine + drag & drop)
- `analytics.jsx` — AnalyticsView avec KPI, charts, heatmap
- `extras.jsx` — CarouselMockup, TikTokMockup, XMockup, SnippetBlock, MoodboardBlock, QueueView + syntax highlighter
- `detail.jsx` — DraftDrawer + PreviewPane
- `capture.jsx` — CaptureModal (paste + drop universel)
- `cmdk.jsx` — Command palette ⌘K avec fuzzy search
- `attachments.jsx` — Pipeline paste universel (PDF/DOCX/CSV/JSON/code) + AttachmentList + AttachmentPreview
- `features.jsx` — AI variants + JSZip export + Notifications system + WorkspaceEditModal
- `settings.jsx` — SettingsView avec 7 tabs
- `mobile.jsx` — BottomNav
- `onboarding.jsx` — Tour interactif 6 étapes avec spotlight
- `collab.jsx` — PresenceStack + LiveCursorsLayer + CommentsPanel avec mentions
- `templates.jsx` — TemplatesView + 7 templates seed + instantiateTemplate (séries récurrentes)
- `integrations.jsx` — IntegrationsView (6 providers) + PublishDialog avec log terminal
- `pwa.jsx` — PWATab + usePWA hook + Service Worker registration
- `ocr.jsx` — Pipeline OCR complet (preprocess Canvas + Tesseract + clean regex + LLM refine)
- `assistant.jsx` — ScriptAssistantView (Thread X + LinkedIn Storytelling)
- `team.jsx` — TeamView + InviteModal + AssigneePicker + InviteInbox + SideMembers + ROLES + can()
- `manifest.json` — PWA manifest
- `sw.js` — Service Worker

### Documentation additionnelle
- `README.backend.md` — spec Django + DRF + PostgreSQL + Celery (dispo à la racine du projet)
- `README.frontend.md` — spec React + Vite + Tailwind (dispo à la racine du projet)

### Ordre de chargement des scripts
```html
<script src="data.js"></script>
<script type="text/babel" src="icons.jsx"></script>
<script type="text/babel" src="shell.jsx"></script>
<script type="text/babel" src="views.jsx"></script>
<script type="text/babel" src="calendar.jsx"></script>
<script type="text/babel" src="extras.jsx"></script>
<script type="text/babel" src="analytics.jsx"></script>
<script type="text/babel" src="cmdk.jsx"></script>
<script type="text/babel" src="attachments.jsx"></script>
<script type="text/babel" src="features.jsx"></script>
<script type="text/babel" src="collab.jsx"></script>
<script type="text/babel" src="templates.jsx"></script>
<script type="text/babel" src="integrations.jsx"></script>
<script type="text/babel" src="pwa.jsx"></script>
<script type="text/babel" src="ocr.jsx"></script>
<script type="text/babel" src="assistant.jsx"></script>
<script type="text/babel" src="team.jsx"></script>
<script type="text/babel" src="settings.jsx"></script>
<script type="text/babel" src="mobile.jsx"></script>
<script type="text/babel" src="onboarding.jsx"></script>
<script type="text/babel" src="detail.jsx"></script>
<script type="text/babel" src="capture.jsx"></script>
<script type="text/babel" src="app.jsx"></script>
```

---

## Recommended implementation path

1. Setup **React 18 + Vite + TypeScript + Tailwind + shadcn/ui** (voir `README.frontend.md`)
2. Recréer les **design tokens** dans Tailwind config + CSS vars
3. Implémenter le **shell** (Topbar + Sidebar + Main + routing)
4. Chaque vue peut être implémentée indépendamment ; commencer par Storyboard + Drawer
5. Ajouter progressivement : Kanban → Calendrier → Analytics → Queue → Templates → Import → Assistant → Team
6. Pour les fonctionnalités backend (auth, WS realtime, publish API), implémenter le **backend Django** en parallèle (voir `README.backend.md`)
7. PWA + Service Worker en fin de cycle

Priorité MVP recommandée : **Auth + Workspaces + Drafts CRUD + Storyboard + Kanban + Capture Modal + Calendar** → Phase 1.

Bon build ! 🚀

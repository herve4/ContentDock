# ContentDock — Frontend (React + Vite)

Interface web moderne pour ContentDock : capture unifiée, storyboards visuels, calendrier éditorial, publication multi-plateformes.

---

## Stack technique

| Composant | Version | Rôle |
|---|---|---|
| **React** | 18.3 | Framework UI |
| **Vite** | 5+ | Build tool + dev server (HMR) |
| **Tailwind CSS** | 3.4 | Styling utility-first |
| **Radix UI** / **shadcn/ui** | latest | Composants headless accessibles |
| **@tanstack/react-query** | 5 | Cache serveur + optimistic updates |
| **zustand** | 4 | État UI global (drawer, filtres) |
| **react-router-dom** | 6 | Routing SPA |
| **@dnd-kit/core** | 6 | Drag & drop (Kanban, Calendrier) |
| **lucide-react** | latest | Icônes |
| **tesseract.js** | 5 | OCR côté client pour l'import de screenshots |
| **jszip** | 3.10 | Export ZIP de packs de contenus |
| **pdfjs-dist** | 3.11 | Preview PDF dans les brouillons |
| **date-fns** | 3 | Manipulation de dates |
| **workbox-webpack-plugin** | 7 | Service Worker (PWA offline) |

---

## Aperçu de l'architecture

```
src/
├── main.tsx                    → Entrée + QueryClient + Router
├── App.tsx                     → Shell : topbar + sidebar + <Outlet/>
│
├── pages/
│   ├── DashboardPage.tsx       → Vue par défaut (Storyboard)
│   ├── DraftPage.tsx           → Fiche détail brouillon
│   ├── CalendarPage.tsx        → Calendrier éditorial
│   ├── AnalyticsPage.tsx       → Stats (CM)
│   ├── QueuePage.tsx           → File d'attente publications
│   ├── TemplatesPage.tsx       → Bibliothèque templates & séries
│   ├── ImportPage.tsx          → OCR import screenshots
│   ├── AssistantPage.tsx       → IA thread X + storytelling LI
│   └── SettingsPage.tsx        → Profil, apparence, intégrations, PWA
│
├── features/
│   ├── capture/                → Modal capture universelle (paste + drop)
│   ├── drafts/                 → CRUD brouillons + drawer détail
│   ├── kanban/                 → Vue Kanban avec dnd-kit
│   ├── calendar/               → Mois/semaine + drag & drop
│   ├── comments/               → Fil discussion + @mentions
│   ├── collab/                 → Présence users + curseurs live (WebSocket)
│   ├── integrations/           → Buffer/Zapier/Meta/webhook UI + publish
│   ├── ocr/                    → Tesseract pipeline + preprocessing
│   ├── ai/                     → Génération variantes + thread + storytelling
│   └── templates/              → Instanciation de templates et séries
│
├── components/
│   ├── ui/                     → Composants shadcn/ui (Button, Dialog, …)
│   ├── ChannelBadge.tsx
│   ├── StatusPill.tsx
│   ├── AttachmentList.tsx      → Preview PDF/DOCX/code/CSV/JSON
│   ├── SnippetBlock.tsx        → Viewer code avec syntax highlighting
│   ├── PresenceStack.tsx
│   ├── LiveCursorsLayer.tsx
│   └── mockups/                → IG, Carrousel, LinkedIn, X, TikTok
│
├── stores/
│   ├── uiStore.ts              → Zustand : modals, filtres, sidebar
│   ├── themeStore.ts           → Dark/light + accent color
│   └── prefsStore.ts           → Préférences persistées (localStorage)
│
├── api/
│   ├── client.ts               → Axios avec auth interceptor JWT
│   ├── drafts.ts               → useDrafts, useDraft, useMutation…
│   ├── workspaces.ts
│   ├── comments.ts
│   ├── integrations.ts
│   ├── ai.ts
│   └── media.ts
│
├── hooks/
│   ├── useKeyboardShortcuts.ts → V, ⌘K, G/K/L/C/A/Q, Esc
│   ├── useGlobalPaste.ts       → Paste anywhere → capture modal
│   ├── useCollab.ts            → WebSocket presence + cursors
│   └── useNotifications.ts     → Centre notifs + Notification API
│
├── lib/
│   ├── ocr/                    → Pipeline OCR (preprocess, clean, refine)
│   ├── attachments.ts          → detectKind, fileToAttachment
│   ├── highlight.ts            → Syntax highlighter code
│   └── format.ts               → fmtBytes, fmtAgo, …
│
├── styles/
│   ├── globals.css             → Design tokens + reset
│   └── tailwind.config.ts
│
├── i18n/                       → fr + en
│
├── sw.ts                       → Service Worker (Workbox)
└── manifest.json               → PWA manifest
```

---

## Fonctionnalités principales

### 🎯 Capture universelle
- **Paste anywhere** : `⌘V` sur n'importe quelle zone (hors input) ouvre la modal préremplie.
- **Formats supportés** : images (PNG/JPG/WebP/GIF), PDF (via PDF.js), DOCX (unzip inline), CSV, JSON, code (20+ langages), audio, vidéo.
- **Détection automatique** du langage pour les workspaces `dev` — le paste devient un snippet coloré.

### 📋 6 vues principales
| Vue | Raccourci | Description |
|---|---|---|
| Storyboard | `G` | Grille moodboard type Pinterest |
| Kanban | `K` | Colonnes par statut (idée → publié) |
| Liste | `L` | Table dense avec tri |
| Calendrier | `C` | Mois/semaine avec drag & drop |
| Queue | `Q` | Publications programmées chronologiques |
| Analytics | `A` | KPI + heatmap semaine × horaire |

### 🎨 Mockups sociaux
Instagram feed · Carrousel IG multi-slides · LinkedIn · X (Twitter) · TikTok (vertical 9:16).

### 🤖 Assistant IA
- Génération de variantes par canal (`ig`/`li`/`x`/`tt`) avec limites de caractères et ton adapté
- Thread X automatique (5-8 tweets structurés)
- Storytelling LinkedIn (hook + histoire + leçons + CTA)

### 👥 Collaboration temps réel
- Présence utilisateurs (WebSocket)
- Curseurs live avec nom et couleur
- Commentaires par draft avec réponses
- Mentions `@user` avec picker inline

### 📄 Import OCR
Pipeline complet : preprocess image (upscale + N&B + contraste) → Tesseract multilingue → nettoyage smart (suppression UI/bruit) → optionnel refine IA pour reconstruction sémantique.

### 🔌 Intégrations
Buffer · Zapier · Meta Graph · Webhooks custom · Hootsuite · Mailchimp — configuration UI + publication via API.

### 📱 PWA
- Installable desktop + mobile
- Service Worker offline (cache stale-while-revalidate)
- Notifications bureau (Notification API) + Web Push mobile

### ⌘K Command palette
Recherche floue sur actions, espaces, brouillons. Navigation ↑↓↵.

---

## Installation locale

### Prérequis
- Node.js 20+
- pnpm 8+ (recommandé) ou npm 10+

### Setup

```bash
# 1. Cloner
git clone https://github.com/votre-org/contentdock-frontend.git
cd contentdock-frontend

# 2. Installer les dépendances
pnpm install

# 3. Variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec l'URL de votre backend

# 4. Lancer le dev server (port 5173 par défaut)
pnpm dev

# 5. Build production
pnpm build
pnpm preview
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | URL du backend Django |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | WebSocket pour la collaboration |
| `VITE_ENABLE_AI` | `true` | Active les endpoints IA |
| `VITE_ENABLE_COLLAB` | `true` | Active la présence temps réel |
| `VITE_ENABLE_PWA` | `true` | Enregistre le Service Worker |
| `VITE_SENTRY_DSN` | — | Monitoring erreurs (optionnel) |
| `VITE_POSTHOG_KEY` | — | Analytics produit (optionnel) |
| `VITE_VAPID_PUBLIC_KEY` | — | Web Push (doit matcher le backend) |

---

## Scripts npm

```bash
pnpm dev           # Dev server HMR (port 5173)
pnpm build         # Build production (dist/)
pnpm preview       # Prévisualiser le build
pnpm lint          # ESLint + Prettier check
pnpm lint:fix      # Corrige auto
pnpm typecheck     # tsc --noEmit
pnpm test          # Vitest (unit + component)
pnpm test:e2e      # Playwright (end-to-end)
pnpm storybook     # Storybook (composants isolés)
pnpm analyze       # Bundle analyzer
```

---

## Design system

### Design tokens
Définis dans `tailwind.config.ts` + CSS variables (dark/light) dans `src/styles/globals.css`.

- **Typographies** : Inter Tight (sans), JetBrains Mono (mono)
- **Espacements** : échelle 4px (0.25rem par unité Tailwind)
- **Radii** : `--radius-sm=6px` · `--radius=8px` · `--radius-lg=12px`
- **Densité** : mode "compact" par défaut (font-size 13px de base), option "confortable" à 14-15px

### Palette
Dark mode par défaut, inspiré de Raycast/Arc.
- Accent primaire : `--accent` (par défaut `#ff5a1f`, personnalisable dans Settings > Apparence)
- 6 couleurs d'accent au choix : orange, rose, violet, bleu, vert, jaune

### Composants clés (shadcn/ui + custom)
- `<Button variant="primary|ghost|outline">`
- `<Dialog>` / `<Drawer>` / `<Sheet>`
- `<Command>` (⌘K)
- `<Popover>` / `<Tooltip>`
- `<Tabs>` / `<Accordion>`
- `<Toast>`

---

## Raccourcis clavier

| Action | Raccourci |
|---|---|
| Ouvrir la capture | `V` |
| Coller n'importe où | `⌘V` / `Ctrl+V` |
| Command palette | `⌘K` / `Ctrl+K` |
| Vue Storyboard | `G` |
| Vue Kanban | `K` |
| Vue Liste | `L` |
| Vue Calendrier | `C` |
| Vue Analytics | `A` |
| Vue Queue | `Q` |
| Envoyer commentaire | `⌘↵` |
| Fermer une modal | `Esc` |

---

## Structure des tests

```
tests/
├── unit/                   → Vitest sur lib/ et hooks/
├── components/             → Testing Library sur composants isolés
└── e2e/                    → Playwright sur les flows critiques
    ├── auth.spec.ts
    ├── capture.spec.ts
    ├── kanban-dnd.spec.ts
    ├── calendar-dnd.spec.ts
    ├── publish.spec.ts
    └── import-ocr.spec.ts
```

Cible : **> 70 % de couverture** sur les hooks et composants critiques.

---

## Bonnes pratiques

- **Composants** : un composant = un fichier. Nommage `PascalCase.tsx`.
- **Hooks custom** : préfixés `use`, dans `src/hooks/`.
- **API queries** : centralisées dans `src/api/*.ts` — jamais de `fetch` en dehors.
- **Types** : générés automatiquement depuis le schéma OpenAPI du backend (`pnpm gen:api`).
- **Accessibilité** : privilégier les composants Radix (a11y par défaut), aria-labels sur toutes les icon-only buttons.
- **Performance** : lazy-load des routes lourdes (`Analytics`, `Import`, `Assistant`), `<Suspense>` avec skeletons.
- **Optimistic updates** avec React Query pour toutes les mutations UI-sensibles (drag & drop, statuts).

---

## Déploiement

### Statique (recommandé)
Le build produit un dossier `dist/` statique déployable partout : Vercel, Netlify, Cloudflare Pages, S3+CloudFront…

Fichiers importants à servir avec les bons headers :
- `manifest.json` → `Content-Type: application/manifest+json`
- `sw.js` → `Cache-Control: no-cache` (pour permettre les mises à jour)
- Assets versionnés (`assets/*.hash.js|css`) → `Cache-Control: public, max-age=31536000, immutable`

### Docker

```bash
docker build -t contentdock-frontend .
docker run -p 80:80 -e VITE_API_URL=https://api.contentdock.app contentdock-frontend
```

Le `Dockerfile` sert le build via Nginx avec fallback SPA.

---

## Contribuer

- Branches : `main` (production) · `develop` (intégration) · `feat/*` · `fix/*`
- Convention de commits : [Conventional Commits](https://www.conventionalcommits.org)
- Pré-commit : ESLint + Prettier + typecheck (via husky)
- Tests obligatoires pour toute nouvelle feature ou correction de bug

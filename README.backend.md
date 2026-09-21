# ContentDock — Backend (Django + DRF)

API REST découplée pour ContentDock : plateforme unifiée de capture, organisation et planification de contenus multi-plateformes (texte + visuels).

---

## Stack technique

| Composant | Version | Rôle |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **Django** | 5.0 | Framework web |
| **Django REST Framework** | 3.15 | API REST + sérialiseurs |
| **PostgreSQL** | 15+ | Base de données relationnelle |
| **Celery** | 5.3 | Tâches asynchrones (traitement image, publication différée) |
| **Redis** | 7+ | Broker Celery + cache |
| **Pillow** | 10+ | Traitement d'images, génération de vignettes |
| **djangorestframework-simplejwt** | 5.3 | Authentification JWT |
| **django-cors-headers** | 4.3 | CORS pour le frontend React |
| **django-filter** | 24 | Filtres avancés sur endpoints |
| **django-storages** | 1.14 | Stockage S3-compatible (optionnel) |
| **whitenoise** | 6.6 | Servir les fichiers statiques |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend React (SPA)                       │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS · REST (JSON) + Multipart uploads
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                Nginx (Reverse Proxy + Static/Media)           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Django + DRF (Gunicorn workers)                  │
│                                                                │
│   apps/                                                        │
│   ├── accounts/        → Auth JWT + profils                   │
│   ├── workspaces/      → Espaces (CM/graphist/dev/mixed)      │
│   ├── drafts/          → Brouillons + variantes + planning    │
│   ├── media_assets/    → Upload, vignettes, extraction OCR   │
│   ├── templates_/      → Templates & séries récurrentes       │
│   ├── comments/        → Fil de discussion + mentions         │
│   ├── integrations/    → Buffer, Zapier, Meta Graph, webhooks│
│   ├── notifications/   → Web Push + centre notifications      │
│   └── ai/              → Génération variantes + OCR refine   │
└─────────┬────────────────┬───────────────────┬───────────────┘
          │                │                    │
          ▼                ▼                    ▼
   ┌──────────┐      ┌──────────┐         ┌──────────┐
   │PostgreSQL│      │  Celery  │         │  S3 /    │
   │          │      │  Worker  │◄──────► │  MinIO   │
   └──────────┘      └────┬─────┘         └──────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │Redis (broker)│
                   └──────────────┘
```

---

## Modèle de données

### `Workspace`
Isole les contextes métiers (CM Client A, Studio Graph, Dev Snippets…).

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `owner` | FK(User) | Propriétaire |
| `members` | M2M(User) | Membres avec rôles |
| `name` | str(120) | Nom affiché |
| `slug` | str(40, unique) | URL/handle |
| `kind` | enum | `cm` \| `graph` \| `dev` \| `mixed` |
| `color` | str(7) | Hex color pour l'UI |
| `created_at` | datetime | |

### `Draft`
Unité centrale — un brouillon de contenu.

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `workspace` | FK(Workspace) | |
| `author` | FK(User) | Créateur |
| `title` | str(200) | Titre |
| `body` | text | Corps principal |
| `variants` | JSONB | `{"ig": "...", "li": "...", "x": "..."}` |
| `hashtags` | ArrayField(str) | Liste de hashtags |
| `status` | enum | `idea` \| `creation` \| `review` \| `ready` \| `published` |
| `channel` | enum | Canal cible principal (ig/li/x/fb/tt/bl) |
| `scheduled_at` | datetime | Nullable — quand publier |
| `published_at` | datetime | Quand effectivement publié |
| `code_lang` | str | Nullable — langage pour drafts type snippet dev |
| `code_source` | text | Nullable — source du snippet |
| `palette` | ArrayField | Nullable — hex colors pour drafts graphiste |
| `series` | FK(Series) | Nullable — appartient à une série récurrente |
| `template_of` | FK(Template) | Nullable — instance d'un template |
| `imported_from` | JSONB | Métadonnées d'import OCR |
| `created_at`, `updated_at` | datetime | |

### `MediaAsset`
Images/vidéos/documents rattachés à un draft.

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `draft` | FK(Draft) | |
| `file` | FileField | Fichier original |
| `thumbnail` | ImageField | Vignette 400×400 générée async |
| `mime_type` | str | |
| `kind` | enum | `image` \| `video` \| `pdf` \| `docx` \| `code` \| … |
| `extracted_text` | text | OCR ou texte extrait (PDF/DOCX) |
| `order` | int | Position dans la galerie |
| `uploaded_at` | datetime | |

### `CarouselSlide`
Pour les carrousels IG multi-slides.

| Champ | Type | Description |
|---|---|---|
| `draft` | FK(Draft) | |
| `position` | int | Ordre |
| `kind` | enum | `cover` \| `stat` \| `text` \| `cta` \| `image` |
| `title`, `subtitle` | str | Contenu |
| `background_image` | FK(MediaAsset) | Nullable |

### `Comment`
Fil de discussion sur un draft, avec mentions.

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `draft` | FK(Draft) | |
| `author` | FK(User) | |
| `parent` | FK(Comment) | Nullable — réponse |
| `text` | text | |
| `mentions` | M2M(User) | Utilisateurs mentionnés |
| `created_at`, `edited_at` | datetime | |

### `Tag`
Taxonomie transversale au workspace.

| Champ | Type | Description |
|---|---|---|
| `workspace` | FK(Workspace) | Nullable (tag global) |
| `label` | str(40) | |
| `color` | str(7) | |

### `Template` / `Series`
- **Template** : structure réutilisable (body + slides + hashtags par défaut)
- **Series** : template + fréquence (`weekly`, `days=[MON,FRI]`, `hour=8`) → génère les Drafts programmés automatiquement via Celery Beat

### `Integration`
Configuration par workspace des connecteurs externes.

| Champ | Type | Description |
|---|---|---|
| `workspace` | FK(Workspace) | |
| `provider` | enum | `buffer` \| `zapier` \| `meta` \| `webhook` \| `hootsuite` \| `mailchimp` |
| `enabled` | bool | |
| `credentials` | encrypted JSONB | Tokens chiffrés (Fernet) |
| `channels` | ArrayField | Canaux couverts |

### `Notification`
Centre de notifications in-app + push web.

| Champ | Type | Description |
|---|---|---|
| `user` | FK(User) | Destinataire |
| `kind` | enum | `scheduled` \| `published` \| `review` \| `capture` \| `mention` \| `ai` |
| `title`, `desc` | str | |
| `draft` | FK(Draft) | Nullable |
| `read_at` | datetime | Nullable |

---

## Endpoints API principaux (v1)

Base URL : `/api/v1/`

### Authentification
| Verbe | Route | Description |
|---|---|---|
| POST | `/auth/register/` | Créer un compte |
| POST | `/auth/login/` | Login → `{access, refresh}` |
| POST | `/auth/refresh/` | Rafraîchir le token access |
| POST | `/auth/logout/` | Blacklist le refresh token |
| GET/PATCH | `/auth/me/` | Profil utilisateur courant |

### Workspaces
| Verbe | Route | Description |
|---|---|---|
| GET/POST | `/workspaces/` | Liste / créer |
| GET/PATCH/DELETE | `/workspaces/{id}/` | Détail / update / suppression cascade |
| POST | `/workspaces/{id}/invite/` | Inviter un membre par email |
| GET | `/workspaces/{id}/members/` | Liste des membres + rôles |

### Drafts
| Verbe | Route | Description |
|---|---|---|
| GET | `/drafts/` | Liste — filtres : `?workspace=X&status=Y&channel=Z&tag=T&search=texte` |
| GET | `/drafts/?view=calendar&start=YYYY-MM-DD&end=YYYY-MM-DD` | Optimisé pour vue calendrier |
| POST | `/drafts/` | Créer avec upload multipart (texte + fichiers en une requête) |
| GET/PATCH/DELETE | `/drafts/{id}/` | Détail / update / suppression |
| POST | `/drafts/{id}/duplicate/` | Cloner pour déclinaison |
| PATCH | `/drafts/{id}/reschedule/` | Change juste `scheduled_at` (drag & drop calendrier) |
| POST | `/drafts/{id}/publish/` | Déclenche la publication via les intégrations actives |
| GET | `/drafts/{id}/export/?format=zip` | Télécharge le pack (images + captions + hashtags) |

### Média & OCR
| Verbe | Route | Description |
|---|---|---|
| POST | `/media/paste-buffer/` | Reçoit image brute Base64 depuis presse-papiers → asset |
| POST | `/media/upload/` | Upload multipart classique |
| POST | `/media/ocr/` | Envoi screenshot → texte extrait + détection plateforme + hashtags |
| GET | `/media/{id}/thumbnail/` | Redirect vers vignette (générée async si absente) |

### Templates & Séries
| Verbe | Route | Description |
|---|---|---|
| GET/POST | `/templates/` | Bibliothèque de templates |
| POST | `/series/` | Créer une série récurrente (auto-génère les drafts) |
| GET | `/series/{id}/occurrences/` | Liste des drafts générés |

### Commentaires
| Verbe | Route | Description |
|---|---|---|
| GET/POST | `/drafts/{id}/comments/` | Fil de discussion + créer commentaire |
| PATCH/DELETE | `/comments/{id}/` | Éditer / supprimer (auteur uniquement) |

### Intégrations & Publication
| Verbe | Route | Description |
|---|---|---|
| GET | `/integrations/` | Liste des intégrations configurées |
| POST/PATCH | `/integrations/{provider}/` | Enregistrer/mettre à jour credentials (chiffrés) |
| POST | `/integrations/{provider}/test/` | Vérifier la connexion |
| POST | `/webhooks/incoming/{signature}/` | Endpoint webhook entrant (Zapier retour, etc.) |

### IA
| Verbe | Route | Description |
|---|---|---|
| POST | `/ai/variants/` | `{body, target: "ig|li|x|tt", constraints}` → variante générée |
| POST | `/ai/thread/` | Génère un thread X (5-8 tweets) |
| POST | `/ai/li-story/` | Génère un storytelling LinkedIn (hook + histoire + leçons + CTA) |
| POST | `/ai/ocr-refine/` | Prend le texte OCR brut + reconstruit le post proprement |

### Notifications
| Verbe | Route | Description |
|---|---|---|
| GET | `/notifications/` | Liste (paginée) |
| POST | `/notifications/mark-all-read/` | Marquer tout comme lu |
| POST | `/notifications/subscribe-push/` | Enregistrer un endpoint Web Push (mobile PWA) |

---

## Installation locale

### Prérequis
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- `poetry` ou `pip`

### Setup

```bash
# 1. Cloner
git clone https://github.com/votre-org/contentdock-backend.git
cd contentdock-backend

# 2. Environnement virtuel
python -m venv .venv
source .venv/bin/activate   # ou .venv\Scripts\activate sur Windows

# 3. Dépendances
pip install -r requirements.txt

# 4. Variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (DB, SECRET_KEY, etc.)

# 5. Base de données
createdb contentdock
python manage.py migrate
python manage.py createsuperuser

# 6. (Optionnel) Charger les fixtures de démo
python manage.py loaddata fixtures/demo.json

# 7. Lancer
python manage.py runserver 8000
```

### Celery (dans un autre terminal)

```bash
# Worker principal
celery -A contentdock worker -l info

# Beat scheduler (pour les séries récurrentes + publications programmées)
celery -A contentdock beat -l info
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `DEBUG` | `False` | Mode debug Django |
| `SECRET_KEY` | *(requis)* | Clé Django (à générer) |
| `DATABASE_URL` | `postgres://localhost/contentdock` | DSN PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379/0` | Broker Celery |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hôtes autorisés |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Origines CORS (frontend Vite) |
| `MEDIA_ROOT` | `./media` | Dossier upload local |
| `USE_S3` | `False` | Basculer sur S3 pour stockage médias |
| `AWS_ACCESS_KEY_ID` | — | Si USE_S3=True |
| `AWS_SECRET_ACCESS_KEY` | — | Si USE_S3=True |
| `AWS_STORAGE_BUCKET_NAME` | — | Nom du bucket |
| `JWT_ACCESS_LIFETIME_MIN` | `60` | Durée du token access (minutes) |
| `JWT_REFRESH_LIFETIME_DAYS` | `14` | Durée du refresh (jours) |
| `OPENAI_API_KEY` | — | Pour endpoints `/ai/*` |
| `TESSERACT_LANGS` | `eng+fra` | Langues OCR côté serveur |
| `VAPID_PRIVATE_KEY` | — | Push Web notifications |
| `VAPID_PUBLIC_KEY` | — | Push Web notifications |
| `VAPID_CLAIMS_EMAIL` | — | Contact push |

---

## Tâches Celery

| Tâche | Trigger | Rôle |
|---|---|---|
| `generate_thumbnail(asset_id)` | Après upload | Vignette 400×400 via Pillow |
| `extract_text(asset_id)` | Après upload PDF/DOCX | Extraction texte + langue |
| `run_ocr(asset_id)` | Sur demande | OCR via Tesseract (avec pré-traitement) |
| `publish_scheduled()` | Toutes les 5 min (Beat) | Publie les drafts dont `scheduled_at <= now` |
| `generate_series_occurrences(series_id)` | Toutes les nuits (Beat) | Crée les prochains drafts d'une série |
| `push_notification(user_id, payload)` | Sur événement | Web Push vers l'abonnement enregistré |
| `dispatch_publish(draft_id, integrations)` | Sur publish | Appelle chaque intégration configurée |

---

## Tests

```bash
# Tests unitaires
pytest

# Avec couverture
pytest --cov=apps --cov-report=html

# Tests d'intégration API
pytest tests/integration/
```

Cible de couverture : **> 80 %** sur les apps `drafts`, `workspaces`, `integrations`.

---

## Déploiement

Un `Dockerfile` + `docker-compose.yml` sont fournis pour un déploiement rapide.

```bash
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

Le compose lance : `web` (gunicorn), `worker` (celery), `beat` (celery beat), `db` (postgres), `redis`, `nginx`.

---

## Contribuer

- Branches : `main` (production) · `develop` (intégration) · `feat/*` · `fix/*`
- Convention de commits : [Conventional Commits](https://www.conventionalcommits.org)
- Lint : `ruff` + `black` (pré-commit hooks configurés)
- Tests obligatoires pour les nouvelles fonctionnalités

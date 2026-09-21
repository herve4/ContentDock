# ContentDock — Architecture Locale Autosuffisante (SQLite, Desktop & Android)

Ce projet a été adapté pour être **100% autonome et autosuffisant (Local-First & Offline-First)** :
- **Aucun serveur distant requis** : Le backend Django initial a été abandonné au profit d'une exécution locale sans frais d'hébergement ni maintenance serveur.
- **Base de données SQLite locale** : Toutes les données (espaces, brouillons, variantes pour réseaux sociaux, tags, templates, commentaires, paramètres) sont stockées dans une base de données **SQLite 3 locale** sur la machine ou le terminal de l'utilisateur.
- **Support Desktop & Android** : L'application peut être exécutée directement dans le navigateur/PWA, compilée en exécutable natif **Windows (via la chaîne Visual Studio C++ / MSVC dans VS Code)**, ou packagée en application native **Android (APK)**.

---

## 1. Schéma de la Base SQLite

La base SQLite contient les tables relationnelles suivantes :

| Table | Rôle |
|---|---|
| `workspaces` | Espaces de travail (Studio Graph, Dev Snippets, CM Kombu Café…) |
| `drafts` | Brouillons de publication (titre, body, statut Kanban, date calendrier, variantes JSON, hashtags…) |
| `tags` | Tags de catégorisation |
| `templates` | Modèles de publications et séries de contenu |
| `comments` | Commentaires et discussions collaboratives locales |
| `activity_logs` | Journal d'audit et historique d'activité |
| `settings` | Préférences utilisateur (thème, couleurs, densité) |

---

## 2. Utilisation Immédiate (Sans Installation Complexe)

Vous pouvez utiliser ContentDock dès maintenant :
1. **Lancement direct** : Double-cliquez simplement sur [index.html](file:///c:/Users/Utilisateur/Desktop/projects/ContentDock/Contentdock/index.html) ou [ContentDock.html](file:///c:/Users/Utilisateur/Desktop/projects/ContentDock/Contentdock/ContentDock.html) dans votre navigateur, ou ouvrez-le avec l'extension **Live Server** de VS Code.
2. **Via Vite (Serveur de dev local rapide)** :
   ```bash
   cd Contentdock
   npm install
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:5173`.

---

## 3. Compilation Desktop Windows (Visual Studio C++ / MSVC)

L'environnement Desktop est préconfiguré avec **Tauri v2** qui s'appuie directement sur le compilateur **Visual Studio C++ (MSVC 2022/2026)** installé sur votre machine :

```bash
cd Contentdock
npm install

# Lancer en mode bureau Windows (avec rechargement à chaud) :
npm run desktop:dev

# Compiler l'exécutable Windows (.exe autonome) :
npm run desktop:build
```
L'exécutable `.exe` généré se trouvera dans `src-tauri/target/release/`.

---

## 4. Compilation & Déploiement Mobile Android

Pour déployer sur smartphone ou tablette Android :

```bash
cd Contentdock
npm install

# 1. Initialiser le projet Android (la première fois) :
npm run android:init

# 2. Synchroniser les assets web et le moteur SQLite :
npm run android:sync

# 3. Ouvrir dans Android Studio :
npm run android:open

# Ou exécuter directement sur un terminal Android connecté :
npm run android:run
```

---

## 5. Gestion & Sauvegarde de la Base SQLite

Depuis l'interface de ContentDock :
1. Rendez-vous dans **Paramètres** (icône d'engrenage ou touche raccourci).
2. Cliquez sur l'onglet **Données**.
3. Vous pouvez :
   - Consulter en direct le nombre d'espaces, de brouillons et la taille de la base SQLite.
   - **Télécharger la base SQLite (`contentdock.sqlite3`)** : exporte le fichier binaire réel.
   - **Importer un fichier `.sqlite3`** pour restaurer ou transférer vos données d'un appareil à un autre.
   - Ouvrir et requêter le fichier exporté directement dans VS Code grâce à vos extensions `alexcvzz.vscode-sqlite` ou `yy0931.vscode-sqlite3-editor`.

// ContentDock — Moteur de Base de Données SQLite Local (Offline-First)
// Ce service remplace le backend distant Django par une base de données SQLite locale
// autonome, fonctionnant sur Desktop (Windows) et Mobile (Android).

(function() {
  'use strict';

  const DB_STORAGE_KEY = 'contentdock_sqlite_db';
  let dbInstance = null;
  let isInitialized = false;

  // DDL du schéma relationnel SQLite
  const SCHEMA_SQL = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#60a5fa',
      kind TEXT NOT NULL DEFAULT 'mixed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      ws_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL DEFAULT 'idea',
      channel TEXT NOT NULL DEFAULT 'ig',
      scheduled_day INTEGER,
      scheduled_hour INTEGER,
      variants_json TEXT,
      hashtags_json TEXT,
      images_json TEXT,
      tags_json TEXT,
      slides_json TEXT,
      palette_json TEXT,
      typography_json TEXT,
      code_json TEXT,
      attachments_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ws_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#a78bfa',
      ws_id TEXT,
      FOREIGN KEY (ws_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'template',
      data_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      author_id TEXT,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      author_name TEXT NOT NULL,
      verb TEXT NOT NULL,
      target TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'creator',
      is_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      google_id TEXT,
      auth_provider TEXT DEFAULT 'local',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );
  `;

  // Gestionnaire de stockage binaire persistant pour SQLite (IndexedDB pour gros volumes)
  const IDB_NAME = 'ContentDockLocalDB';
  const IDB_STORE = 'sqlite_file';

  function openIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function loadDatabaseBytes() {
    try {
      const idb = await openIndexedDB();
      if (idb) {
        return new Promise((resolve) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get('contentdock.sqlite');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }
    } catch (e) {
      console.warn('[CD_DB] IndexedDB non disponible, bascule vers localStorage', e);
    }
    // Fallback localStorage en base64
    const b64 = localStorage.getItem(DB_STORAGE_KEY);
    if (!b64) return null;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function saveDatabaseBytes(bytes) {
    try {
      const idb = await openIndexedDB();
      if (idb) {
        return new Promise((resolve) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put(bytes, 'contentdock.sqlite');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      }
    } catch (e) {
      console.warn('[CD_DB] Sauvegarde IndexedDB impossible', e);
    }
    // Fallback localStorage (limité à ~5MB)
    try {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
    } catch (err) {
      console.error('[CD_DB] Erreur lors de la sauvegarde binaire locale :', err);
    }
  }

  async function saveBackupSnapshot(name, bytes) {
    try {
      const idb = await openIndexedDB();
      if (idb) {
        return new Promise((resolve) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put(bytes, `backup_${name}`);
          store.put(new Date().toISOString(), `backup_${name}_date`);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      }
    } catch (e) {
      console.warn('[CD_DB] Sauvegarde snapshot IndexedDB échouée', e);
    }
    try {
      localStorage.setItem(`cd_backup_${name}_date`, new Date().toISOString());
    } catch(e) {}
  }

  async function loadBackupSnapshot(name) {
    try {
      const idb = await openIndexedDB();
      if (idb) {
        return new Promise((resolve) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(`backup_${name}`);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }
    } catch(e) {}
    return null;
  }

  const CURRENT_SCHEMA_VERSION = 4;

  // Initialisation du moteur SQLite
  async function initDatabase() {
    if (isInitialized && dbInstance) return dbInstance;

    let SQL = null;
    if (typeof window.initSqlJs === 'function') {
      try {
        SQL = await window.initSqlJs({
          locateFile: file => `./vendor/${file}`
        });
      } catch (e) {
        try {
          SQL = await window.initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
          });
        } catch (err2) {
          console.warn('[CD_DB] Erreur chargement WASM sql.js, tentative locale/cdn échouée', err2);
        }
      }
    }

    if (SQL) {
      const savedBytes = await loadDatabaseBytes();
      if (savedBytes && savedBytes.length > 0) {
        dbInstance = new SQL.Database(savedBytes);
        try {
          // Vérification de version de schéma pour migration sans perte de données
          let currentVersion = 0;
          try {
            const vRes = dbInstance.exec('PRAGMA user_version;');
            if (vRes && vRes[0] && vRes[0].values && vRes[0].values[0]) {
              currentVersion = Number(vRes[0].values[0][0]) || 0;
            }
          } catch(e) {}

          if (currentVersion < CURRENT_SCHEMA_VERSION) {
            console.log(`[CD_DB] Migration de schéma SQLite requise (v${currentVersion} -> v${CURRENT_SCHEMA_VERSION}). Préservation des données...`);
            // Sauvegarde de sécurité automatique avant migration
            try {
              await saveBackupSnapshot('pre_migration_v' + CURRENT_SCHEMA_VERSION, savedBytes);
            } catch(e) {}
            // Application du schéma non-destructif (CREATE TABLE IF NOT EXISTS)
            dbInstance.run(SCHEMA_SQL);
            // Ajout sécurisé de la colonne attachments_json si non existante
            try {
              const tableInfo = dbInstance.exec("PRAGMA table_info(drafts);");
              const cols = (tableInfo && tableInfo[0] && tableInfo[0].values) ? tableInfo[0].values.map(v => v[1]) : [];
              if (!cols.includes('attachments_json')) {
                dbInstance.run("ALTER TABLE drafts ADD COLUMN attachments_json TEXT;");
              }
            } catch(e) {}

            // Ajout sécurisé des colonnes google_id et auth_provider sur users
            try {
              const uInfo = dbInstance.exec("PRAGMA table_info(users);");
              const uCols = (uInfo && uInfo[0] && uInfo[0].values) ? uInfo[0].values.map(v => v[1]) : [];
              if (!uCols.includes('google_id')) {
                dbInstance.run("ALTER TABLE users ADD COLUMN google_id TEXT;");
              }
              if (!uCols.includes('auth_provider')) {
                dbInstance.run("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';");
              }
            } catch(e) {}

            dbInstance.run(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
            await persist();
            console.log(`[CD_DB] Migration v${CURRENT_SCHEMA_VERSION} réussie. Données conservées intactes.`);
          } else {
            dbInstance.run(SCHEMA_SQL);
            try {
              const tableInfo = dbInstance.exec("PRAGMA table_info(drafts);");
              const cols = (tableInfo && tableInfo[0] && tableInfo[0].values) ? tableInfo[0].values.map(v => v[1]) : [];
              if (!cols.includes('attachments_json')) {
                dbInstance.run("ALTER TABLE drafts ADD COLUMN attachments_json TEXT;");
              }
            } catch(e) {}
            try {
              const uInfo = dbInstance.exec("PRAGMA table_info(users);");
              const uCols = (uInfo && uInfo[0] && uInfo[0].values) ? uInfo[0].values.map(v => v[1]) : [];
              if (!uCols.includes('google_id')) {
                dbInstance.run("ALTER TABLE users ADD COLUMN google_id TEXT;");
              }
              if (!uCols.includes('auth_provider')) {
                dbInstance.run("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';");
              }
            } catch(e) {}
          }
          await seedDefaultData();
        } catch (e) {
          console.warn('[CD_DB] Mise à jour du schéma / seed :', e);
        }
        console.log('[CD_DB] Base SQLite restaurée depuis le stockage local persistant.');
      } else {
        dbInstance = new SQL.Database();
        dbInstance.run(SCHEMA_SQL);
        dbInstance.run(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
        console.log('[CD_DB] Nouvelle base SQLite initialisée avec le schéma complet.');
        await seedDefaultData();
        await persist();
      }
    } else {
      console.warn('[CD_DB] sql.js non détecté, activation de l’adaptateur de secours local compatible SQLite.');
      dbInstance = createFallbackDatabase();
      await dbInstance.init();
    }

    isInitialized = true;
    return dbInstance;
  }

  // Sauvegarde le fichier SQLite binaire dans le stockage persistant
  async function persist() {
    if (!dbInstance) return;
    if (typeof dbInstance.export === 'function') {
      const data = dbInstance.export();
      await saveDatabaseBytes(data);
    } else if (typeof dbInstance.persist === 'function') {
      await dbInstance.persist();
    }
  }

  // Seed des données initiales si la base de données est vierge
  async function seedDefaultData() {
    // 0. Nettoyage automatique des anciennes données de démonstration factices
    try {
      runSql(`DELETE FROM drafts WHERE id IN ('d1','d2','d3','d4','d5','d6','d7','d8','d9','d10','d11','d12','d13','d14','d15','d16','d17','d18','d19','d20')`);
      runSql(`DELETE FROM workspaces WHERE id IN ('ws-graph', 'ws-dev', 'ws-cm-a', 'ws-cm-b') AND NOT EXISTS (SELECT 1 FROM drafts WHERE ws_id = workspaces.id)`);
      runSql(`DELETE FROM tags WHERE id IN ('t-carrousel','t-promo','t-uiux','t-veille','t-snippet','t-launch','t-moodboard','t-shortform')`);
    } catch(e) {}

    // 1. Workspaces : S'assurer qu'au moins un espace propre existe
    try {
      const existingWs = querySql('SELECT id FROM workspaces LIMIT 1');
      if (!existingWs || existingWs.length === 0) {
        runSql(
          'INSERT OR IGNORE INTO workspaces (id, name, slug, color, kind) VALUES (?, ?, ?, ?, ?)',
          ['ws-main', 'Mon Espace', 'mon-espace', '#ff5a1f', 'mixed']
        );
      }
    } catch(e) {}

    // 2. Utilisateur par défaut
    try {
      const existingUsers = querySql('SELECT id FROM users LIMIT 1');
      if (!existingUsers || existingUsers.length === 0) {
        const defaultHash = await hashPassword('123456');
        runSql(
          'INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)',
          ['u-herve', 'Hervé Wognin', 'hervewognin264@gmail.com', defaultHash, 'HW', 'lead']
        );
      }
    } catch(e) {}

    console.log('[CD_DB] Espace initial propre prêt.');
  }

  // Helper de hachage sécurisé SHA-256 (Web Crypto natif)
  async function hashPassword(str) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    // Fallback standard
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }

  // Exécution SQL bas-niveau
  function runSql(sql, params = []) {
    if (!dbInstance) throw new Error('[CD_DB] Base non initialisée');
    if (typeof dbInstance.run === 'function') {
      dbInstance.run(sql, params);
    }
  }

  function querySql(sql, params = []) {
    if (!dbInstance) throw new Error('[CD_DB] Base non initialisée');
    if (typeof dbInstance.exec === 'function') {
      const res = dbInstance.exec(sql, params);
      if (!res || res.length === 0) return [];
      const columns = res[0].columns;
      return res[0].values.map(row => {
        const obj = {};
        columns.forEach((col, idx) => { obj[col] = row[idx]; });
        return obj;
      });
    }
    return [];
  }

  // Adaptateur de secours local si WebAssembly/sql.js n'est pas encore chargé
  function createFallbackDatabase() {
    let memoryWorkspaces = [];
    let memoryDrafts = [];
    let memoryTags = [];
    let memorySettings = {};

    return {
      async init() {
        try {
          const w = localStorage.getItem('cd-workspaces');
          const d = localStorage.getItem('cd-drafts-v3');
          if (w) memoryWorkspaces = JSON.parse(w);
          if (d) memoryDrafts = JSON.parse(d);
        } catch (e) {}

        if (memoryWorkspaces.length === 0 && window.CD_DATA) {
          memoryWorkspaces = window.CD_DATA.workspaces || [];
          memoryDrafts = window.CD_DATA.drafts || [];
          memoryTags = window.CD_DATA.tags || [];
          this.persist();
        }
      },
      run(sql, params) {
        // Exécution en mémoire
      },
      exec(sql, params) {
        return [];
      },
      async persist() {
        try {
          localStorage.setItem('cd-workspaces', JSON.stringify(memoryWorkspaces));
          localStorage.setItem('cd-drafts-v3', JSON.stringify(memoryDrafts));
        } catch (e) {}
      },
      getWorkspaces: () => [...memoryWorkspaces],
      saveWorkspace: (ws) => {
        const idx = memoryWorkspaces.findIndex(w => w.id === ws.id);
        if (idx >= 0) memoryWorkspaces[idx] = ws;
        else memoryWorkspaces.push(ws);
      },
      deleteWorkspace: (id) => {
        memoryWorkspaces = memoryWorkspaces.filter(w => w.id !== id);
        memoryDrafts = memoryDrafts.filter(d => (d.ws || d.ws_id) !== id);
      },
      getDrafts: () => [...memoryDrafts],
      saveDraft: (draft) => {
        const idx = memoryDrafts.findIndex(d => d.id === draft.id);
        if (idx >= 0) memoryDrafts[idx] = draft;
        else memoryDrafts.unshift(draft);
      },
      deleteDraft: (id) => {
        memoryDrafts = memoryDrafts.filter(d => d.id !== id);
      },
      getTags: () => [...memoryTags],
      saveTag: (tag) => {
        const idx = memoryTags.findIndex(t => t.id === tag.id);
        if (idx >= 0) memoryTags[idx] = tag;
        else memoryTags.push(tag);
      },
      deleteTag: (id) => {
        memoryTags = memoryTags.filter(t => t.id !== id);
        memoryDrafts.forEach(d => {
          if (Array.isArray(d.tags)) {
            d.tags = d.tags.filter(t => t !== id);
          }
        });
      }
    };
  }

  // =========================================================================
  // API PUBLIQUE (window.CD_DB)
  // =========================================================================
  window.CD_DB = {
    async init() {
      return await initDatabase();
    },

    // ---------------- WORKSPACES ----------------
    async getWorkspaces() {
      await initDatabase();
      if (typeof dbInstance.getWorkspaces === 'function') {
        return dbInstance.getWorkspaces();
      }
      return querySql('SELECT id, name, slug, color, kind, created_at FROM workspaces ORDER BY created_at ASC');
    },

    async saveWorkspace(ws) {
      await initDatabase();
      if (typeof dbInstance.saveWorkspace === 'function') {
        dbInstance.saveWorkspace(ws);
        await persist();
        return ws;
      }
      runSql(
        `INSERT INTO workspaces (id, name, slug, color, kind)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           slug = excluded.slug,
           color = excluded.color,
           kind = excluded.kind`,
        [ws.id, ws.name, ws.slug, ws.color, ws.kind || 'mixed']
      );
      await persist();
      return ws;
    },

    async deleteWorkspace(id) {
      await initDatabase();
      if (typeof dbInstance.deleteWorkspace === 'function') {
        dbInstance.deleteWorkspace(id);
        await persist();
        return;
      }
      runSql('DELETE FROM workspaces WHERE id = ?', [id]);
      runSql('DELETE FROM drafts WHERE ws_id = ?', [id]);
      await persist();
    },

    // ---------------- DRAFTS ----------------
    async getDrafts(wsId = null) {
      await initDatabase();
      if (typeof dbInstance.getDrafts === 'function') {
        let list = dbInstance.getDrafts();
        if (wsId && wsId !== 'all') {
          list = list.filter(d => (d.ws || d.ws_id) === wsId);
        }
        return list;
      }

      let sql = 'SELECT * FROM drafts';
      let params = [];
      if (wsId && wsId !== 'all' && wsId !== 'inbox') {
        sql += ' WHERE ws_id = ?';
        params.push(wsId);
      }
      sql += ' ORDER BY created_at DESC';

      const rows = querySql(sql, params);
      return rows.map(r => ({
        id: r.id,
        ws: r.ws_id,
        title: r.title,
        body: r.body,
        status: r.status,
        channel: r.channel,
        scheduled: (r.scheduled_day !== null && r.scheduled_day !== undefined)
          ? { day: Number(r.scheduled_day), hour: Number(r.scheduled_hour || 12) }
          : null,
        variants: r.variants_json ? JSON.parse(r.variants_json) : {},
        hashtags: r.hashtags_json ? JSON.parse(r.hashtags_json) : [],
        images: r.images_json ? JSON.parse(r.images_json) : [],
        tags: r.tags_json ? JSON.parse(r.tags_json) : [],
        slides: r.slides_json ? JSON.parse(r.slides_json) : [],
        palette: r.palette_json ? JSON.parse(r.palette_json) : [],
        typography: r.typography_json ? JSON.parse(r.typography_json) : [],
        code: r.code_json ? JSON.parse(r.code_json) : null,
        attachments: r.attachments_json ? JSON.parse(r.attachments_json) : [],
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
    },

    async saveDraft(draft) {
      await initDatabase();
      if (typeof dbInstance.saveDraft === 'function') {
        dbInstance.saveDraft(draft);
        await persist();
        return draft;
      }

      const scheduledDay = draft.scheduled ? draft.scheduled.day : null;
      const scheduledHour = draft.scheduled ? draft.scheduled.hour : null;

      runSql(
        `INSERT INTO drafts (
          id, ws_id, title, body, status, channel,
          scheduled_day, scheduled_hour,
          variants_json, hashtags_json, images_json, tags_json,
          slides_json, palette_json, typography_json, code_json, attachments_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          ws_id = excluded.ws_id,
          title = excluded.title,
          body = excluded.body,
          status = excluded.status,
          channel = excluded.channel,
          scheduled_day = excluded.scheduled_day,
          scheduled_hour = excluded.scheduled_hour,
          variants_json = excluded.variants_json,
          hashtags_json = excluded.hashtags_json,
          images_json = excluded.images_json,
          tags_json = excluded.tags_json,
          slides_json = excluded.slides_json,
          palette_json = excluded.palette_json,
          typography_json = excluded.typography_json,
          code_json = excluded.code_json,
          attachments_json = excluded.attachments_json,
          updated_at = CURRENT_TIMESTAMP`,
        [
          draft.id,
          draft.ws || draft.ws_id || 'ws-main',
          draft.title || 'Sans titre',
          draft.body || '',
          draft.status || 'idea',
          draft.channel || 'ig',
          scheduledDay,
          scheduledHour,
          JSON.stringify(draft.variants || {}),
          JSON.stringify(draft.hashtags || []),
          JSON.stringify(draft.images || []),
          JSON.stringify(draft.tags || []),
          JSON.stringify(draft.slides || []),
          JSON.stringify(draft.palette || []),
          JSON.stringify(draft.typography || []),
          JSON.stringify(draft.code || null),
          JSON.stringify(draft.attachments || [])
        ]
      );
      await persist();
      return draft;
    },

    async deleteDraft(id) {
      await initDatabase();
      if (typeof dbInstance.deleteDraft === 'function') {
        dbInstance.deleteDraft(id);
        await persist();
        return;
      }
      runSql('DELETE FROM drafts WHERE id = ?', [id]);
      await persist();
    },

    // ---------------- TAGS ----------------
    async getTags() {
      await initDatabase();
      if (typeof dbInstance.getTags === 'function') {
        return dbInstance.getTags();
      }
      if (typeof dbInstance.exec === 'function') {
        const rows = querySql('SELECT id, label, color, ws_id FROM tags');
        return rows.map(r => ({ id: r.id, label: r.label, color: r.color, ws: r.ws_id }));
      }
      return (window.CD_DATA && window.CD_DATA.tags) || [];
    },

    async saveTag(tag) {
      await initDatabase();
      if (typeof dbInstance.saveTag === 'function') {
        dbInstance.saveTag(tag);
        await persist();
        return tag;
      }
      runSql(
        `INSERT INTO tags (id, label, color, ws_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           color = excluded.color,
           ws_id = excluded.ws_id`,
        [tag.id, tag.label, tag.color || '#a78bfa', tag.ws || tag.ws_id || null]
      );
      await persist();
      return tag;
    },

    async deleteTag(id) {
      await initDatabase();
      if (typeof dbInstance.deleteTag === 'function') {
        dbInstance.deleteTag(id);
        await persist();
        return;
      }
      runSql('DELETE FROM tags WHERE id = ?', [id]);
      try {
        const rows = querySql("SELECT id, tags_json FROM drafts WHERE tags_json LIKE ?", [`%${id}%`]);
        for (const r of rows) {
          let list = [];
          try { list = JSON.parse(r.tags_json || '[]'); } catch(e) {}
          if (list.includes(id)) {
            const updated = list.filter(x => x !== id);
            runSql('UPDATE drafts SET tags_json = ? WHERE id = ?', [JSON.stringify(updated), r.id]);
          }
        }
      } catch(e) {
        console.warn('[CD_DB] Nettoyage tags_json orphelin :', e);
      }
      await persist();
    },

    // ---------------- SAUVEGARDES & MIGRATIONS SANS PERTE ----------------
    async backupDatabase(slot = 'user_manual') {
      await initDatabase();
      if (typeof dbInstance.export === 'function') {
        const bytes = dbInstance.export();
        await saveBackupSnapshot(slot, bytes);
        return { success: true, slot, date: new Date().toISOString() };
      }
      return { success: false, error: 'WASM SQLite non actif' };
    },

    async restoreDatabaseFromBackup(slot = 'user_manual') {
      await initDatabase();
      const bytes = await loadBackupSnapshot(slot);
      if (!bytes || bytes.length === 0) {
        throw new Error('Aucun point de sauvegarde trouvé pour ce nom.');
      }
      if (typeof window.initSqlJs === 'function') {
        const SQL = await window.initSqlJs({
          locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${f}`
        });
        dbInstance = new SQL.Database(bytes);
        await persist();
        return true;
      }
      throw new Error('Moteur SQLite non disponible pour la restauration.');
    },

    async getBackupInfo(slot = 'user_manual') {
      try {
        const bytes = await loadBackupSnapshot(slot);
        let date = localStorage.getItem(`cd_backup_${slot}_date`);
        return {
          exists: !!(bytes && bytes.length > 0),
          sizeBytes: bytes ? bytes.byteLength : 0,
          date: date || (bytes ? 'Point disponible' : null)
        };
      } catch(e) {
        return { exists: false, sizeBytes: 0, date: null };
      }
    },

    // ---------------- STATS & INFOS BDD ----------------
    async getDatabaseStats() {
      await initDatabase();
      const stats = {
        driver: (typeof dbInstance.export === 'function') ? 'SQLite 3 (WASM / Natif)' : 'SQLite Adaptateur Local',
        tables: {
          workspaces: 0,
          drafts: 0,
          tags: 0,
          comments: 0
        },
        sizeBytes: 0
      };

      try {
        if (typeof dbInstance.exec === 'function') {
          const wsCount = querySql('SELECT COUNT(*) as count FROM workspaces');
          const draftsCount = querySql('SELECT COUNT(*) as count FROM drafts');
          const tagsCount = querySql('SELECT COUNT(*) as count FROM tags');
          stats.tables.workspaces = wsCount[0]?.count || 0;
          stats.tables.drafts = draftsCount[0]?.count || 0;
          stats.tables.tags = tagsCount[0]?.count || 0;
          if (typeof dbInstance.export === 'function') {
            const bytes = dbInstance.export();
            stats.sizeBytes = bytes.byteLength;
          }
        } else {
          const ws = await this.getWorkspaces();
          const dr = await this.getDrafts();
          stats.tables.workspaces = ws.length;
          stats.tables.drafts = dr.length;
        }
      } catch (e) {
        console.error('[CD_DB] Erreur getDatabaseStats :', e);
      }
      return stats;
    },

    // ---------------- EXPORT / IMPORT DU FICHIER SQLITE ----------------
    async exportSqliteFile() {
      await initDatabase();
      let bytes = null;
      if (typeof dbInstance.export === 'function') {
        bytes = dbInstance.export();
      } else {
        const ws = await this.getWorkspaces();
        const dr = await this.getDrafts();
        const json = JSON.stringify({ workspaces: ws, drafts: dr }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contentdock_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        return;
      }

      const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contentdock_${new Date().toISOString().slice(0,10)}.sqlite3`;
      a.click();
      URL.revokeObjectURL(url);
    },

    async importSqliteFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const buffer = new Uint8Array(reader.result);
            if (typeof window.initSqlJs === 'function') {
              const SQL = await window.initSqlJs({
                locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${f}`
              });
              dbInstance = new SQL.Database(buffer);
              await persist();
              resolve(true);
            } else {
              reject(new Error('Moteur SQLite WASM non disponible'));
            }
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    },

    // ----------------- AUTHENTIFICATION & UTILISATEURS -----------------
    async hashPassword(password) {
      return await hashPassword(password);
    },

    async registerUser({ name, email, password, code = null }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      if (!normEmail) throw new Error('Adresse email requise');
      if (!password || password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères');

      const existing = querySql('SELECT id, is_verified FROM users WHERE LOWER(email) = ?', [normEmail]);
      const pwdHash = await hashPassword(password);
      const avatarInitials = (name || normEmail.split('@')[0])
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      if (existing && existing.length > 0) {
        if (existing[0].is_verified === 1) {
          throw new Error('Un compte vérifié avec cette adresse email existe déjà.');
        } else {
          runSql(
            'UPDATE users SET name = ?, password_hash = ?, verification_code = ?, avatar = ? WHERE id = ?',
            [name.trim(), pwdHash, code, avatarInitials, existing[0].id]
          );
          await persist();
          return { id: existing[0].id, name: name.trim(), email: normEmail, avatar: avatarInitials, is_verified: 0 };
        }
      }

      const userId = 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      runSql(
        'INSERT INTO users (id, name, email, password_hash, avatar, role, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name.trim(), normEmail, pwdHash, avatarInitials, 'creator', 0, code]
      );
      await persist();
      return { id: userId, name: name.trim(), email: normEmail, avatar: avatarInitials, is_verified: 0 };
    },

    async loginUser({ email, password }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      const rows = querySql('SELECT * FROM users WHERE LOWER(email) = ?', [normEmail]);
      if (!rows || rows.length === 0) {
        return { success: false, error: 'Identifiants invalides ou compte inexistant.' };
      }
      const user = rows[0];
      const pwdHash = await hashPassword(password);
      if (user.password_hash !== pwdHash) {
        return { success: false, error: 'Identifiants invalides ou mot de passe incorrect.' };
      }
      if (user.is_verified === 0) {
        return { success: false, needsVerification: true, email: normEmail, error: 'Votre adresse email n’est pas encore vérifiée.' };
      }

      try {
        runSql('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        await persist();
      } catch (e) {}

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
        role: user.role || 'creator',
        is_verified: user.is_verified
      };
      this.setCurrentUser(safeUser);
      return { success: true, user: safeUser };
    },

    async loginOrRegisterGoogleUser({ googleId, email, name, avatar }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      if (!normEmail) {
        return { success: false, error: 'Adresse email Google introuvable.' };
      }

      let user = null;
      // 1. Recherche par google_id si fourni
      if (googleId) {
        try {
          const rowsById = querySql('SELECT * FROM users WHERE google_id = ?', [googleId]);
          if (rowsById && rowsById.length > 0) user = rowsById[0];
        } catch (e) {}
      }

      // 2. Recherche par adresse email si pas encore trouvé
      if (!user) {
        const rowsByEmail = querySql('SELECT * FROM users WHERE LOWER(email) = ?', [normEmail]);
        if (rowsByEmail && rowsByEmail.length > 0) user = rowsByEmail[0];
      }

      const displayName = (name || normEmail.split('@')[0]).trim();
      const avatarValue = avatar || displayName.slice(0, 2).toUpperCase();

      if (user) {
        // Utilisateur existant : mise à jour session, validation et google_id si absent
        try {
          runSql(
            'UPDATE users SET is_verified = 1, last_login = CURRENT_TIMESTAMP, name = COALESCE(NULLIF(?, ""), name), avatar = COALESCE(?, avatar) WHERE id = ?',
            [displayName, avatarValue, user.id]
          );
          if (googleId && !user.google_id) {
            try {
              runSql('UPDATE users SET google_id = ?, auth_provider = "google" WHERE id = ?', [googleId, user.id]);
            } catch (e) {}
          }
          await persist();
        } catch (e) {}
        user.name = displayName || user.name;
        user.avatar = avatarValue || user.avatar;
        user.is_verified = 1;
      } else {
        // Nouvel utilisateur Google
        const userId = 'u-g-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const pwdHash = 'GOOGLE_OAUTH_' + (googleId || Date.now());
        try {
          runSql(
            'INSERT INTO users (id, name, email, password_hash, avatar, role, is_verified, verification_code, google_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, displayName, normEmail, pwdHash, avatarValue, 'creator', 1, null, googleId || null, 'google']
          );
        } catch (err) {
          // Fallback si colonnes pas encore créées
          runSql(
            'INSERT INTO users (id, name, email, password_hash, avatar, role, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, displayName, normEmail, pwdHash, avatarValue, 'creator', 1, null]
          );
        }
        await persist();
        user = {
          id: userId,
          name: displayName,
          email: normEmail,
          avatar: avatarValue,
          role: 'creator',
          is_verified: 1,
          google_id: googleId,
          auth_provider: 'google'
        };
      }

      const safeUser = {
        id: user.id,
        name: user.name || displayName,
        email: user.email || normEmail,
        avatar: user.avatar || avatarValue,
        role: user.role || 'creator',
        is_verified: 1,
        authProvider: 'google'
      };

      this.setCurrentUser(safeUser);
      return { success: true, user: safeUser };
    },

    async verifyEmailCode({ email, code }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      const inputCode = (code || '').trim();
      const rows = querySql('SELECT * FROM users WHERE LOWER(email) = ?', [normEmail]);
      if (!rows || rows.length === 0) {
        return { success: false, error: 'Compte introuvable.' };
      }
      const user = rows[0];
      if (!user.verification_code || user.verification_code !== inputCode) {
        return { success: false, error: 'Code de vérification invalide ou expiré.' };
      }

      runSql('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id]);
      await persist();

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
        role: user.role || 'creator',
        is_verified: 1
      };
      this.setCurrentUser(safeUser);
      return { success: true, user: safeUser };
    },

    async setVerificationCode({ email, code }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      runSql('UPDATE users SET verification_code = ? WHERE LOWER(email) = ?', [code, normEmail]);
      await persist();
      return true;
    },

    async requestPasswordReset({ email, code }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      const rows = querySql('SELECT id, name FROM users WHERE LOWER(email) = ?', [normEmail]);
      if (!rows || rows.length === 0) {
        return { success: false, error: 'Aucun compte associé à cette adresse email.' };
      }
      runSql('UPDATE users SET verification_code = ? WHERE LOWER(email) = ?', [code, normEmail]);
      await persist();
      return { success: true, name: rows[0].name };
    },

    async resetPassword({ email, code, newPassword }) {
      await initDatabase();
      const normEmail = (email || '').trim().toLowerCase();
      const inputCode = (code || '').trim();
      const rows = querySql('SELECT * FROM users WHERE LOWER(email) = ?', [normEmail]);
      if (!rows || rows.length === 0) {
        return { success: false, error: 'Compte introuvable.' };
      }
      const user = rows[0];
      if (!user.verification_code || user.verification_code !== inputCode) {
        return { success: false, error: 'Code de réinitialisation incorrect ou expiré.' };
      }
      const newHash = await hashPassword(newPassword);
      runSql('UPDATE users SET password_hash = ?, verification_code = NULL WHERE id = ?', [newHash, user.id]);
      await persist();
      return { success: true };
    },

    getCurrentUser() {
      try {
        const json = localStorage.getItem('cd_current_user');
        if (json) return JSON.parse(json);
      } catch (e) {}
      return null;
    },

    setCurrentUser(user) {
      try {
        if (user) {
          localStorage.setItem('cd_current_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('cd_current_user');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cd-auth-change', { detail: user }));
        }
      } catch (e) {}
    },

    logoutUser() {
      this.setCurrentUser(null);
    },

    async cleanDemoData() {
      await initDatabase();
      try {
        runSql(`DELETE FROM drafts WHERE id IN ('d1','d2','d3','d4','d5','d6','d7','d8','d9','d10','d11','d12','d13','d14','d15','d16','d17','d18','d19','d20')`);
        runSql(`DELETE FROM workspaces WHERE id IN ('ws-graph', 'ws-dev', 'ws-cm-a', 'ws-cm-b')`);
        runSql(`DELETE FROM tags WHERE id IN ('t-carrousel','t-promo','t-uiux','t-veille','t-snippet','t-launch','t-moodboard','t-shortform')`);

        const existingWs = querySql('SELECT id FROM workspaces LIMIT 1');
        if (!existingWs || existingWs.length === 0) {
          runSql(
            'INSERT OR IGNORE INTO workspaces (id, name, slug, color, kind) VALUES (?, ?, ?, ?, ?)',
            ['ws-main', 'Mon Espace', 'mon-espace', '#ff5a1f', 'mixed']
          );
        }

        await persist();

        const cleanWs = querySql('SELECT * FROM workspaces').map(w => ({ id: w.id, name: w.name, slug: w.slug, color: w.color, kind: w.kind }));
        const cleanTags = querySql('SELECT * FROM tags').map(t => ({ id: t.id, label: t.label, color: t.color, ws: t.ws_id }));

        try {
          localStorage.setItem('cd-workspaces', JSON.stringify(cleanWs));
          localStorage.setItem('cd-drafts-v3', JSON.stringify([]));
          localStorage.setItem('cd-tags-v2', JSON.stringify(cleanTags));
        } catch(e) {}

        return { success: true, workspaces: cleanWs.length, drafts: 0 };
      } catch(e) {
        console.error('[CD_DB] Erreur cleanDemoData :', e);
        return { success: false, error: e.message };
      }
    },

    // Exécution de requête SQL arbitraire pour la console d'administration ou debugging
    rawQuery(sql, params = []) {
      return querySql(sql, params);
    }
  };

  // Alias universel pour compatibilité
  if (typeof window !== 'undefined') {
    window.ContentDockDB = window.CD_DB;
  }

  // Démarrage automatique au chargement
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      window.CD_DB.init().catch(err => console.error('[CD_DB] Échec auto-init :', err));
    });
  }
})();

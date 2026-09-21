// PWA install prompt + SW registration UI
const { useState: useStateP, useEffect: useEffectP } = React;

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('cd-can-install'));
});

async function registerSW() {
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'unsupported' };
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    return { ok: true, reg };
  } catch(e) {
    return { ok: false, reason: e.message };
  }
}

function usePWA() {
  const [canInstall, setCanInstall] = useStateP(!!deferredInstallPrompt);
  const [installed, setInstalled] = useStateP(() => window.matchMedia('(display-mode: standalone)').matches);
  const [swStatus, setSwStatus] = useStateP('unknown');

  useEffectP(() => {
    const on = () => setCanInstall(true);
    const done = () => { setInstalled(true); setCanInstall(false); };
    window.addEventListener('cd-can-install', on);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('cd-can-install', on);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  const install = async () => {
    if (!deferredInstallPrompt) return { ok: false };
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setCanInstall(false);
    return { ok: choice.outcome === 'accepted' };
  };

  const activateSW = async () => {
    setSwStatus('registering');
    const r = await registerSW();
    setSwStatus(r.ok ? 'active' : 'failed');
    return r;
  };

  return { canInstall, installed, install, swStatus, activateSW };
}

function PWATab({ onToast }) {
  const pwa = usePWA();

  const [swActive, setSwActive] = useStateP(false);
  useEffectP(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(r => setSwActive(!!r?.active));
    }
  }, [pwa.swStatus]);

  return (
    <div>
      <div className="settings-section">
        <h2>Installation PWA</h2>
        <div className="desc">
          Installez ContentDock comme application native — accessible depuis votre bureau, dock, écran d'accueil, avec support hors-ligne complet.
        </div>

        <div className="settings-row">
          <div className="label">État de l'installation</div>
          <div className="value">
            {pwa.installed
              ? <span className="status ready"><span className="dot"/>Installée</span>
              : pwa.canInstall
                ? <span className="status ready"><span className="dot"/>Installable</span>
                : <span className="status idea"><span className="dot"/>Non installable ici</span>
            }
          </div>
        </div>

        <div className="settings-row">
          <div className="label">Action</div>
          <div className="value">
            {pwa.installed ? (
              <span style={{color: 'var(--text-3)', fontSize: 12}}>Vous utilisez déjà l'app installée ✅</span>
            ) : pwa.canInstall ? (
              <button className="btn primary" onClick={async () => {
                const r = await pwa.install();
                if (r.ok) onToast('ContentDock installé ✅');
              }}>
                <IconDownload/>Installer ContentDock
              </button>
            ) : (
              <div style={{color: 'var(--text-3)', fontSize: 12}}>
                Sur mobile : ouvrez le menu du navigateur → « Ajouter à l'écran d'accueil ».
                <br/>Sur desktop : cherchez l'icône ⊕ dans la barre d'adresse.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Mode hors-ligne</h2>
        <div className="desc">
          Un service worker met en cache l'application pour qu'elle fonctionne sans connexion.
        </div>
        <div className="settings-row">
          <div className="label">Service Worker</div>
          <div className="value">
            {swActive
              ? <span className="status ready"><span className="dot"/>Actif · cache activé</span>
              : <span className="status idea"><span className="dot"/>Non activé</span>}
          </div>
        </div>
        {!swActive && (
          <div className="settings-row">
            <div className="label">Activer</div>
            <div className="value">
              <button className="btn primary" onClick={async () => {
                const r = await pwa.activateSW();
                if (r.ok) { onToast('Service worker activé — vous pouvez maintenant utiliser l\'app hors-ligne'); setSwActive(true); }
                else onToast('Impossible d\'activer : ' + r.reason);
              }}>
                <IconZap/>Activer le mode hors-ligne
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Diagnostic</h2>
        <div className="settings-row">
          <div className="label">Standalone</div>
          <div className="value" style={{fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-2)'}}>
            {window.matchMedia('(display-mode: standalone)').matches ? 'true' : 'false'}
          </div>
        </div>
        <div className="settings-row">
          <div className="label">Support SW</div>
          <div className="value" style={{fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-2)'}}>
            {'serviceWorker' in navigator ? 'true' : 'false'}
          </div>
        </div>
        <div className="settings-row">
          <div className="label">Support Notifications</div>
          <div className="value" style={{fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-2)'}}>
            {'Notification' in window ? 'true' : 'false'}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PWATab, usePWA, registerSW });

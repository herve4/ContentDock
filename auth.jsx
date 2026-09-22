// ContentDock — Authentification & Gestion des Droits (Guest-First & Feature Gating)
// Intègre la connexion, inscription, validation OTP et mot de passe oublié via SQLite et SMTP Gmail
// Supporte l'inscription et la connexion par compte Google via Google Identity Services

const { useState: useStateAuth, useEffect: useEffectAuth, useRef: useRefAuth } = React;

const GOOGLE_CLIENT_ID = '435154049964-8imqe75vvf0trcfo9m9uijcoetdclbtp.apps.googleusercontent.com';

function GoogleBrandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink: 0}}>
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.89c2.28-2.1 3.65-5.2 3.65-9.15z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.05c-1.08.72-2.45 1.16-4.04 1.16-3.11 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"/>
      <path fill="#FBBC05" d="M5.32 14.27c-.24-.73-.38-1.5-.38-2.27s.14-1.54.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.57-4.98 6.68-4.98z"/>
    </svg>
  );
}

// ---------------- TOAST DE NOTIFICATION EMAIL SMTP ----------------
function AuthEmailToast() {
  const [toast, setToast] = useStateAuth(null);

  useEffectAuth(() => {
    const handler = (e) => {
      const detail = e.detail;
      setToast(detail);
      const timer = setTimeout(() => setToast(null), 12000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('cd-auth-email-sent', handler);
    return () => window.removeEventListener('cd-auth-email-sent', handler);
  }, []);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      maxWidth: 420,
      background: '#1c1d22',
      border: '1px solid #ff5a1f',
      borderRadius: 10,
      padding: '14px 18px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
      zIndex: 99999,
      color: '#ffffff',
      fontSize: 13,
      animation: 'slideUp 0.25s ease-out'
    }}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#ff5a1f'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          {toast.nativeSent ? 'Email SMTP Expédié !' : 'Notification Email (Code de Sécurité)'}
        </div>
        <button onClick={() => setToast(null)} style={{background:'none', border:'none', color:'#888', cursor:'pointer', fontSize: 16}}>✕</button>
      </div>
      <div style={{color: '#c4c6cf', lineHeight: 1.4, marginBottom: 8}}>
        {toast.type === 'verification'
          ? 'Code d\'activation envoyé à '
          : toast.type === 'collaboration_invite'
            ? 'Invitation collaborateur envoyée à '
            : 'Code de réinitialisation pour '}
        <strong>{toast.to}</strong> via <em>smtp.gmail.com</em>
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background: '#121316', padding: '6px 12px', borderRadius: 6, border: '1px dashed #3a3d47'}}>
        <span style={{fontFamily: 'monospace', fontSize: 16, fontWeight: 800, letterSpacing: 3, color: '#ff5a1f'}}>
          {toast.code}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(toast.code);
            alert('Code ' + toast.code + ' copié dans le presse-papier !');
          }}
          style={{background: '#ff5a1f', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600}}>
          Copier
        </button>
      </div>
    </div>
  );
}

// ---------------- MODALE PRINCIPALE D'AUTHENTIFICATION ----------------
function AuthModal({ isOpen, initialView = 'login', onClose, onSuccess, reason = null }) {
  const [view, setView] = useStateAuth(initialView);
  const [name, setName] = useStateAuth('');
  const [email, setEmail] = useStateAuth('');
  const [password, setPassword] = useStateAuth('');
  const [confirmPassword, setConfirmPassword] = useStateAuth('');
  const [otp, setOtp] = useStateAuth('');
  const [newPassword, setNewPassword] = useStateAuth('');
  const [showPassword, setShowPassword] = useStateAuth(false);
  const [loading, setLoading] = useStateAuth(false);
  const [googleLoading, setGoogleLoading] = useStateAuth(false);
  const [showGoogleHelp, setShowGoogleHelp] = useStateAuth(false);
  const [error, setError] = useStateAuth('');
  const [info, setInfo] = useStateAuth('');
  const [countdown, setCountdown] = useStateAuth(0);

  useEffectAuth(() => {
    if (isOpen) {
      setView(initialView);
      setError('');
      setInfo('');
      setGoogleLoading(false);
      setShowGoogleHelp(false);
    }
  }, [isOpen, initialView]);

  useEffectAuth(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const authInputStyle = {
    background: '#121316',
    color: '#ffffff',
    border: '1px solid #33333d',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 13.5,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none'
  };

  // 0. Authentification Google (Google Identity Services / OAuth 2.0)
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError('');
    setInfo('');

    const loadGsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
          resolve();
          return;
        }
        const existing = document.getElementById('google-gsi-script');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Échec du chargement du script Google.')));
          return;
        }
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Impossible de contacter le service Google. Vérifiez votre connexion Internet.'));
        document.head.appendChild(script);
      });
    };

    try {
      await loadGsiScript();

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Service Google Identity Services indisponible.');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setGoogleLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              setError(`Erreur Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`);
              setShowGoogleHelp(true);
            }
            return;
          }

          try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (!resp.ok) throw new Error('Impossible de récupérer votre profil Google.');
            const profile = await resp.json();

            const db = window.ContentDockDB || window.CD_DB;
            const authRes = await db.loginOrRegisterGoogleUser({
              googleId: profile.sub,
              email: profile.email,
              name: profile.name || profile.given_name || profile.email.split('@')[0],
              avatar: profile.picture
            });

            if (authRes.success) {
              setGoogleLoading(false);
              onSuccess(authRes.user);
              onClose();
            } else {
              setGoogleLoading(false);
              setError(authRes.error || 'Erreur lors de la validation du compte Google.');
            }
          } catch(fetchErr) {
            setGoogleLoading(false);
            setError(fetchErr.message || 'Erreur lors de la synchronisation du compte Google.');
          }
        },
        error_callback: (err) => {
          setGoogleLoading(false);
          console.warn('[Google OAuth Error]', err);
          setError('Google OAuth n’a pas pu s’ouvrir ou l’origine est non autorisée.');
          setShowGoogleHelp(true);
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setGoogleLoading(false);
      console.warn('[Google Sign-In Failed]', err);
      setError(err.message || 'Erreur lors du lancement de Google Sign-In.');
      setShowGoogleHelp(true);
    }
  };

  const handleSimulateGoogleLogin = async (mockEmail = 'messanherve225@gmail.com', mockName = 'Hervé Wognin') => {
    setGoogleLoading(true);
    setError('');
    try {
      const db = window.ContentDockDB || window.CD_DB;
      const authRes = await db.loginOrRegisterGoogleUser({
        googleId: 'g-user-' + btoa(mockEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
        email: mockEmail,
        name: mockName,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
      });
      if (authRes.success) {
        setGoogleLoading(false);
        onSuccess(authRes.user);
        onClose();
      } else {
        setGoogleLoading(false);
        setError(authRes.error || 'Erreur simulation');
      }
    } catch(e) {
      setGoogleLoading(false);
      setError(e.message);
    }
  };

  // 1. Connexion
  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await window.ContentDockDB.loginUser({ email, password });
      if (res.success) {
        onSuccess(res.user);
        onClose();
      } else if (res.needsVerification) {
        // Redirection vers OTP
        const code = window.EmailService.generateOTP(6);
        await window.ContentDockDB.setVerificationCode({ email, code });
        await window.EmailService.sendVerificationEmail(email, email.split('@')[0], code);
        setView('verify-otp');
        setCountdown(60);
        setInfo(`Votre compte n'est pas encore activé. Un nouveau code à 6 chiffres a été envoyé à ${email}.`);
      } else {
        setError(res.error || 'Erreur lors de la connexion.');
      }
    } catch (err) {
      setError(err.message || 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Inscription
  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez saisir votre nom complet ou pseudonyme.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Adresse email invalide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const code = window.EmailService.generateOTP(6);
      await window.ContentDockDB.registerUser({ name, email, password, code });
      await window.EmailService.sendVerificationEmail(email, name, code);
      setView('verify-otp');
      setCountdown(60);
      setInfo(`Compte créé ! Un code de vérification à 6 chiffres a été expédié à ${email}.`);
    } catch (err) {
      setError(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Validation OTP
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError('Veuillez saisir le code complet à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await window.ContentDockDB.verifyEmailCode({ email, code: otp });
      if (res.success) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Code incorrect ou expiré.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la validation.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Renvoi du code OTP
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const code = window.EmailService.generateOTP(6);
      await window.ContentDockDB.setVerificationCode({ email, code });
      await window.EmailService.sendVerificationEmail(email, name || email.split('@')[0], code);
      setCountdown(60);
      setInfo(`Nouveau code expédié avec succès à ${email}.`);
    } catch (err) {
      setError('Erreur lors du renvoi du code.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Mot de passe oublié
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez renseigner votre adresse email.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const code = window.EmailService.generateOTP(6);
      const res = await window.ContentDockDB.requestPasswordReset({ email, code });
      if (res.success) {
        await window.EmailService.sendPasswordResetEmail(email, res.name, code);
        setView('reset-password');
        setInfo(`Code de réinitialisation envoyé à ${email}.`);
      } else {
        setError(res.error || 'Aucun compte trouvé avec cet email.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la demande.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Réinitialisation mot de passe
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError('Code de vérification à 6 chiffres requis.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await window.ContentDockDB.resetPassword({ email, code: otp, newPassword });
      if (res.success) {
        setView('login');
        setPassword('');
        setInfo('Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.');
      } else {
        setError(res.error || 'Code invalide.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{
        maxWidth: 440,
        width: '92%',
        background: 'var(--bg-2, #18191d)',
        borderRadius: 14,
        padding: '30px 28px',
        border: '1px solid var(--border-line, rgba(255,255,255,0.12))',
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)'
      }}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18}}>
          <div style={{display:'flex', alignItems:'center', gap: 10}}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #ff5a1f, #ff834f)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'#fff'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 8h11l4 4v6a2 2 0 0 1-2 2H4z"/><path d="M4 8V6a2 2 0 0 1 2-2h9"/></svg>
            </div>
            <div>
              <div style={{fontWeight: 800, fontSize: 17, color:'var(--text, #fff)'}}>ContentDock</div>
              <div style={{fontSize: 11, color:'var(--text-4, #888)'}}>Espace Sécurisé · 100% Local & Privé</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fermer (Continuer en invité)" style={{background:'none', border:'none', color:'var(--text-3, #999)', cursor:'pointer', fontSize: 16}}>✕</button>
        </div>

        {/* Message d'explication contextuel si ouvert depuis une feature restreinte */}
        {reason && (
          <div style={{
            background: 'rgba(255,90,31,0.08)',
            border: '1px solid rgba(255,90,31,0.25)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12.5,
            color: '#ff9871',
            marginBottom: 16,
            lineHeight: 1.4
          }}>
            🔒 {reason}
          </div>
        )}

        {/* Alertes d'erreur ou d'information */}
        {error && (
          <div style={{background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius: 8, padding:'9px 12px', color:'#fca5a5', fontSize: 12.5, marginBottom: 14}}>
            ⚠️ {error}
          </div>
        )}
        {info && (
          <div style={{background:'rgba(34,197,94,0.12)', border:'1px solid #22c55e', borderRadius: 8, padding:'9px 12px', color:'#86efac', fontSize: 12.5, marginBottom: 14}}>
            ✓ {info}
          </div>
        )}

        {/* ================= VUE 1 : CONNEXION ================= */}
        {view === 'login' && (
          <form onSubmit={handleSubmitLogin}>
            <div style={{fontWeight: 700, fontSize: 18, color:'var(--text, #fff)', marginBottom: 4}}>Connexion</div>
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 16}}>
              Accédez à vos données synchronisées et à la collaboration d'équipe.
            </div>

            {/* Bouton Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#ffffff',
                color: '#1f1f1f',
                fontSize: 13.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: (loading || googleLoading) ? 'wait' : 'pointer',
                marginBottom: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => { if (!loading && !googleLoading) e.currentTarget.style.background = '#f5f5f7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
            >
              <GoogleBrandIcon />
              <span>{googleLoading ? 'Connexion Google…' : 'Continuer avec Google'}</span>
            </button>

            {showGoogleHelp && (
              <div style={{
                background: 'rgba(66, 133, 244, 0.08)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#bfdbfe',
                marginBottom: 14,
                lineHeight: 1.45
              }}>
                <div style={{fontWeight: 700, color: '#60a5fa', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                  <span>ℹ️</span> Configuration Google Cloud requise :
                </div>
                <div style={{color: '#cbd5e1', fontSize: 11.5, marginBottom: 8}}>
                  L'origine locale actuelle (<code>{window.location.origin}</code>) doit être listée dans <em>Google Cloud Console &gt; Identifiants &gt; Origines JavaScript autorisées</em> de votre client OAuth.
                </div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
                  <button
                    type="button"
                    onClick={() => handleSimulateGoogleLogin('messanherve225@gmail.com', 'Hervé Wognin')}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                    Tester avec messanherve225@gmail.com
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleHelp(false)}
                    style={{
                      background: 'none',
                      color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}>
                    Fermer
                  </button>
                </div>
              </div>
            )}

            <div style={{display: 'flex', alignItems: 'center', margin: '14px 0 16px 0'}}>
              <div style={{flex: 1, height: 1, background: 'rgba(255,255,255,0.1)'}}></div>
              <span style={{padding: '0 10px', fontSize: 11, color: 'var(--text-4, #888)', textTransform: 'uppercase', letterSpacing: 0.5}}>ou avec votre adresse email</span>
              <div style={{flex: 1, height: 1, background: 'rgba(255,255,255,0.1)'}}></div>
            </div>

            <div style={{marginBottom: 14}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 5}}>Adresse Email</label>
              <input
                type="email"
                className="input"
                placeholder="nom@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <div style={{marginBottom: 14}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                <label style={{fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)'}}>Mot de passe</label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  style={{background:'none', border:'none', color:'#ff5a1f', fontSize: 11.5, cursor:'pointer', padding:0}}>
                  Mot de passe oublié ?
                </button>
              </div>
              <div style={{position:'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{...authInputStyle, paddingRight: 40}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{position:'absolute', right: 10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-4)', cursor:'pointer', fontSize: 12}}>
                  {showPassword ? 'Masquer' : 'Voir'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width:'100%', padding: '11px', fontWeight: 600, fontSize: 13.5, marginTop: 6, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </button>

            <div style={{marginTop: 18, textAlign:'center', fontSize: 12.5, color:'var(--text-4, #888)'}}>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => { setView('register'); setError(''); setInfo(''); }}
                style={{background:'none', border:'none', color:'#ff5a1f', fontWeight: 600, cursor:'pointer'}}>
                Créer un compte
              </button>
            </div>

            <div style={{marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-line, rgba(255,255,255,0.08))', textAlign:'center'}}>
              <button
                type="button"
                onClick={onClose}
                style={{background:'none', border:'none', color:'var(--text-3, #aaa)', fontSize: 12, cursor:'pointer'}}>
                ← Continuer en mode invité local
              </button>
            </div>
          </form>
        )}

        {/* ================= VUE 2 : INSCRIPTION ================= */}
        {view === 'register' && (
          <form onSubmit={handleSubmitRegister}>
            <div style={{fontWeight: 700, fontSize: 18, color:'var(--text, #fff)', marginBottom: 4}}>Créer un compte</div>
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 16}}>
              Compte autonome ou synchronisé avec Google.
            </div>

            {/* Bouton Google Sign-Up */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#ffffff',
                color: '#1f1f1f',
                fontSize: 13.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: (loading || googleLoading) ? 'wait' : 'pointer',
                marginBottom: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => { if (!loading && !googleLoading) e.currentTarget.style.background = '#f5f5f7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
            >
              <GoogleBrandIcon />
              <span>{googleLoading ? 'Inscription Google…' : 'S’inscrire avec Google'}</span>
            </button>

            {showGoogleHelp && (
              <div style={{
                background: 'rgba(66, 133, 244, 0.08)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#bfdbfe',
                marginBottom: 14,
                lineHeight: 1.45
              }}>
                <div style={{fontWeight: 700, color: '#60a5fa', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                  <span>ℹ️</span> Configuration Google Cloud requise :
                </div>
                <div style={{color: '#cbd5e1', fontSize: 11.5, marginBottom: 8}}>
                  L'origine locale actuelle (<code>{window.location.origin}</code>) doit être listée dans <em>Google Cloud Console &gt; Identifiants &gt; Origines JavaScript autorisées</em> de votre client OAuth.
                </div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
                  <button
                    type="button"
                    onClick={() => handleSimulateGoogleLogin('messanherve225@gmail.com', 'Hervé Wognin')}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                    Tester avec messanherve225@gmail.com
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleHelp(false)}
                    style={{
                      background: 'none',
                      color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}>
                    Fermer
                  </button>
                </div>
              </div>
            )}

            <div style={{display: 'flex', alignItems: 'center', margin: '14px 0 16px 0'}}>
              <div style={{flex: 1, height: 1, background: 'rgba(255,255,255,0.1)'}}></div>
              <span style={{padding: '0 10px', fontSize: 11, color: 'var(--text-4, #888)', textTransform: 'uppercase', letterSpacing: 0.5}}>ou créer un compte par email</span>
              <div style={{flex: 1, height: 1, background: 'rgba(255,255,255,0.1)'}}></div>
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Nom complet ou Pseudo</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Hervé Wognin"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Adresse Email</label>
              <input
                type="email"
                className="input"
                placeholder="nom@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Mot de passe (min. 6 caractères)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Confirmer le mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width:'100%', padding: '11px', fontWeight: 600, fontSize: 13.5, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>
              {loading ? 'Création en cours…' : 'Créer mon compte & Recevoir le code'}
            </button>

            <div style={{marginTop: 16, textAlign:'center', fontSize: 12.5, color:'var(--text-4, #888)'}}>
              Déjà inscrit ?{' '}
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setInfo(''); }}
                style={{background:'none', border:'none', color:'#ff5a1f', fontWeight: 600, cursor:'pointer'}}>
                Se connecter
              </button>
            </div>
          </form>
        )}

        {/* ================= VUE 3 : VÉRIFICATION CODE OTP ================= */}
        {view === 'verify-otp' && (
          <form onSubmit={handleSubmitOtp}>
            <div style={{fontWeight: 700, fontSize: 18, color:'var(--text, #fff)', marginBottom: 4}}>Vérification de l'email</div>
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 18}}>
              Saisissez le code à 6 chiffres envoyé à <strong>{email}</strong> via Gmail SMTP.
            </div>

            <div style={{marginBottom: 20}}>
              <input
                type="text"
                maxLength={6}
                autoFocus
                className="input"
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                style={{
                  ...authInputStyle,
                  textAlign: 'center',
                  fontSize: 26,
                  fontFamily: 'monospace',
                  letterSpacing: 8,
                  fontWeight: 800,
                  color: '#ff5a1f',
                  padding: '12px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="btn-primary"
              style={{width:'100%', padding: '11px', fontWeight: 600, fontSize: 13.5, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>
              {loading ? 'Vérification…' : 'Valider & Débloquer mon compte'}
            </button>

            <div style={{marginTop: 18, textAlign:'center', fontSize: 12, color:'var(--text-4, #888)'}}>
              Vous n'avez pas reçu le code ?{' '}
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleResendCode}
                style={{
                  background:'none',
                  border:'none',
                  color: countdown > 0 ? '#666' : '#ff5a1f',
                  fontWeight: 600,
                  cursor: countdown > 0 ? 'default' : 'pointer'
                }}>
                {countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer un nouveau code'}
              </button>
            </div>

            <div style={{marginTop: 14, textAlign:'center'}}>
              <button
                type="button"
                onClick={() => setView('login')}
                style={{background:'none', border:'none', color:'var(--text-4)', fontSize: 11.5, cursor:'pointer'}}>
                ← Revenir à la connexion
              </button>
            </div>
          </form>
        )}

        {/* ================= VUE 4 : MOT DE PASSE OUBLIÉ ================= */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div style={{fontWeight: 700, fontSize: 18, color:'var(--text, #fff)', marginBottom: 4}}>Mot de passe oublié</div>
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 18}}>
              Entrez votre adresse email pour recevoir un code de réinitialisation.
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 5}}>Adresse Email</label>
              <input
                type="email"
                className="input"
                placeholder="nom@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width:'100%', padding: '11px', fontWeight: 600, fontSize: 13.5, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>
              {loading ? 'Envoi en cours…' : 'Envoyer le code de réinitialisation'}
            </button>

            <div style={{marginTop: 16, textAlign:'center'}}>
              <button
                type="button"
                onClick={() => setView('login')}
                style={{background:'none', border:'none', color:'var(--text-4)', fontSize: 12, cursor:'pointer'}}>
                ← Retour à la connexion
              </button>
            </div>
          </form>
        )}

        {/* ================= VUE 5 : NOUVEAU MOT DE PASSE ================= */}
        {view === 'reset-password' && (
          <form onSubmit={handleResetSubmit}>
            <div style={{fontWeight: 700, fontSize: 18, color:'var(--text, #fff)', marginBottom: 4}}>Nouveau mot de passe</div>
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 18}}>
              Saisissez le code reçu par email et votre nouveau mot de passe.
            </div>

            <div style={{marginBottom: 14}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Code à 6 chiffres</label>
              <input
                type="text"
                maxLength={6}
                className="input"
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                style={{...authInputStyle, textAlign:'center', fontFamily:'monospace', fontSize: 20, letterSpacing: 6}}
              />
            </div>

            <div style={{marginBottom: 18}}>
              <label style={{display:'block', fontSize: 11.5, fontWeight: 600, color:'var(--text-3, #aaa)', marginBottom: 4}}>Nouveau mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width:'100%', padding: '11px', fontWeight: 600, fontSize: 13.5, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>
              {loading ? 'Modification…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------- MODALE DE BLOCAGE CONTEXTUEL (FEATURE GATING) ----------------
function FeatureGateModal({ isOpen, feature = 'team', onClose, onOpenAuth }) {
  if (!isOpen) return null;

  const contentMap = {
    team: {
      title: 'Collaboration & Équipe',
      icon: '👥',
      description: 'Invitez vos collègues, assignez des rôles et suivez la présence en temps réel sur vos espaces de publication.',
      bullets: [
        'Gestion des collaborateurs et permissions personnalisées',
        'Présence active en direct sur les brouillons',
        'Attribution de tâches et notifications d’équipe'
      ]
    },
    comments: {
      title: 'Commentaires & Discussions',
      icon: '💬',
      description: 'Échangez des avis et validez les variantes de contenu directement au sein de chaque brouillon.',
      bullets: [
        'Fils de discussion par publication',
        'Mentions de membres et horodatage sécurisé',
        'Historique complet des validations'
      ]
    },
    profile: {
      title: 'Profil & Identité Créateur',
      icon: '✨',
      description: 'Personnalisez votre identité de publication, vos avatars et vos réglages synchronisés.',
      bullets: [
        'Avatar et signature d’auteur personnalisés',
        'Sécurité avec authentification par email SMTP',
        'Sauvegarde de vos préférences d’affichage'
      ]
    }
  };

  const featureInfo = contentMap[feature] || contentMap.team;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{
        maxWidth: 460,
        width: '92%',
        background: 'var(--bg-2, #18191d)',
        borderRadius: 16,
        padding: '32px 28px',
        border: '1px solid rgba(255,90,31,0.3)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        textAlign: 'center'
      }}>
        <div style={{fontSize: 40, marginBottom: 12}}>{featureInfo.icon}</div>
        <div style={{fontWeight: 800, fontSize: 20, color: 'var(--text, #fff)', marginBottom: 8}}>
          {featureInfo.title}
        </div>
        <div style={{fontSize: 13, color: 'var(--text-3, #aaa)', lineHeight: 1.5, marginBottom: 20, maxWidth: 380, margin: '0 auto 20px auto'}}>
          {featureInfo.description}
        </div>

        <div style={{
          background: 'var(--bg-3, #121316)',
          borderRadius: 10,
          padding: '14px 16px',
          textAlign: 'left',
          marginBottom: 24,
          border: '1px solid var(--border-line, rgba(255,255,255,0.08))'
        }}>
          {featureInfo.bullets.map((b, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap: 10, fontSize: 12.5, color:'var(--text-2, #ddd)', marginBottom: i === featureInfo.bullets.length - 1 ? 0 : 8}}>
              <span style={{color: '#ff5a1f', fontWeight: 800}}>✓</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap: 10}}>
          <button
            onClick={() => { onClose(); onOpenAuth('register', `Inscrivez-vous pour débloquer "${featureInfo.title}"`); }}
            className="btn-primary"
            style={{padding: '12px', fontSize: 13.5, fontWeight: 700}}>
            Créer un compte gratuit (1 min)
          </button>
          <button
            onClick={() => { onClose(); onOpenAuth('login', `Connectez-vous pour débloquer "${featureInfo.title}"`); }}
            style={{
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              border: '1px solid var(--border-line, rgba(255,255,255,0.15))',
              color: 'var(--text, #fff)',
              borderRadius: 8,
              cursor: 'pointer'
            }}>
            J'ai déjà un compte
          </button>
          <button
            onClick={onClose}
            style={{background:'none', border:'none', color:'var(--text-4, #777)', fontSize: 12, cursor:'pointer', marginTop: 4}}>
            Continuer en mode invité local
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthModal, FeatureGateModal, AuthEmailToast });

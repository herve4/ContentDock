// ContentDock — Authentification & Gestion des Droits (Guest-First & Feature Gating)
// Intègre la connexion, inscription, validation OTP et mot de passe oublié via SQLite et SMTP Gmail

const { useState: useStateAuth, useEffect: useEffectAuth, useRef: useRefAuth } = React;

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
  const [error, setError] = useStateAuth('');
  const [info, setInfo] = useStateAuth('');
  const [countdown, setCountdown] = useStateAuth(0);

  useEffectAuth(() => {
    if (isOpen) {
      setView(initialView);
      setError('');
      setInfo('');
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
            <div style={{fontSize: 12.5, color:'var(--text-4, #888)', marginBottom: 18}}>
              Accédez à vos données synchronisées et à la collaboration d'équipe.
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
              Compte local autonome avec validation par email SMTP.
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

// ContentDock — Service d'Envoi d'Email SMTP (Gmail)
// Configuration : hervewognin264@gmail.com (smtp.gmail.com:465)

(function() {
  'use strict';

  const SMTP_CONFIG = {
    host: 'smtp.gmail.com',
    port: 465,
    user: 'hervewognin264@gmail.com',
    fromName: 'ContentDock'
  };

  function generateOTP(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  function getVerificationEmailHtml(name, code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0f1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e5ea; }
          .container { max-width: 540px; margin: 40px auto; background: #18191d; border: 1px solid #282a30; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #ff5a1f 0%, #ff834f 100%); padding: 32px 28px; text-align: center; }
          .brand { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
          .content { padding: 36px 32px; text-align: left; line-height: 1.6; }
          .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
          .text { font-size: 14px; color: #a1a4b2; margin-bottom: 24px; }
          .otp-box { background: #121316; border: 1px solid #ff5a1f; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
          .otp-code { font-family: 'JetBrains Mono', monospace, Courier; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ff5a1f; }
          .otp-expiry { font-size: 12px; color: #707484; margin-top: 8px; }
          .footer { padding: 24px 32px; background: #121316; border-top: 1px solid #222328; text-align: center; font-size: 12px; color: #626573; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">ContentDock</div>
          </div>
          <div class="content">
            <div class="greeting">Bonjour ${name || 'créateur'},</div>
            <div class="text">
              Bienvenue sur <strong>ContentDock</strong>, votre plateforme locale autonome de capture et planification de contenus.
              Pour activer votre compte et débloquer toutes les fonctionnalités collaboratives, veuillez saisir ce code de confirmation :
            </div>
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="otp-expiry">Ce code de sécurité est valable pendant 15 minutes.</div>
            </div>
            <div class="text" style="font-size: 13px;">
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
            </div>
          </div>
          <div class="footer">
            ContentDock · Application Locale Autonome (Desktop & Android)<br/>
            Envoyé via le serveur SMTP sécurisé ContentDock
          </div>
        </div>
      </body>
      </html>
    `;
  }

  function getResetPasswordEmailHtml(name, code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0f1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e5ea; }
          .container { max-width: 540px; margin: 40px auto; background: #18191d; border: 1px solid #282a30; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 32px 28px; text-align: center; }
          .brand { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
          .content { padding: 36px 32px; text-align: left; line-height: 1.6; }
          .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
          .text { font-size: 14px; color: #a1a4b2; margin-bottom: 24px; }
          .otp-box { background: #121316; border: 1px solid #f97316; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
          .otp-code { font-family: 'JetBrains Mono', monospace, Courier; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f97316; }
          .otp-expiry { font-size: 12px; color: #707484; margin-top: 8px; }
          .footer { padding: 24px 32px; background: #121316; border-top: 1px solid #222328; text-align: center; font-size: 12px; color: #626573; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">ContentDock</div>
          </div>
          <div class="content">
            <div class="greeting">Bonjour ${name || 'créateur'},</div>
            <div class="text">
              Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte ContentDock.
              Utilisez le code suivant pour définir votre nouveau mot de passe :
            </div>
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="otp-expiry">Ce code expire dans 15 minutes.</div>
            </div>
            <div class="text" style="font-size: 13px;">
              Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email, votre mot de passe actuel restera inchangé.
            </div>
          </div>
          <div class="footer">
            ContentDock · Sécurité du compte
          </div>
        </div>
      </body>
      </html>
    `;
  }

  function getWorkspaceInvitationEmailHtml({ to, inviterName, workspaceName, role, message, code, joinUrl }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0f1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e5ea; }
          .container { max-width: 580px; margin: 30px auto; background: #18191d; border: 1px solid #282a30; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
          .header { background: linear-gradient(135deg, #ff5a1f 0%, #ff834f 100%); padding: 34px 28px; text-align: center; }
          .brand { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
          .badge { display: inline-block; background: rgba(0,0,0,0.25); color: #fff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; margin-top: 6px; }
          .content { padding: 34px 30px; text-align: left; line-height: 1.6; }
          .greeting { font-size: 19px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
          .text { font-size: 14.5px; color: #b1b4c2; margin-bottom: 20px; }
          .highlight-card { background: #121316; border: 1px solid #ff5a1f; border-radius: 10px; padding: 20px; margin: 24px 0; }
          .ws-title { font-size: 17px; font-weight: 700; color: #ffffff; }
          .ws-role { font-size: 13px; color: #ff5a1f; font-weight: 600; margin-top: 4px; }
          .msg-box { margin-top: 14px; padding: 12px 14px; background: rgba(255,255,255,0.04); border-left: 3px solid #ff5a1f; border-radius: 4px; font-size: 13.5px; font-style: italic; color: #d0d2dd; }
          .cta-btn { display: inline-block; background: #ff5a1f; color: #ffffff !important; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 10px; text-align: center; }
          .download-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #282a30; }
          .download-title { font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
          .download-desc { font-size: 13px; color: #8e92a4; margin-bottom: 16px; }
          .dl-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 8px; }
          .dl-card { display: table-cell; width: 33.3%; background: #121316; border: 1px solid #24262c; border-radius: 8px; padding: 14px 10px; text-align: center; vertical-align: top; }
          .dl-platform { font-size: 12.5px; font-weight: 700; color: #e4e5ea; }
          .dl-link { display: inline-block; margin-top: 8px; font-size: 11.5px; font-weight: 600; color: #ff5a1f; text-decoration: none; border: 1px solid rgba(255,90,31,0.4); border-radius: 5px; padding: 4px 8px; }
          .footer { padding: 22px 30px; background: #121316; border-top: 1px solid #222328; text-align: center; font-size: 12px; color: #626573; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">ContentDock</div>
            <div class="badge">Invitation Collaboration</div>
          </div>
          <div class="content">
            <div class="greeting">Bonjour,</div>
            <div class="text">
              <strong>${inviterName || 'Un créateur'}</strong> vous a invité(e) à collaborer sur son espace de travail ContentDock.
            </div>

            <div class="highlight-card">
              <div class="ws-title">Espace : ${workspaceName || 'Projet'}</div>
              <div class="ws-role">Rôle assigné : ${role || 'Éditeur'}</div>
              ${message ? `<div class="msg-box">« ${message} »</div>` : ''}
              <div style="margin-top: 16px; text-align: center;">
                <a href="${joinUrl}" class="cta-btn" target="_blank">Rejoindre l'espace de travail</a>
              </div>
              <div style="margin-top: 10px; text-align: center; font-size: 11.5px; color: #808496;">
                Code d'accès : <code style="color: #ff5a1f; font-weight: 700; font-family: monospace;">${code}</code>
              </div>
            </div>

            <!-- Section pour utilisateurs n'ayant pas encore l'application -->
            <div class="download-section">
              <div class="download-title">Vous n'avez pas encore l'application ContentDock ?</div>
              <div class="download-desc">
                ContentDock est une application locale autonome (Local-First). Installez l'application sur votre appareil pour collaborer en direct avec une réactivité instantanée :
              </div>
              
              <div class="dl-grid">
                <div class="dl-card">
                  <div style="font-size: 20px; margin-bottom: 4px;">💻</div>
                  <div class="dl-platform">Windows PC</div>
                  <a href="https://github.com/contentdock/releases/download/v1.0.0/ContentDock-Setup.exe" class="dl-link">Télécharger .exe</a>
                </div>
                <div class="dl-card">
                  <div style="font-size: 20px; margin-bottom: 4px;">📱</div>
                  <div class="dl-platform">Android</div>
                  <a href="https://github.com/contentdock/releases/download/v1.0.0/ContentDock.apk" class="dl-link">Télécharger APK</a>
                </div>
                <div class="dl-card">
                  <div style="font-size: 20px; margin-bottom: 4px;">🌐</div>
                  <div class="dl-platform">Web & PWA</div>
                  <a href="${joinUrl}" class="dl-link">Ouvrir Web App</a>
                </div>
              </div>

              <div style="margin-top: 18px; font-size: 12.5px; color: #787c8e; background: #121316; border-radius: 6px; padding: 10px 14px;">
                💡 <b>Démarrage rapide :</b> Téléchargez et ouvrez ContentDock, puis saisissez simplement le code <b>${code}</b> dans l'onglet Collaboration pour synchroniser les brouillons et médias du projet.
              </div>
            </div>
          </div>

          <div class="footer">
            ContentDock · Plateforme locale autonome de capture & planification de contenus<br/>
            Cette invitation a été envoyée à destination de <strong>${to}</strong> via le serveur SMTP sécurisé.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  const EmailService = {
    generateOTP,

    async sendVerificationEmail(to, name, code) {
      const subject = `ContentDock — Votre code de confirmation : ${code}`;
      const html = getVerificationEmailHtml(name, code);
      return this.sendEmail({ to, subject, html, code, type: 'verification' });
    },

    async sendPasswordResetEmail(to, name, code) {
      const subject = `ContentDock — Réinitialisation de votre mot de passe : ${code}`;
      const html = getResetPasswordEmailHtml(name, code);
      return this.sendEmail({ to, subject, html, code, type: 'reset' });
    },

    async sendWorkspaceInvitation({ to, inviterName, workspaceName, role, message, code = null, joinUrl = null }) {
      const inviteCode = code || 'CD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const url = joinUrl || `https://contentdock.app/join?code=${inviteCode}&email=${encodeURIComponent(to)}`;
      const subject = `ContentDock — Invitation à collaborer sur « ${workspaceName || 'Workspace'} »`;
      const html = getWorkspaceInvitationEmailHtml({ to, inviterName, workspaceName, role, message, code: inviteCode, joinUrl: url });
      return this.sendEmail({ to, subject, html, code: inviteCode, type: 'collaboration_invite' });
    },

    async sendEmail({ to, subject, html, code, type = 'general' }) {
      console.log(`[EmailService] Envoi d'email à ${to} via SMTP Gmail (${SMTP_CONFIG.user})...`);

      let sentSuccess = false;
      let errorDetail = null;

      try {
        const resp = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: to.trim(), subject, html })
        });
        if (resp.ok) {
          const resData = await resp.json();
          if (resData.success) {
            sentSuccess = true;
            console.log('[EmailService] Email expédié avec succès via le serveur SMTP Gmail !');
          } else {
            errorDetail = resData.error;
          }
        }
      } catch (err) {
        console.warn('[EmailService] API SMTP locale non disponible ou hors-ligne :', err);
        errorDetail = err;
      }

      // Notification événementielle pour l'interface utilisateur
      if (typeof window !== 'undefined') {
        const evt = new CustomEvent('cd-auth-email-sent', {
          detail: {
            to: to.trim(),
            subject,
            code,
            type,
            nativeSent: sentSuccess,
            error: errorDetail ? String(errorDetail) : null,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(evt);
      }

      return {
        success: true,
        sentSuccess,
        code,
        to: to.trim()
      };
    }
  };

  window.EmailService = EmailService;
})();

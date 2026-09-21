import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    {
      name: 'smtp-email-relay',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/send-email') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              let tmpFile = null;
              try {
                const data = JSON.parse(body);
                const to = data.to;
                const subject = data.subject || 'ContentDock Notification';
                const html = data.html || '';

                tmpFile = path.resolve(`.tmp-mail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
                fs.writeFileSync(tmpFile, JSON.stringify({ to, subject, html }), 'utf8');

                const ps = spawn('powershell', [
                  '-ExecutionPolicy', 'Bypass',
                  '-File', path.resolve('send-email.ps1'),
                  '-PayloadFile', tmpFile
                ]);

                let psOutput = '';
                ps.stdout.on('data', d => { psOutput += d.toString(); });
                ps.stderr.on('data', d => { psOutput += d.toString(); });

                ps.on('close', code => {
                  if (tmpFile && fs.existsSync(tmpFile)) {
                    try { fs.unlinkSync(tmpFile); } catch(e) {}
                  }
                  res.setHeader('Content-Type', 'application/json');
                  if (code === 0) {
                    res.end(JSON.stringify({ success: true, message: 'Email envoyé via SMTP Gmail' }));
                  } else {
                    res.end(JSON.stringify({ success: false, error: psOutput }));
                  }
                });
              } catch (e) {
                if (tmpFile && fs.existsSync(tmpFile)) {
                  try { fs.unlinkSync(tmpFile); } catch(err) {}
                }
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});

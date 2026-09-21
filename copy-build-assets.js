import fs from 'fs';
import path from 'path';

const filesToCopy = [
  'data.js',
  'database.js',
  'emailService.js',
  'send-email.ps1',
  'manifest.json',
  'sw.js',
  'styles.css',
  'icons.jsx',
  'auth.jsx',
  'shell.jsx',
  'views.jsx',
  'calendar.jsx',
  'extras.jsx',
  'analytics.jsx',
  'cmdk.jsx',
  'attachments.jsx',
  'features.jsx',
  'collab.jsx',
  'templates.jsx',
  'integrations.jsx',
  'pwa.jsx',
  'ocr.jsx',
  'assistant.jsx',
  'team.jsx',
  'settings.jsx',
  'mobile.jsx',
  'onboarding.jsx',
  'detail.jsx',
  'capture.jsx',
  'app.jsx'
];

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy individual files
for (const file of filesToCopy) {
  const src = path.resolve(file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[copy-assets] Copied ${file} -> dist/`);
  }
}

// 2. Copy vendor directory
const vendorSrc = path.resolve('vendor');
const vendorDest = path.join(distDir, 'vendor');
if (fs.existsSync(vendorSrc)) {
  fs.cpSync(vendorSrc, vendorDest, { recursive: true });
  console.log('[copy-assets] Copied vendor/ -> dist/vendor/');
}

console.log('[copy-assets] Distribution bundle complete.');

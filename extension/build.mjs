// Builds dist/ from src/, injecting the API and panel URLs.
// Usage: API_BASE_URL=https://example.com/api PANEL_URL=https://example.com node build.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const apiBase = (process.env.API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const panelUrl = (process.env.PANEL_URL || 'http://localhost:3000').replace(/\/$/, '');

const origin = (url) => new URL(url).origin;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('src', 'dist', { recursive: true });

writeFileSync('dist/config.js', `globalThis.SUPSF_CONFIG = ${JSON.stringify({ apiBase, panelUrl })};\n`);

const manifest = {
  manifest_version: 3,
  name: 'Kelimo',
  version: '0.1.0',
  description: 'Kelimeleri sağ tıkla kaydet; YouTube altyazısında kelimenin üzerine gelince anlamını gör.',
  permissions: ['contextMenus', 'storage', 'activeTab', 'scripting'],
  host_permissions: [`${origin(apiBase)}/*`, `${origin(panelUrl)}/*`],
  background: { service_worker: 'background.js' },
  action: { default_title: 'Kelimo', default_popup: 'popup.html' },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['youtube.js'],
      css: ['youtube.css'],
      run_at: 'document_idle',
    },
    {
      matches: [`${origin(panelUrl)}/*`],
      js: ['panel-bridge.js'],
      run_at: 'document_end',
    },
  ],
};

writeFileSync('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`dist/ ready (api: ${apiBase}, panel: ${panelUrl})`);

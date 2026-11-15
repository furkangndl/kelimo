// Builds dist/ from src/, injecting the API and panel URLs.
// Usage: API_BASE_URL=https://example.com/api PANEL_URL=https://example.com [OUT_DIR=dist] node build.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const apiBase = (process.env.API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const panelUrl = (process.env.PANEL_URL || 'http://localhost:3000').replace(/\/$/, '');

const out = process.env.OUT_DIR || 'dist';
const origin = (url) => new URL(url).origin;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('src', out, { recursive: true });

writeFileSync(`${out}/config.js`, `globalThis.SUPSF_CONFIG = ${JSON.stringify({ apiBase, panelUrl })};\n`);

const manifest = {
  manifest_version: 3,
  name: 'Kelimo',
  version: '0.1.0',
  description: 'Kelimeleri sağ tıkla kaydet; YouTube altyazısında kelimenin üzerine gelince anlamını gör.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  permissions: ['contextMenus', 'storage', 'activeTab', 'scripting'],
  host_permissions: [...new Set([`${origin(apiBase)}/*`, `${origin(panelUrl)}/*`])],
  background: { service_worker: 'background.js' },
  action: {
    default_title: 'Kelimo',
    default_popup: 'popup.html',
    default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png' },
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['phrases.js', 'youtube.js'],
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

writeFileSync(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${out}/ ready (api: ${apiBase}, panel: ${panelUrl})`);

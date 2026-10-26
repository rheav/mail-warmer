#!/usr/bin/env node
// Build guard: `npm run build` runs this first and aborts on any failure.
//
// 1. No server connection. The extension may only fetch its own packaged
//    files (fetch(chrome.runtime.getURL(...))) and, in the Substack adapter,
//    the newsletter's own signup endpoint. No other fetch, XHR, WebSocket,
//    beacon or EventSource, and no mailWarmer server host anywhere.
// 2. Version: extension/manifest.json matches package.json.
// 3. Translations: en and pt_BR have the same keys, and every key the code
//    uses exists.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const EXT = join(ROOT, 'extension');
const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const files = walk(EXT).filter((f) => ['.js', '.html', '.json', '.css'].includes(extname(f)));
const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(ROOT, f);

// --- 1. no server connection -------------------------------------------------
const FETCH_ALLOWED_ANY = new Set(['extension/background/adapters/substack.js']);
const BANNED_APIS = /\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b|\bEventSource\b/;
const BANNED_HOSTS = ['rheav.dev', 'easypanel', 'api.example.com'];

for (const f of files) {
  const text = read(f);
  for (const host of BANNED_HOSTS) {
    if (text.includes(host)) fail('network', `${rel(f)} mentions "${host}"`);
  }
  if (extname(f) !== '.js') continue;
  if (BANNED_APIS.test(text)) fail('network', `${rel(f)} uses ${text.match(BANNED_APIS)[0]}`);
  if (FETCH_ALLOWED_ANY.has(rel(f))) continue;
  for (const m of text.matchAll(/\bfetch\(\s*([^)\n]*)/g)) {
    if (!m[1].startsWith('chrome.runtime.getURL(')) {
      fail('network', `${rel(f)} fetches something other than a packaged file: fetch(${m[1]}`);
    }
  }
}

// --- 2. version ----------------------------------------------------------------
const manifest = JSON.parse(read(join(EXT, 'manifest.json')));
const pkg = JSON.parse(read(join(ROOT, 'package.json')));
if (manifest.version !== pkg.version) {
  fail('version', `manifest ${manifest.version} ≠ package.json ${pkg.version}`);
}
if (manifest.web_accessible_resources) {
  fail('manifest', 'web_accessible_resources lets pages detect the extension; nothing needs it');
}

// --- 3. translations -------------------------------------------------------------
const locale = (lang) => JSON.parse(read(join(EXT, '_locales', lang, 'messages.json')));
const en = locale('en');
const pt = locale('pt_BR');
for (const k of Object.keys(en)) if (!(k in pt)) fail('i18n', `pt_BR is missing "${k}"`);
for (const k of Object.keys(pt)) if (!(k in en)) fail('i18n', `en is missing "${k}"`);

const used = new Set();
for (const f of files) {
  const text = read(f);
  for (const m of text.matchAll(/data-i18n(?:-placeholder|-title|-tip)?="([\w]+)"/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*'([\w]+)'/g)) used.add(m[1]);
  for (const m of text.matchAll(/\breason: '([\w]+)'/g)) used.add(m[1]);
  for (const m of text.matchAll(/__MSG_(\w+)__/g)) used.add(m[1]);
  for (const m of text.matchAll(/category: '([\w]+)'/g)) used.add(`cat_${m[1]}`);
}
for (const k of used) if (!(k in en)) fail('i18n', `key "${k}" is used but not defined`);

if (failures.length) {
  console.error(`preflight failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`preflight ok — v${manifest.version}, ${files.length} files, ${used.size} i18n keys`);

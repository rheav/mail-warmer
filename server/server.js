import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { savePulse, getAnalytics } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const CACHE_SECONDS = 24 * 60 * 60; // extension caches 24h; tell proxies the same

// Token gate for editing the list. Unset ⇒ editing disabled (read-only API).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// The list is read from one of two places:
//   SEED_FILE     — baked into the image, the starting point + offline fallback.
//   WRITABLE_FILE — lives in the persistent DB volume; written by the editor.
// Once the editor saves once, WRITABLE_FILE exists and wins on every boot, so
// dashboard edits survive redeploys. DB_DIR is the same volume the SQLite DB
// uses, so no extra mount is needed.
const SEED_FILE = path.join(__dirname, 'data', 'newsletters.json');
const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'db');
const WRITABLE_FILE = path.join(DB_DIR, 'newsletters.json');

let dataFile = fs.existsSync(WRITABLE_FILE) ? WRITABLE_FILE : SEED_FILE;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Read + validate the data file once at boot, then re-read on file change so
// editing data/newsletters.json + restart (or live edit) is picked up.
let data = null; // parsed { version, updatedAt, newsletters }
let payload = null; // serialized response body
let etag = null;
let loadedAt = null; // when the server last (re)read the file

function loadData() {
  const raw = fs.readFileSync(dataFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.newsletters)) {
    throw new Error('newsletters.json: "newsletters" must be an array');
  }
  data = parsed;
  payload = JSON.stringify(parsed);
  etag = '"' + crypto.createHash('sha1').update(payload).digest('hex') + '"';
  loadedAt = new Date().toISOString();
  console.log(
    `Loaded ${parsed.newsletters.length} newsletters (version ${parsed.version}) ` +
      `from ${dataFile === WRITABLE_FILE ? 'volume' : 'seed'}, etag ${etag}`
  );
}

// Watch the file currently in use, so external edits live-reload. When the
// editor switches the active file from seed → volume, the watch moves with it.
function watchDataFile() {
  fs.watchFile(dataFile, { interval: 5000 }, () => {
    try {
      loadData();
    } catch (err) {
      console.error('Reload failed, keeping previous data:', err.message);
    }
  });
}

loadData();
watchDataFile();

// Counts newsletters grouped by type, e.g. { substack: 19, form: 1 }.
function typeBreakdown() {
  const out = {};
  for (const n of data.newsletters) {
    out[n.type] = (out[n.type] || 0) + 1;
  }
  return out;
}

// Allow any extension origin to read the list and post a pulse. The list is
// public and pulses carry only anonymous data — no per-origin restriction.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Metadata for the dashboard — cheap, no caching.
app.get('/api/status', (req, res) => {
  res.json({
    version: data.version,
    updatedAt: data.updatedAt,
    count: data.newsletters.length,
    types: typeBreakdown(),
    etag,
    loadedAt,
    uptimeSeconds: Math.round(process.uptime()),
    // editable: a token is configured so the dashboard editor can save.
    // persisted: edits are already being served from the volume copy.
    editable: !!ADMIN_TOKEN,
    persisted: dataFile === WRITABLE_FILE,
  });
});

app.get('/api/newsletters', (req, res) => {
  res.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
  res.set('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  res.type('application/json').send(payload);
});

const MAX_RESULTS = 500; // sanity cap on a single pulse

// Validates an incoming pulse. Returns an error string, or null if valid.
function validatePulse(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  if (typeof body.installId !== 'string' || !body.installId) {
    return 'installId required';
  }
  if (typeof body.runAt !== 'number' || !Number.isFinite(body.runAt)) {
    return 'runAt must be a number';
  }
  if (!Array.isArray(body.results) || body.results.length === 0) {
    return 'results must be a non-empty array';
  }
  if (body.results.length > MAX_RESULTS) return 'too many results';
  for (const r of body.results) {
    if (!r || typeof r.newsletter !== 'string' || typeof r.status !== 'string') {
      return 'each result needs newsletter + status strings';
    }
  }
  return null;
}

// Anonymous run analytics. The extension POSTs one pulse per completed run.
app.post('/api/pulse', (req, res) => {
  const err = validatePulse(req.body);
  if (err) return res.status(400).json({ ok: false, error: err });
  try {
    const result = savePulse(req.body);
    res.status(result.stored ? 201 : 200).json({ ok: true, ...result });
  } catch (e) {
    console.error('savePulse failed:', e.message);
    res.status(500).json({ ok: false, error: 'storage error' });
  }
});

// Aggregated analytics for the dashboard.
app.get('/api/analytics', (req, res) => {
  res.json(getAnalytics());
});

// ── Editing the list ────────────────────────────────────────────────────────

const MAX_NEWSLETTERS = 1000;

// Validates + normalizes one editor-submitted entry. Returns { entry } with
// only the known fields kept, or { error } describing what's wrong.
function normalizeEntry(raw, i) {
  if (!raw || typeof raw !== 'object') return { error: `row ${i + 1}: not an object` };
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { error: `row ${i + 1}: name required` };
  const type = raw.type;
  if (type !== 'substack' && type !== 'form') {
    return { error: `row ${i + 1} (${name}): type must be "substack" or "form"` };
  }
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  if (type === 'substack') {
    const slug = str(raw.slug);
    const host = str(raw.host);
    if (!slug && !host) {
      return { error: `row ${i + 1} (${name}): substack needs a slug or host` };
    }
    return { entry: host ? { name, type, host } : { name, type, slug } };
  }
  // type === 'form'
  const url = str(raw.url);
  if (!/^https?:\/\//i.test(url)) {
    return { error: `row ${i + 1} (${name}): form needs a url starting with http(s)` };
  }
  return { entry: { name, type, url } };
}

// Validates the whole submitted list. Returns { newsletters } or { error }.
function validateNewsletterList(body) {
  if (!body || !Array.isArray(body.newsletters)) {
    return { error: 'body.newsletters must be an array' };
  }
  if (body.newsletters.length > MAX_NEWSLETTERS) {
    return { error: `too many newsletters (max ${MAX_NEWSLETTERS})` };
  }
  const out = [];
  for (let i = 0; i < body.newsletters.length; i++) {
    const r = normalizeEntry(body.newsletters[i], i);
    if (r.error) return { error: r.error };
    out.push(r.entry);
  }
  return { newsletters: out };
}

// Persists a new list to the volume copy, then live-reloads it. The first
// successful write also moves the active file (and its watcher) seed → volume.
function writeNewsletters(newsletters) {
  const next = {
    version: (Number(data.version) || 0) + 1,
    updatedAt: new Date().toISOString(),
    newsletters,
  };
  fs.mkdirSync(DB_DIR, { recursive: true });
  const tmp = WRITABLE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, WRITABLE_FILE); // atomic swap
  if (dataFile !== WRITABLE_FILE) {
    fs.unwatchFile(dataFile);
    dataFile = WRITABLE_FILE;
    watchDataFile();
  }
  loadData();
  return next;
}

// Constant-time token check — avoids leaking the token via response timing.
function tokenOk(supplied) {
  if (!ADMIN_TOKEN || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Replace the whole newsletter list. Token-gated; persisted to the volume.
app.put('/api/newsletters', (req, res) => {
  if (!ADMIN_TOKEN) {
    return res
      .status(503)
      .json({ ok: false, error: 'editing disabled — set ADMIN_TOKEN to enable' });
  }
  if (!tokenOk(req.headers['x-admin-token'])) {
    return res.status(401).json({ ok: false, error: 'invalid admin token' });
  }
  const v = validateNewsletterList(req.body);
  if (v.error) return res.status(400).json({ ok: false, error: v.error });
  try {
    const saved = writeNewsletters(v.newsletters);
    res.json({ ok: true, version: saved.version, count: saved.newsletters.length });
  } catch (e) {
    console.error('writeNewsletters failed:', e.message);
    res.status(500).json({ ok: false, error: 'write failed' });
  }
});

// Status dashboard at /.
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Mail Warmer server listening on :${PORT}`);
});

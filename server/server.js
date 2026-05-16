import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data', 'newsletters.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const CACHE_SECONDS = 24 * 60 * 60; // extension caches 24h; tell proxies the same

const app = express();
app.disable('x-powered-by');

// Read + validate the data file once at boot, then re-read on file change so
// editing data/newsletters.json + restart (or live edit) is picked up.
let data = null; // parsed { version, updatedAt, newsletters }
let payload = null; // serialized response body
let etag = null;
let loadedAt = null; // when the server last (re)read the file

function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.newsletters)) {
    throw new Error('newsletters.json: "newsletters" must be an array');
  }
  data = parsed;
  payload = JSON.stringify(parsed);
  etag = '"' + crypto.createHash('sha1').update(payload).digest('hex') + '"';
  loadedAt = new Date().toISOString();
  console.log(
    `Loaded ${parsed.newsletters.length} newsletters (version ${parsed.version}), etag ${etag}`
  );
}

loadData();
// Pick up edits to the data file without a full restart.
fs.watchFile(DATA_FILE, { interval: 5000 }, () => {
  try {
    loadData();
  } catch (err) {
    console.error('Reload failed, keeping previous data:', err.message);
  }
});

// Counts newsletters grouped by type, e.g. { substack: 19, form: 1 }.
function typeBreakdown() {
  const out = {};
  for (const n of data.newsletters) {
    out[n.type] = (out[n.type] || 0) + 1;
  }
  return out;
}

// Allow any extension origin to read the list. The list is public, non-secret.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

// Status dashboard at /.
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Mail Warmer server listening on :${PORT}`);
});

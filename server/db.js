// SQLite store for anonymous run analytics ("pulses").
//
// The DB lives in db/ — a directory kept separate from data/ so it can be
// mounted as a Docker volume for persistence without shadowing the baked-in
// newsletters.json.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'db');
const DB_FILE = path.join(DB_DIR, 'analytics.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pulses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    install_id  TEXT    NOT NULL,
    ext_version TEXT,
    run_at      INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    n_success   INTEGER NOT NULL DEFAULT 0,
    n_failure   INTEGER NOT NULL DEFAULT 0,
    n_skipped   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(install_id, run_at)
  );

  CREATE TABLE IF NOT EXISTS results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pulse_id   INTEGER NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
    newsletter TEXT    NOT NULL,
    type       TEXT,
    status     TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_results_pulse ON results(pulse_id);
  CREATE INDEX IF NOT EXISTS idx_results_newsletter ON results(newsletter);
`);

// Map a raw status to one of three buckets.
function bucket(status) {
  if (status === 'success') return 'success';
  if (status === 'error') return 'failure';
  return 'skipped';
}

const insertPulse = db.prepare(`
  INSERT INTO pulses (install_id, ext_version, run_at, received_at,
                      n_success, n_failure, n_skipped)
  VALUES (@install_id, @ext_version, @run_at, @received_at,
          @n_success, @n_failure, @n_skipped)
`);
const insertResult = db.prepare(`
  INSERT INTO results (pulse_id, newsletter, type, status)
  VALUES (?, ?, ?, ?)
`);

// Stores one pulse + its per-newsletter results in a single transaction.
// Returns { stored: true } or { stored: false, reason } when the pulse is a
// duplicate (same install + run timestamp).
export const savePulse = db.transaction((pulse) => {
  const counts = { success: 0, failure: 0, skipped: 0 };
  for (const r of pulse.results) counts[bucket(r.status)]++;

  let info;
  try {
    info = insertPulse.run({
      install_id: pulse.installId,
      ext_version: pulse.extVersion || null,
      run_at: pulse.runAt,
      received_at: Date.now(),
      n_success: counts.success,
      n_failure: counts.failure,
      n_skipped: counts.skipped,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { stored: false, reason: 'duplicate' };
    }
    throw err;
  }

  for (const r of pulse.results) {
    insertResult.run(info.lastInsertRowid, r.newsletter, r.type || null, bucket(r.status));
  }
  return { stored: true };
});

// --- Read queries ------------------------------------------------------------

const qTotals = db.prepare(`
  SELECT
    COUNT(*)                       AS runs,
    COUNT(DISTINCT install_id)     AS installs,
    COALESCE(SUM(n_success), 0)    AS success,
    COALESCE(SUM(n_failure), 0)    AS failure,
    COALESCE(SUM(n_skipped), 0)    AS skipped,
    MAX(received_at)               AS lastPulseAt
  FROM pulses
`);

const qPerNewsletter = db.prepare(`
  SELECT
    newsletter,
    type,
    COUNT(*)                                          AS attempts,
    SUM(status = 'success')                           AS success,
    SUM(status = 'failure')                           AS failure,
    SUM(status = 'skipped')                           AS skipped
  FROM results
  GROUP BY newsletter, type
  ORDER BY attempts DESC, newsletter ASC
`);

const qRecent = db.prepare(`
  SELECT install_id, ext_version, run_at, received_at,
         n_success, n_failure, n_skipped
  FROM pulses
  ORDER BY received_at DESC
  LIMIT 25
`);

export function getAnalytics() {
  const totals = qTotals.get();
  const perNewsletter = qPerNewsletter.all().map((r) => ({
    ...r,
    successRate: r.attempts ? Math.round((r.success / r.attempts) * 100) : 0,
  }));
  // Show install ids only as a short anonymous prefix.
  const recent = qRecent.all().map((p) => ({
    install: String(p.install_id).slice(0, 8),
    extVersion: p.ext_version,
    runAt: p.run_at,
    receivedAt: p.received_at,
    success: p.n_success,
    failure: p.n_failure,
    skipped: p.n_skipped,
  }));
  return { totals, perNewsletter, recent };
}

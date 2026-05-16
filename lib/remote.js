// Fetches the curated newsletter list from the backend, with a 24h cache.
//
// Why a backend: the list can change without shipping a new extension
// version (which needs Google review). The extension calls the API, caches
// the result for 24h, and falls back to the bundled newsletters.json if the
// server is unreachable — so signups keep working even if the API is down.

// --- Config -----------------------------------------------------------------
// Point this at your VPS. Use HTTPS — Chrome may block plain-HTTP fetches.
const API_URL = 'https://api.example.com/api/newsletters';

const CACHE_KEY = 'newslettersCache'; // { ts, version, newsletters }
const TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

// --- Public API --------------------------------------------------------------

// Returns a raw newsletter array: [{ name, type, slug?, host?, url? }].
// The caller is responsible for adding id/source fields.
// Order of preference: fresh cache -> network -> stale cache -> bundled JSON.
export async function fetchNewsletters({ force = false } = {}) {
  const cache = await readCache();

  if (!force && cache && Date.now() - cache.ts < TTL_MS) {
    return cache.newsletters;
  }

  try {
    const fresh = await fetchFromApi();
    await writeCache(fresh);
    return fresh.newsletters;
  } catch (err) {
    console.warn('[remote] API fetch failed:', err.message);
    if (cache) return cache.newsletters; // stale-on-error
    return readBundled(); // last resort
  }
}

// True if the cache is missing or older than the TTL.
export async function isCacheStale() {
  const cache = await readCache();
  return !cache || Date.now() - cache.ts >= TTL_MS;
}

// --- Internals ---------------------------------------------------------------

async function fetchFromApi() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body.newsletters)) {
      throw new Error('malformed response: newsletters not an array');
    }
    return { version: body.version ?? 0, newsletters: body.newsletters };
  } finally {
    clearTimeout(timer);
  }
}

async function readCache() {
  const { [CACHE_KEY]: cache } = await chrome.storage.local.get(CACHE_KEY);
  if (cache && Array.isArray(cache.newsletters)) return cache;
  return null;
}

async function writeCache({ version, newsletters }) {
  await chrome.storage.local.set({
    [CACHE_KEY]: { ts: Date.now(), version, newsletters },
  });
}

// The extension still ships newsletters.json as an offline fallback.
async function readBundled() {
  const url = chrome.runtime.getURL('newsletters.json');
  const res = await fetch(url);
  const data = await res.json();
  // Bundled file may be a bare array or the wrapped { newsletters } shape.
  return Array.isArray(data) ? data : data.newsletters;
}

// Backend configuration. Point API_BASE at your server (HTTPS — Chrome may
// block plain-HTTP fetches from the extension).
//
// Until you deploy the server, leave this as the example placeholder: the
// extension detects that no real server is configured and runs entirely off
// the bundled newsletters.json — no network calls, no timeouts. The moment you
// set API_BASE to a real domain, it starts fetching + caching automatically.
export const API_BASE = 'https://api.example.com';

// True only when API_BASE points at a real, non-placeholder HTTPS host.
// Drives the "smart fallback": when false, we skip the network and use the
// bundled list (see lib/remote.js) and skip analytics (see lib/analytics.js).
export const API_CONFIGURED =
  /^https:\/\/.+/.test(API_BASE) && !/(^|\.)example\.com$/i.test(new URL(API_BASE).hostname);

export const ENDPOINTS = {
  newsletters: `${API_BASE}/api/newsletters`,
  pulse: `${API_BASE}/api/pulse`,
};

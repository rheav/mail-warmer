// Anonymous run analytics ("pulse").
//
// After each signup run, the extension POSTs a summary to the backend so we
// can see which newsletters succeed or fail in aggregate.
//
// What is sent — strictly anonymous:
//   - installId : a random UUID generated once per install. Not linked to any
//                 person, email, or account. Used only to count distinct
//                 installs and de-duplicate.
//   - extVersion: the extension version string.
//   - runAt     : timestamp of the run.
//   - results   : per-newsletter { newsletter (name), type, status }.
//
// What is NEVER sent: email addresses, the profile/fake identity, the active
// email, logs, or anything that could identify a user.

import { ENDPOINTS } from './config.js';

const INSTALL_ID_KEY = 'installId';

// Returns the anonymous install id, generating + persisting one on first use.
async function getInstallId() {
  const { [INSTALL_ID_KEY]: id } = await chrome.storage.local.get(INSTALL_ID_KEY);
  if (id) return id;
  const fresh = crypto.randomUUID();
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: fresh });
  return fresh;
}

// Sends a pulse for one completed run. `results` is an array of
// { newsletter, type, status }. Failure to send is swallowed — analytics
// must never break a run.
export async function sendPulse(results) {
  if (!Array.isArray(results) || results.length === 0) return;
  try {
    const payload = {
      installId: await getInstallId(),
      extVersion: chrome.runtime.getManifest().version,
      runAt: Date.now(),
      results: results.map((r) => ({
        newsletter: r.newsletter,
        type: r.type,
        status: r.status,
      })),
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      await fetch(ENDPOINTS.pulse, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn('[analytics] pulse failed:', err.message);
  }
}

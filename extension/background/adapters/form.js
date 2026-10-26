// Generic form adapter: opens the signup URL in a background tab, injects
// the form-filler content script into all frames, then asks each frame
// (top first, then children) to detect + submit. Returns the first success.

import { MSG } from '../../lib/messages.js';
import { t } from '../../lib/i18n.js';
import { delay, waitForTabComplete } from '../../lib/wait.js';

const TAB_TIMEOUT_MS = 30_000;
const PER_FRAME_TIMEOUT_MS = 8_000;

export async function signupViaForm(email, newsletter, ctx = {}) {
  if (!newsletter.url) throw new Error(t('errMissingUrl'));

  const tab = await chrome.tabs.create({ url: newsletter.url, active: false });

  try {
    await waitForTabComplete(tab.id, TAB_TIMEOUT_MS);
    await delay(1500); // let late signup widgets mount

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content/form-filler.js'],
    });

    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    // Try top frame first, then deepest-first child frames (signup widgets
    // usually live in iframes, not the top page).
    const ordered = sortFrames(frames || []);

    const payload = {
      type: MSG.DETECT_AND_SUBMIT,
      data: {
        email,
        profile: ctx.profile || {},
        selectors: newsletter.selectors || null,
      },
    };

    let lastSoftFail = null;
    for (const frame of ordered) {
      const result = await sendToFrame(tab.id, frame.frameId, payload, PER_FRAME_TIMEOUT_MS);
      if (!result) continue;
      if (result.submitted) {
        return {
          status: 'success',
          message: t('msgFormSubmitted', frame.frameId, result.fieldHint || '?'),
        };
      }
      if (result.error) {
        lastSoftFail = result.error;
        continue;
      }
      if (result.reason) {
        lastSoftFail = t(result.reason, ...(result.args || []));
      }
    }

    return {
      status: 'error',
      message: lastSoftFail || t('ffNoFrame'),
    };
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

function sortFrames(frames) {
  // Top frame first, then by URL length descending so embedded forms
  // (often longer/more-specific URLs) get tried before about:blank shells.
  return [...frames].sort((a, b) => {
    if (a.frameId === 0) return -1;
    if (b.frameId === 0) return 1;
    return (b.url?.length || 0) - (a.url?.length || 0);
  });
}

function sendToFrame(tabId, frameId, message, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);

    try {
      chrome.tabs.sendMessage(tabId, message, { frameId }, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response || null);
        }
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    }
  });
}

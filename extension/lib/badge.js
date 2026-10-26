// Toolbar action badge — at-a-glance run/cookie state on the extension icon.
// Counts are capped to 3 digits so they fit Chrome's tiny badge.

const ORANGE = '#F9AB00';
const GREEN = '#34A853';
const RED = '#EA4335';
const WHITE = '#FFFFFF';

function paint(text, bg) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: bg });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: WHITE });
    }
    chrome.action.setBadgeText({ text });
  } catch {
    /* action API unavailable (e.g. during teardown) — ignore */
  }
}

function cap(n) {
  return n > 999 ? '999+' : String(n);
}

// In-progress: show how many succeeded so far, orange.
export function setRunningBadge(done) {
  paint(done > 0 ? cap(done) : '…', ORANGE);
}

// Finished: green success count wins; else red error count; else clear.
export function setResultBadge({ success = 0, error = 0 } = {}) {
  if (success > 0) return paint(cap(success), GREEN);
  if (error > 0) return paint(cap(error), RED);
  clearBadge();
}

export function clearBadge() {
  paint('', GREEN);
}

// Timing helpers shared by the signup runner, the form adapter and the
// cookie warm-up.

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function jitter(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

// Resolves once the tab reports status 'complete'; rejects after timeoutMs.
export function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeoutMs);

    const done = () => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') done();
    };
    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') done();
    });
  });
}

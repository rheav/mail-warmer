// Cookie warm-up: opens a set of sites in background tabs, accepts each
// cookie-consent dialog, then closes the tab — to build a normal-looking
// cookie profile in the browser before newsletter signups run.
//
// Mirrors background/runner.js: one module-level `state`, progress broadcast
// to the sidepanel, cooperative abort via stopCookieWarmup().

import { MSG, RUN_STATUS } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { COOKIE_SITES, siteId } from '../lib/cookie-sites.js';

let state = {
  status: RUN_STATUS.IDLE,
  progress: { done: 0, total: 0, current: null, currentId: null, phase: null },
  results: [],
  abort: false,
};

const TAB_LOAD_TIMEOUT_MS = 20_000;

export function getCookieState() {
  return { status: state.status, progress: state.progress, results: state.results };
}

export function stopCookieWarmup() {
  state.abort = true;
}

export async function runCookieWarmup({ siteIds } = {}) {
  if (state.status === RUN_STATUS.RUNNING) {
    throw new Error('Already running');
  }

  const wanted = new Set(siteIds || []);
  const sites = COOKIE_SITES.filter((s) => wanted.has(siteId(s)));
  if (sites.length === 0) throw new Error('No sites selected');

  state = {
    status: RUN_STATUS.RUNNING,
    progress: { done: 0, total: sites.length, current: null, currentId: null, phase: null },
    results: [],
    abort: false,
  };
  broadcastProgress();
  await store.appendLog('info', `Cookie warm-up start: ${sites.length} sites`);

  for (const site of sites) {
    if (state.abort) {
      await store.appendLog('warn', 'Cookie warm-up aborted by user');
      break;
    }
    state.progress.current = site.name;
    state.progress.currentId = siteId(site);
    setPhase('opening');

    let status;
    let cookies = [];
    try {
      const r = await warmSite(site);
      status = r.clicked ? 'success' : 'skipped';
      await store.appendLog(
        r.clicked ? 'success' : 'info',
        r.clicked
          ? `[${site.name}] cookies accepted (${r.via})`
          : `[${site.name}] visited — no cookie banner found`
      );
      // Read back the cookies the visit actually left in the browser.
      cookies = await readSiteCookies(site);
      await logCookies(site, cookies);
    } catch (err) {
      status = 'error';
      await store.appendLog('error', `[${site.name}] ${err.message}`);
    }
    state.results.push({
      id: siteId(site),
      name: site.name,
      status,
      cookieCount: cookies.length,
      // Small sample kept for the sidebar view — name + clipped value.
      cookies: cookies.slice(0, 20).map((c) => ({
        name: c.name,
        value: clip(c.value, 60),
      })),
    });

    state.progress.done += 1;
    state.progress.phase = null;
    broadcastProgress();

    await delay(jitter(500, 1200)); // small gap between sites
  }

  await store.setCookieRun({ at: Date.now(), results: state.results });

  state.status = RUN_STATUS.DONE;
  state.progress.current = null;
  state.progress.currentId = null;
  state.progress.phase = 'done';
  broadcastProgress();
  chrome.runtime.sendMessage({ type: MSG.COOKIE_COMPLETE }).catch(() => {});

  const totalCookies = state.results.reduce(
    (sum, r) => sum + (r.cookieCount || 0),
    0
  );
  await store.appendLog(
    'info',
    `Cookie warm-up complete — ${totalCookies} cookies across ${state.results.length} sites`
  );

  state.status = RUN_STATUS.IDLE;
}

// Reads the cookies currently stored for a site's URL (set or kept by the
// visit). Requires the "cookies" permission. Returns [{ name, value }].
async function readSiteCookies(site) {
  try {
    const cookies = await chrome.cookies.getAll({ url: site.url });
    return cookies || [];
  } catch (err) {
    console.warn('readSiteCookies failed', err);
    return [];
  }
}

// Logs the real cookie name=value pairs a site left behind, so they show up
// in the sidepanel Log tab. Values are clipped — consent strings are long.
async function logCookies(site, cookies) {
  if (cookies.length === 0) {
    await store.appendLog('info', `[${site.name}] no cookies stored`);
    return;
  }
  await store.appendLog('info', `[${site.name}] ${cookies.length} cookies stored`);
  const SHOWN = 8;
  for (const c of cookies.slice(0, SHOWN)) {
    await store.appendLog('info', `  ${c.name} = ${clip(c.value, 80)}`);
  }
  if (cookies.length > SHOWN) {
    await store.appendLog('info', `  …and ${cookies.length - SHOWN} more`);
  }
}

function clip(str, max) {
  const s = String(str || '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Opens one site in a background tab, accepts its cookie banner, closes it.
async function warmSite(site) {
  const tab = await chrome.tabs.create({ url: site.url, active: false });
  try {
    // Some sites (ads, trackers) never reach status 'complete' — tolerate a
    // timeout rather than failing the whole site.
    await waitForTabComplete(tab.id, TAB_LOAD_TIMEOUT_MS).catch(() => {});
    await delay(800);

    setPhase('accepting');
    // A quick scroll + click nudges lazy consent banners into showing. Top
    // frame only; failure is non-fatal.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: quickInteract,
      });
    } catch {
      /* page may block injection */
    }

    // Accept clicker runs in every frame — consent dialogs often sit in an
    // iframe. It polls internally, so one injection per frame is enough.
    const injections = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: acceptCookiesInPage,
    });
    const hit = injections.map((i) => i.result).find((r) => r && r.clicked);

    await delay(jitter(800, 1400)); // let the consent cookie write land
    return hit || { clicked: false };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// Injected INTO the top frame. Quick scroll down, a benign body click, scroll
// back up — enough to trigger lazy/scroll-gated consent banners. Self-
// contained: no outer references. The click goes to <body> so it can never
// follow a link and navigate the tab away.
async function quickInteract() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const scroll = (dy) => {
    try {
      window.scrollBy({ top: dy, left: 0, behavior: 'smooth' });
    } catch {
      window.scrollBy(0, dy);
    }
  };
  scroll(600);
  await sleep(400);
  try {
    (document.body || document.documentElement).dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: (window.innerWidth || 800) / 2,
        clientY: (window.innerHeight || 600) / 2,
      })
    );
  } catch {
    /* ignore */
  }
  await sleep(200);
  scroll(-300);
}

// Injected INTO the page (every frame). Self-contained — no outer references.
// Polls ~5s for a cookie-consent "accept" control: known platform selectors
// first, then a short accept-text match.
async function acceptCookiesInPage() {
  // Accept-button selectors for the major consent platforms.
  const SELECTORS = [
    '#onetrust-accept-btn-handler',
    '#truste-consent-button',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    '#CybotCookiebotDialogBodyButtonAcceptAll',
    '#didomi-notice-agree-button',
    '.qc-cmp2-summary-buttons button[mode="primary"]',
    '.fc-cta-consent',
    'button[data-testid="uc-accept-all-button"]',
    'button[aria-label="Accept all"]',
    'button[aria-label="Accept All"]',
    'button[aria-label="Accept all cookies"]',
    '.cky-btn-accept',
    '#cookiescript_accept',
    '.osano-cm-accept-all',
    '.cmplz-accept',
    '#hs-eu-confirmation-button',
  ];
  // Fallback: a short clickable element whose text reads as an accept.
  const TEXT_RX =
    /^(accept all cookies|accept all|accept cookies|accept|i accept|i agree|agree|allow all cookies|allow all|allow cookies|got it|ok)$/i;

  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const tryOnce = () => {
    for (const s of SELECTORS) {
      const el = document.querySelector(s);
      if (visible(el)) {
        el.click();
        return 'selector ' + s;
      }
    }
    for (const el of document.querySelectorAll('button,[role="button"],a')) {
      const t = (el.textContent || '').trim();
      if (t.length <= 26 && TEXT_RX.test(t) && visible(el)) {
        el.click();
        return 'text "' + t + '"';
      }
    }
    return null;
  };

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const via = tryOnce();
    if (via) return { clicked: true, via };
    await new Promise((r) => setTimeout(r, 350));
  }
  return { clicked: false };
}

function setPhase(phase) {
  state.progress.phase = phase;
  broadcastProgress();
}

function broadcastProgress() {
  chrome.runtime
    .sendMessage({
      type: MSG.COOKIE_PROGRESS,
      data: { ...state.progress, results: state.results },
    })
    .catch(() => {});
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeoutMs);

    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

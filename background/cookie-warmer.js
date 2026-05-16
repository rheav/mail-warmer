// Cookie warm-up: opens a set of popular US websites in background tabs,
// auto-accepts each site's cookie-consent dialog, then closes the tab. The
// goal is to build a normal-looking cookie profile in the browser before
// newsletter signups run.
//
// Mirrors background/runner.js: one module-level `state`, progress broadcast
// to the sidepanel, cooperative abort via stopCookieWarmup(). Progress
// carries a `phase` and a live `results` array so the sidepanel can show
// per-site status and a plain-language step while the run is in flight.

import { MSG, RUN_STATUS } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { COOKIE_SITES, siteId } from '../lib/cookie-sites.js';

let state = {
  status: RUN_STATUS.IDLE,
  progress: { done: 0, total: 0, current: null, currentId: null, phase: null },
  results: [],
  abort: false,
};

const TAB_LOAD_TIMEOUT_MS = 25_000;

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
    try {
      const r = await warmSite(site);
      status = r.clicked ? 'success' : 'skipped';
      await store.appendLog(
        r.clicked ? 'success' : 'info',
        r.clicked
          ? `[${site.name}] cookies accepted (${r.via})`
          : `[${site.name}] visited — no cookie banner found`
      );
    } catch (err) {
      status = 'error';
      await store.appendLog('error', `[${site.name}] ${err.message}`);
    }
    state.results.push({ id: siteId(site), name: site.name, status });

    state.progress.done += 1;
    state.progress.phase = null;
    broadcastProgress();

    // Small gap between sites so this doesn't look like a tab-spam burst.
    await delay(jitter(800, 1800));
  }

  await store.setCookieRun({ at: Date.now(), results: state.results });

  state.status = RUN_STATUS.DONE;
  state.progress.current = null;
  state.progress.currentId = null;
  state.progress.phase = 'done';
  broadcastProgress();
  chrome.runtime.sendMessage({ type: MSG.COOKIE_COMPLETE }).catch(() => {});
  await store.appendLog('info', 'Cookie warm-up complete');

  state.status = RUN_STATUS.IDLE;
}

// Opens one site in a background tab, accepts its cookie banner, closes it.
async function warmSite(site) {
  const tab = await chrome.tabs.create({ url: site.url, active: false });
  try {
    // Some sites (ads, trackers) never reach status 'complete' — tolerate a
    // timeout rather than failing the whole site.
    await waitForTabComplete(tab.id, TAB_LOAD_TIMEOUT_MS).catch(() => {});
    await delay(1200); // give the page a moment to settle

    // Browse the page like a person first — scroll, move the mouse, click.
    // Many consent banners (especially ad-driven CMPs) only load after the
    // first scroll or interaction, and the activity makes the visit look
    // organic rather than a headless drive-by. Top frame only.
    setPhase('browsing');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: simulateOrganicBrowsing,
      });
    } catch {
      /* page may block injection — accept step still runs */
    }

    setPhase('scanning');
    // acceptCookiesInPage runs in every frame (consent dialogs are often in
    // an iframe). It polls and walks shadow DOM internally, so one injection
    // per frame is enough.
    const injections = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: acceptCookiesInPage,
    });
    const hit = injections
      .map((i) => i.result)
      .find((r) => r && r.clicked);

    setPhase('settling');
    // Linger so the consent click's cookie writes land before the tab closes.
    await delay(jitter(1500, 3000));
    return hit || { clicked: false };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// Injected INTO the top frame. Self-contained — no outer references.
// Simulates a person reading the page: mouse movement, gradual scrolling,
// and a benign click. This nudges lazy-loading consent banners into showing
// and leaves a normal interaction trail. Clicks are dispatched on <body> at
// random coordinates so they never follow a link or navigate the tab away.
async function simulateOrganicBrowsing() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const w = () => window.innerWidth || 1000;
  const h = () => window.innerHeight || 800;

  const fireMouse = (type, x, y) => {
    try {
      const target =
        type === 'click' || type.startsWith('mousedown') || type === 'mouseup'
          ? document.body || document.documentElement
          : document.elementFromPoint(x, y) ||
            document.body ||
            document.documentElement;
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
        })
      );
    } catch {
      /* ignore — some elements reject synthetic events */
    }
  };

  const scrollBy = (dy) => {
    try {
      window.scrollBy({ top: dy, left: 0, behavior: 'smooth' });
    } catch {
      window.scrollBy(0, dy);
    }
  };

  // Wander the mouse around for a beat.
  for (let i = 0; i < 6; i++) {
    fireMouse('mousemove', rand(0, w()), rand(0, h()));
    await sleep(rand(80, 220));
  }

  // Gradual scroll down the page, with mouse movement between steps.
  const downSteps = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < downSteps; i++) {
    scrollBy(rand(250, 600));
    fireMouse('mousemove', rand(0, w()), rand(0, h()));
    await sleep(rand(350, 900));
  }

  // A benign click on the body — registers an interaction without navigating.
  const cx = rand(w() * 0.3, w() * 0.7);
  const cy = rand(h() * 0.3, h() * 0.6);
  fireMouse('mousemove', cx, cy);
  fireMouse('mousedown', cx, cy);
  fireMouse('mouseup', cx, cy);
  fireMouse('click', cx, cy);
  await sleep(rand(300, 700));

  // Scroll partway back up, the way someone re-reads a page.
  const upSteps = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < upSteps; i++) {
    scrollBy(-rand(200, 500));
    await sleep(rand(300, 700));
  }
}

// Injected INTO the page (every frame). Self-contained — no outer references.
// Polls for ~9s for a cookie-consent "accept" control, clicks it, reports.
// Three escalating tiers: known platform selectors, accept-text match, then
// an attribute heuristic — so it accepts even on banners it doesn't know.
async function acceptCookiesInPage() {
  // Tier 1 — exact selectors for the major consent platforms.
  const KNOWN = [
    '#onetrust-accept-btn-handler',
    '.onetrust-close-btn-handler',
    '#truste-consent-button',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    '#CybotCookiebotDialogBodyButtonAcceptAll',
    '#didomi-notice-agree-button',
    '.qc-cmp2-summary-buttons button[mode="primary"]',
    '.fc-cta-consent',
    'button[data-testid="uc-accept-all-button"]',
    'button[data-testid="accept-all"]',
    'button[data-testid="GDPR-accept"]',
    '#hs-eu-confirmation-button',
    '.cmplz-accept',
    '.cky-btn-accept',
    '#cookiescript_accept',
    '.osano-cm-accept-all',
    '.termly-styles-button-accept',
    'button[aria-label="Accept all"]',
    'button[aria-label="Accept All"]',
    'button[aria-label="Accept all cookies"]',
  ];
  // Tier 2 — element text / aria-label reads as an "accept" action.
  const ACCEPT_TEXT_RX =
    /^(accept all cookies|accept all|accept cookies|accept & continue|accept and continue|accept|i accept|i agree|agree|agree & continue|allow all cookies|allow all|allow cookies|yes,? i agree|got it|ok,? got it)$/i;
  // Tier 3 — id/class/testid says accept AND the context says cookies.
  const ACCEPT_ATTR_RX = /(accept|agree|allow)/i;
  const CONSENT_CTX_RX = /(cookie|consent|gdpr|ccpa|privacy|cmp)/i;

  const visible = (el) => {
    if (!el) return false;
    try {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch {
      return false;
    }
  };
  const classOf = (el) =>
    typeof el.className === 'string' ? el.className : '';
  const isClickable = (el) => {
    const tag = el.tagName;
    return (
      tag === 'BUTTON' ||
      tag === 'A' ||
      tag === 'INPUT' ||
      (el.getAttribute && el.getAttribute('role') === 'button')
    );
  };

  // Collect every element, descending into open shadow roots — some consent
  // widgets (Usercentrics, etc.) render entirely inside a shadow tree.
  const collect = (root, bag) => {
    let els;
    try {
      els = root.querySelectorAll('*');
    } catch {
      return;
    }
    for (const el of els) {
      bag.push(el);
      if (el.shadowRoot) collect(el.shadowRoot, bag);
    }
  };

  const tryOnce = () => {
    const bag = [];
    collect(document, bag);

    // Tier 1: known selectors.
    for (const el of bag) {
      for (const sel of KNOWN) {
        let m = false;
        try {
          m = el.matches(sel);
        } catch {
          m = false;
        }
        if (m && visible(el)) {
          el.click();
          return 'selector ' + sel;
        }
      }
    }
    // Tier 2: accept-text / aria-label.
    for (const el of bag) {
      if (!isClickable(el) || !visible(el)) continue;
      const text = (el.textContent || el.value || '').trim();
      if (text.length <= 30 && ACCEPT_TEXT_RX.test(text)) {
        el.click();
        return 'text "' + text + '"';
      }
      const aria = (el.getAttribute('aria-label') || '').trim();
      if (aria.length <= 30 && ACCEPT_TEXT_RX.test(aria)) {
        el.click();
        return 'aria "' + aria + '"';
      }
    }
    // Tier 3: attribute heuristic, scoped to a cookie/consent context.
    for (const el of bag) {
      if (!isClickable(el) || !visible(el)) continue;
      const attrs = (
        (el.id || '') +
        ' ' +
        classOf(el) +
        ' ' +
        (el.getAttribute('data-testid') || '')
      ).toLowerCase();
      if (!ACCEPT_ATTR_RX.test(attrs)) continue;
      const ctx = attrs + ' ' + (el.textContent || '').trim().toLowerCase();
      if (CONSENT_CTX_RX.test(ctx)) {
        el.click();
        return 'attr ' + attrs.trim().slice(0, 40);
      }
    }
    return null;
  };

  const deadline = Date.now() + 9000;
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

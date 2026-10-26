import { MSG } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { runSignups, getRunState, stopRun } from './runner.js';
import {
  runCookieWarmup,
  getCookieState,
  stopCookieWarmup,
} from './cookie-warmer.js';

// Open sidepanel when action icon clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn('sidePanel setPanelBehavior failed', err));

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await store.ensureSeeded();
  await store.ensureProfileSeeded();
  if (reason === 'update') {
    // The curated list ships with the extension: pick up this version's list.
    await store.syncDefaultNewsletters();
    // Left by builds that had (unused) server code; nothing reads them now.
    await chrome.storage.local.remove(['newslettersCache', 'installId']);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case MSG.RUN_START:
      runSignups(msg.data).catch((err) => {
        store.appendLog('error', t('logRunFailed', err.message));
      });
      sendResponse({ ok: true });
      return false;

    case MSG.RUN_STOP:
      stopRun();
      sendResponse({ ok: true });
      return false;

    case MSG.RUN_STATUS_QUERY:
      sendResponse(getRunState());
      return false;

    case MSG.COOKIE_START:
      runCookieWarmup(msg.data).catch((err) => {
        store.appendLog('error', t('logCookieFailed', err.message));
      });
      sendResponse({ ok: true });
      return false;

    case MSG.COOKIE_STOP:
      stopCookieWarmup();
      sendResponse({ ok: true });
      return false;

    case MSG.COOKIE_STATUS_QUERY:
      sendResponse(getCookieState());
      return false;

    default:
      return false;
  }
});

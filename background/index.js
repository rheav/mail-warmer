import { MSG, RUN_STATUS } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { runSignups, getRunState, stopRun } from './runner.js';

// Open sidepanel when action icon clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn('sidePanel setPanelBehavior failed', err));

// Refresh the curated newsletter list from the backend daily. The fetch
// itself is 24h-cached (lib/remote.js), so the alarm just nudges a re-check;
// network only happens when the cache is actually stale.
const REFRESH_ALARM = 'refreshNewsletters';
const REFRESH_PERIOD_MIN = 24 * 60;

async function refreshNewsletters(force = false) {
  try {
    await store.refreshNewslettersFromRemote({ force });
  } catch (err) {
    store.appendLog('error', `Newsletter refresh failed: ${err.message}`);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await store.ensureSeeded();
  await store.ensureProfileSeeded();
  await refreshNewsletters();
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MIN });
});

chrome.runtime.onStartup.addListener(() => {
  // Cache may have expired while the browser was closed.
  refreshNewsletters();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) refreshNewsletters();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case MSG.RUN_START:
      runSignups(msg.data).catch((err) => {
        store.appendLog('error', `Run failed: ${err.message}`);
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

    default:
      return false;
  }
});

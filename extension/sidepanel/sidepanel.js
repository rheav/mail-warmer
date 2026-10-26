// Side panel entry: loads the language, wires every tab, keeps the shared
// cache in sync with storage and routes background progress messages.

import * as store from '../lib/storage.js';
import { loadLocale, t } from '../lib/i18n.js';
import { MSG } from '../lib/messages.js';
import { $, $$, cache, applyI18n, setStatus } from './ui.js';
import { bindEmails, renderEmails, renderEmailSelect } from './emails.js';
import { bindLists, renderNewsletters } from './lists.js';
import { bindRun, renderRunList, setRunning, updateProgress, queryRunStatus } from './run.js';
import {
  bindCookies,
  renderCookieList,
  setCookieRunning,
  onCookieProgress,
  queryCookieStatus,
} from './cookies.js';
import { bindProfile, loadProfile } from './profile.js';
import { bindLog, renderLog } from './log.js';

init();

async function init() {
  document.documentElement.lang = (await loadLocale()).replace('_', '-');
  applyI18n();
  $('#versionTag').textContent = `v${chrome.runtime.getManifest().version}`;
  await store.ensureSeeded();
  await store.ensureProfileSeeded();
  bindTabs();
  bindEmails();
  bindProfile();
  bindLists();
  bindRun();
  bindCookies();
  bindLog();
  bindStorageChanges();
  bindMessages();

  await refreshAll();
  // Step 1 first: a panel with no email yet opens on the Emails tab.
  if (cache.emails.length === 0) showTab('emails');
  await loadProfile();
  await queryRunStatus();
  await queryCookieStatus();
}

function bindTabs() {
  $$('.gm-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
}

function showTab(id) {
  $$('.gm-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${id}`));
}

async function refreshAll() {
  const data = await store.getAll();
  Object.assign(cache, {
    emails: data.emails,
    activeEmailId: data.activeEmailId,
    newsletters: data.newsletters,
    history: data.history,
    cookieRun: data.cookieRun,
  });
  renderEmails();
  renderEmailSelect();
  renderNewsletters();
  renderRunList();
  renderCookieList();
  renderLog(data.log);
}

function bindStorageChanges() {
  store.onChange(async (changes) => {
    if (changes.emails || changes.activeEmailId || changes.newsletters || changes.history) {
      const data = await store.getAll();
      Object.assign(cache, {
        emails: data.emails,
        activeEmailId: data.activeEmailId,
        newsletters: data.newsletters,
        history: data.history,
      });
      renderEmails();
      renderEmailSelect();
      renderNewsletters();
      renderRunList();
    }
    if (changes.log) {
      renderLog(changes.log.newValue || []);
    }
    if (changes.profile) {
      await loadProfile();
    }
    if (changes.cookieRun) {
      cache.cookieRun = changes.cookieRun.newValue;
      renderCookieList();
    }
  });
}

function bindMessages() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === MSG.RUN_PROGRESS) {
      setRunning(true);
      updateProgress(msg.data);
    } else if (msg.type === MSG.RUN_COMPLETE) {
      setRunning(false);
      setStatus('done', t('statusDone'));
    } else if (msg.type === MSG.COOKIE_PROGRESS) {
      onCookieProgress(msg.data);
    } else if (msg.type === MSG.COOKIE_COMPLETE) {
      setCookieRunning(false);
      setStatus('done', t('statusDone'));
    }
  });
}

import * as store from '../lib/storage.js';
import { generateFakeProfile } from '../lib/fake-profile.js';
import { MSG, RUN_STATUS } from '../lib/messages.js';
import { COOKIE_SITES, siteId } from '../lib/cookie-sites.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// --- State ---
const selectedIds = new Set();
let cachedNewsletters = [];
let cachedEmails = [];
let cachedHistory = {};
// Cookie warm-up: every site selected by default so it's a one-click action.
const cookieSelectedIds = new Set(COOKIE_SITES.map(siteId));
let cachedCookieRun = null;

// --- Init ---
init();

async function init() {
  renderVersion();
  await store.ensureSeeded();
  await store.ensureProfileSeeded();
  bindTabs();
  bindEmailForm();
  bindProfileForm();
  bindNewsletterDialog();
  bindOverrideDialog();
  bindRunControls();
  bindCookieControls();
  bindLogControls();
  bindStorageChanges();
  bindMessages();

  await refreshAll();
  await loadProfile();
  await queryRunStatus();
  await queryCookieStatus();
}

// --- Version tag ---
function renderVersion() {
  const m = chrome.runtime.getManifest();
  const el = $('#versionTag');
  if (el) el.textContent = `v${m.version}`;
}

// --- Tabs ---
function bindTabs() {
  $$('.gm-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.gm-nav-item').forEach((b) => b.classList.toggle('active', b === btn));
      const id = btn.dataset.tab;
      $$('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${id}`);
      });
    });
  });
}

// --- Refresh ---
async function refreshAll() {
  const data = await store.getAll();
  cachedEmails = data.emails;
  cachedNewsletters = data.newsletters;
  cachedHistory = data.history;
  cachedCookieRun = data.cookieRun;
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
      cachedEmails = data.emails;
      cachedNewsletters = data.newsletters;
      cachedHistory = data.history;
      renderEmails();
      renderEmailSelect();
      renderNewsletters();
      renderRunList();
    }
    if (changes.log) {
      renderLog(changes.log.newValue);
    }
    if (changes.profile) {
      await loadProfile();
    }
    if (changes.cookieRun) {
      cachedCookieRun = changes.cookieRun.newValue;
      renderCookieList();
    }
  });
}

// --- Emails ---
function bindEmailForm() {
  $('#addEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = $('#newEmail').value;
    const label = $('#newEmailLabel').value;
    try {
      await store.addEmail(address, label);
      $('#newEmail').value = '';
      $('#newEmailLabel').value = '';
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderEmails() {
  const list = $('#emailList');
  if (cachedEmails.length === 0) {
    list.innerHTML = '<li class="empty">No emails yet. Add one above.</li>';
    return;
  }
  list.innerHTML = '';
  cachedEmails.forEach((e) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="material-symbols-outlined" style="color: var(--gm-text-faint);">account_circle</span>
      <div>
        <div class="nl-name">${escapeHtml(e.address)}</div>
        ${e.label ? `<div class="nl-meta">${escapeHtml(e.label)}</div>` : ''}
      </div>
      <span class="nl-meta">${new Date(e.addedAt).toLocaleDateString()}</span>
      <button class="btn-icon" data-action="remove-email" data-id="${e.id}" title="Remove">
        <span class="material-symbols-outlined" style="font-size:18px">delete</span>
      </button>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('[data-action="remove-email"]').forEach((btn) => {
    btn.addEventListener('click', () => store.removeEmail(btn.dataset.id));
  });
}

function renderEmailSelect() {
  const sel = $('#activeEmail');
  sel.innerHTML = '';
  if (cachedEmails.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Add an email first';
    opt.disabled = true;
    sel.appendChild(opt);
    return;
  }
  cachedEmails.forEach((e) => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.label ? `${e.label} <${e.address}>` : e.address;
    sel.appendChild(opt);
  });
  const activeId = cachedEmails.find(
    (e) => e.id === sel.value
  )?.id;
  store.getActiveEmail().then((active) => {
    if (active) sel.value = active.id;
  });
  sel.onchange = () => store.setActiveEmail(sel.value);
}

// --- Newsletters ---
function renderNewsletters() {
  const list = $('#newsletterList');
  if (cachedNewsletters.length === 0) {
    list.innerHTML = '<li class="empty">No newsletters. Reset to defaults to seed.</li>';
    return;
  }
  list.innerHTML = '';
  cachedNewsletters.forEach((n) => {
    const li = document.createElement('li');
    const hasOverride = n.selectors && n.selectors.email;
    li.innerHTML = `
      <span class="tag ${n.type}">${n.type}</span>
      <div>
        <div class="nl-name">${escapeHtml(n.name)} ${hasOverride ? '<span class="tag override" title="Custom selectors">★</span>' : ''}</div>
        <div class="nl-meta">${escapeHtml(n.host || n.slug || n.url || '')}</div>
      </div>
      ${n.type === 'form'
        ? `<button class="btn-icon" data-action="edit-nl" data-id="${n.id}" title="Custom selectors"><span class="material-symbols-outlined" style="font-size:18px">tune</span></button>`
        : '<span></span>'}
      <button class="btn-icon" data-action="remove-nl" data-id="${n.id}" title="Remove">
        <span class="material-symbols-outlined" style="font-size:18px">delete</span>
      </button>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('[data-action="remove-nl"]').forEach((btn) => {
    btn.addEventListener('click', () => store.removeNewsletter(btn.dataset.id));
  });
  list.querySelectorAll('[data-action="edit-nl"]').forEach((btn) => {
    btn.addEventListener('click', () => openOverrideDialog(btn.dataset.id));
  });
}

function bindNewsletterDialog() {
  const dialog = $('#newsletterDialog');
  const form = $('#newsletterForm');
  const typeSel = form.elements.type;

  const syncFields = () => {
    const type = typeSel.value;
    form.querySelector('.if-substack').hidden = type !== 'substack';
    form.querySelector('.if-form').hidden = type !== 'form';
    form.elements.slugOrHost.required = type === 'substack';
    form.elements.url.required = type === 'form';
  };

  typeSel.addEventListener('change', syncFields);

  $('#addNewsletterBtn').addEventListener('click', () => {
    form.reset();
    syncFields();
    dialog.showModal();
  });

  $('#cancelDialog').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    // Substack: detect host vs slug by presence of a dot.
    if (data.type === 'substack' && data.slugOrHost) {
      const raw = data.slugOrHost.trim();
      if (raw.includes('.')) {
        data.host = raw.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      } else {
        data.slug = raw;
      }
      delete data.slugOrHost;
    }
    try {
      await store.addNewsletter(data);
      dialog.close();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#resetDefaults').addEventListener('click', async () => {
    if (confirm('Reset newsletter list to defaults? Custom entries will be lost.')) {
      await store.resetNewslettersToDefaults();
    }
  });
}

// --- Run list ---
function renderRunList() {
  const list = $('#runList');
  if (cachedNewsletters.length === 0) {
    list.innerHTML = '<li class="empty">No newsletters configured.</li>';
    updateSelCount();
    return;
  }
  const activeId = cachedEmails.find((e) => e.id === $('#activeEmail').value)?.id;
  list.innerHTML = '';
  cachedNewsletters.forEach((n) => {
    const li = document.createElement('li');
    const histKey = activeId ? store.historyKey(activeId, n.id) : '';
    const hist = cachedHistory[histKey];
    const histStatus = hist ? hist.status : null;
    const checked = selectedIds.has(n.id) ? 'checked' : '';
    li.innerHTML = `
      <input type="checkbox" data-id="${n.id}" ${checked}>
      <div>
        <div class="nl-name">${escapeHtml(n.name)}</div>
        <div class="nl-meta">${escapeHtml(n.slug || n.url || '')}</div>
      </div>
      <span class="tag ${n.type}">${n.type}</span>
      <span class="status ${histStatus || 'pending'}">${histStatus || 'new'}</span>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.id);
      else selectedIds.delete(cb.dataset.id);
      updateSelCount();
    });
  });
  updateSelCount();
}

function updateSelCount() {
  $('#selCount').textContent = `${selectedIds.size} selected`;
}

function bindRunControls() {
  $('#selectAll').addEventListener('click', () => {
    cachedNewsletters.forEach((n) => selectedIds.add(n.id));
    renderRunList();
  });
  $('#selectNone').addEventListener('click', () => {
    selectedIds.clear();
    renderRunList();
  });
  $('#selectUnsubbed').addEventListener('click', () => {
    selectedIds.clear();
    const activeId = $('#activeEmail').value;
    cachedNewsletters.forEach((n) => {
      const h = cachedHistory[store.historyKey(activeId, n.id)];
      if (!h || h.status !== 'success') selectedIds.add(n.id);
    });
    renderRunList();
  });

  $('#runBtn').addEventListener('click', async () => {
    if (selectedIds.size === 0) {
      alert('Pick at least one newsletter.');
      return;
    }
    const activeId = $('#activeEmail').value;
    if (!activeId) {
      alert('Add and select an email first.');
      return;
    }
    chrome.runtime.sendMessage({
      type: MSG.RUN_START,
      data: {
        emailId: activeId,
        newsletterIds: Array.from(selectedIds),
      },
    });
  });

  $('#stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.RUN_STOP });
  });
}

// --- Cookie warm-up ---
function renderCookieList() {
  const list = $('#cookieList');
  const byId = new Map(
    (cachedCookieRun?.results || []).map((r) => [r.id, r.status])
  );
  list.innerHTML = '';
  COOKIE_SITES.forEach((site) => {
    const id = siteId(site);
    const li = document.createElement('li');
    const checked = cookieSelectedIds.has(id) ? 'checked' : '';
    const status = byId.get(id);
    li.innerHTML = `
      <input type="checkbox" data-id="${id}" ${checked}>
      <div>
        <div class="nl-name">${escapeHtml(site.name)}</div>
        <div class="nl-meta">${escapeHtml(site.category)}</div>
      </div>
      <span class="tag">${escapeHtml(new URL(site.url).hostname.replace(/^www\./, ''))}</span>
      <span class="status ${status || 'pending'}">${status || 'new'}</span>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) cookieSelectedIds.add(cb.dataset.id);
      else cookieSelectedIds.delete(cb.dataset.id);
      updateCookieSelCount();
    });
  });
  updateCookieSelCount();
  renderCookieLastRun();
}

function updateCookieSelCount() {
  $('#cookieSelCount').textContent = `${cookieSelectedIds.size} selected`;
}

function renderCookieLastRun() {
  const el = $('#cookieLastRun');
  if (!cachedCookieRun) {
    el.textContent = 'No cookie profile built yet.';
    return;
  }
  const results = cachedCookieRun.results || [];
  const accepted = results.filter((r) => r.status === 'success').length;
  el.textContent =
    `Last warm-up ${timeAgo(cachedCookieRun.at)} — ` +
    `${accepted}/${results.length} sites accepted cookies.`;
}

function bindCookieControls() {
  $('#cookieSelectAll').addEventListener('click', () => {
    COOKIE_SITES.forEach((s) => cookieSelectedIds.add(siteId(s)));
    renderCookieList();
  });
  $('#cookieSelectNone').addEventListener('click', () => {
    cookieSelectedIds.clear();
    renderCookieList();
  });

  $('#cookieRunBtn').addEventListener('click', () => {
    if (cookieSelectedIds.size === 0) {
      alert('Pick at least one website.');
      return;
    }
    chrome.runtime.sendMessage({
      type: MSG.COOKIE_START,
      data: { siteIds: Array.from(cookieSelectedIds) },
    });
    setCookieRunning(true);
  });

  $('#cookieStopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.COOKIE_STOP });
  });
}

function setCookieRunning(running) {
  $('#cookieRunBtn').disabled = running;
  $('#cookieStopBtn').disabled = !running;
  $('#cookieProgress').hidden = !running;
  setStatus(running ? 'running' : 'idle', running ? 'Warming cookies' : 'Idle');
}

function updateCookieProgress(p) {
  if (!p) return;
  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
  $('#cookieProgressBar').style.width = `${pct}%`;
  $('#cookieProgressText').textContent =
    `${p.done} / ${p.total}${p.current ? ` · ${p.current}` : ''}`;
}

async function queryCookieStatus() {
  const resp = await chrome.runtime.sendMessage({
    type: MSG.COOKIE_STATUS_QUERY,
  });
  if (resp?.status === RUN_STATUS.RUNNING) {
    setCookieRunning(true);
    updateCookieProgress(resp.progress);
  }
}

// --- Run status / progress ---
function bindMessages() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === MSG.RUN_PROGRESS) {
      setRunning(true);
      updateProgress(msg.data);
    } else if (msg.type === MSG.RUN_COMPLETE) {
      setRunning(false);
      setStatus('done', 'Done');
    } else if (msg.type === MSG.COOKIE_PROGRESS) {
      setCookieRunning(true);
      updateCookieProgress(msg.data);
    } else if (msg.type === MSG.COOKIE_COMPLETE) {
      setCookieRunning(false);
      setStatus('done', 'Done');
    }
  });
}

async function queryRunStatus() {
  const resp = await chrome.runtime.sendMessage({ type: MSG.RUN_STATUS_QUERY });
  if (resp?.status === RUN_STATUS.RUNNING) {
    setRunning(true);
    updateProgress(resp.progress);
  }
}

function setRunning(running) {
  $('#runBtn').disabled = running;
  $('#stopBtn').disabled = !running;
  $('#progress').hidden = !running;
  setStatus(running ? 'running' : 'idle', running ? 'Running' : 'Idle');
}

function setStatus(state, label) {
  const el = $('#runStatus');
  el.className = `gm-status ${state === 'idle' ? '' : state}`.trim();
  el.querySelector('.run-text').textContent = label;
}

function updateProgress(p) {
  if (!p) return;
  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
  $('#progressBar').style.width = `${pct}%`;
  $('#progressText').textContent = `${p.done} / ${p.total}`;
}

// --- Log ---
function bindLogControls() {
  $('#clearLog').addEventListener('click', () => store.clearLog());
}

function renderLog(entries) {
  const list = $('#logList');
  $('#logCount').textContent = `${entries.length} entries`;
  if (entries.length === 0) {
    list.innerHTML = '<li class="empty">No log entries yet.</li>';
    return;
  }
  list.innerHTML = '';
  [...entries].reverse().forEach((e) => {
    const li = document.createElement('li');
    li.className = e.level;
    const t = new Date(e.at).toLocaleTimeString();
    li.innerHTML = `<span class="log-time">${t}</span><span>${escapeHtml(e.message)}</span>`;
    list.appendChild(li);
  });
}

// --- Profile ---
function bindProfileForm() {
  const form = $('#profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const patch = Object.fromEntries(fd);
    await store.setProfile(patch);
    flashProfileStatus('Saved');
  });

  $('#regenerateBtn').addEventListener('click', async () => {
    if (!confirm('Replace the entire profile with a freshly generated fake identity?')) return;
    await store.replaceProfile(generateFakeProfile());
    await loadProfile();
    flashProfileStatus('Regenerated');
  });

  $('#fillBlanksBtn').addEventListener('click', async () => {
    const patch = await store.fillProfileBlanks();
    await loadProfile();
    const n = Object.keys(patch).length;
    flashProfileStatus(n > 0 ? `Filled ${n} field${n === 1 ? '' : 's'}` : 'Nothing to fill');
  });
}

function flashProfileStatus(text) {
  const status = $('#profileSaveStatus');
  status.textContent = text;
  setTimeout(() => (status.textContent = ''), 2000);
}

async function loadProfile() {
  const profile = await store.getProfile();
  const form = $('#profileForm');
  Object.entries(profile).forEach(([k, v]) => {
    const el = form.elements[k];
    if (el) el.value = v ?? '';
  });
}

// --- Override dialog ---
let overrideTargetId = null;

function bindOverrideDialog() {
  const dialog = $('#overrideDialog');
  $('#cancelOverride').addEventListener('click', () => dialog.close());

  $('#clearOverride').addEventListener('click', async () => {
    if (!overrideTargetId) return;
    await store.updateNewsletter(overrideTargetId, { selectors: null });
    dialog.close();
  });

  $('#overrideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!overrideTargetId) return;
    const fd = new FormData(e.target);
    const flat = Object.fromEntries(fd);
    const selectors = {
      email: flat.email?.trim() || undefined,
      submit: flat.submit?.trim() || undefined,
      fields: {},
    };
    Object.entries(flat).forEach(([k, v]) => {
      if (k.startsWith('fields.') && v?.trim()) {
        selectors.fields[k.slice('fields.'.length)] = v.trim();
      }
    });
    if (Object.keys(selectors.fields).length === 0) delete selectors.fields;
    if (!selectors.email) {
      alert('Email selector is required (or use Clear to remove overrides).');
      return;
    }
    await store.updateNewsletter(overrideTargetId, { selectors });
    dialog.close();
  });
}

function openOverrideDialog(newsletterId) {
  overrideTargetId = newsletterId;
  const n = cachedNewsletters.find((x) => x.id === newsletterId);
  if (!n) return;
  $('#overrideTarget').textContent = `${n.name} — ${n.url || ''}`;

  const form = $('#overrideForm');
  form.reset();

  const sels = n.selectors || {};
  if (sels.email) form.elements.email.value = sels.email;
  if (sels.submit) form.elements.submit.value = sels.submit;
  if (sels.fields) {
    Object.entries(sels.fields).forEach(([key, val]) => {
      const el = form.elements[`fields.${key}`];
      if (el) el.value = val;
    });
  }
  $('#overrideDialog').showModal();
}

// --- Utils ---
function timeAgo(ts) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

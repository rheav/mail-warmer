// Cookies tab: the cookie-profile warm-up.

import { t } from '../lib/i18n.js';
import { MSG, RUN_STATUS } from '../lib/messages.js';
import { COOKIE_SITES, siteId } from '../lib/cookie-sites.js';
import { $, cache, escapeHtml, setStatus, timeAgo } from './ui.js';

// Every site selected by default so it's a one-click action.
const cookieSelectedIds = new Set(COOKIE_SITES.map(siteId));
// Live progress while a warm-up runs: { done, total, current, currentId,
// phase, results }. null when idle — then the list shows the stored run.
let cookieLive = null;
// Site rows whose captured-cookie detail is expanded.
const expandedCookieSites = new Set();

// The result record for a site: live run wins, else the last stored run.
function cookieSiteResult(id) {
  const src = cookieLive ? cookieLive.results : cache.cookieRun?.results;
  return (src || []).find((r) => r.id === id) || null;
}

// Per-site status pill: live run wins, else the last stored run.
function cookieSiteStatus(id) {
  if (cookieLive) {
    const r = (cookieLive.results || []).find((x) => x.id === id);
    if (r) return r.status;
    if (cookieLive.currentId === id) return 'running';
    return 'pending';
  }
  const r = cookieSiteResult(id);
  return r ? r.status : null;
}

export function renderCookieList() {
  const list = $('#cookieList');
  list.innerHTML = '';
  COOKIE_SITES.forEach((site) => {
    const id = siteId(site);
    const li = document.createElement('li');
    const checked = cookieSelectedIds.has(id) ? 'checked' : '';
    const status = cookieSiteStatus(id);
    const host = new URL(site.url).hostname.replace(/^www\d?\./, '');
    const res = cookieSiteResult(id);
    const count = res && typeof res.cookieCount === 'number' ? res.cookieCount : null;
    const hasDetail = !!(res && res.cookies && res.cookies.length);
    const meta =
      t(`cat_${site.category}`) + (count != null ? ` · ${t('cookiesCount', count)}` : '');
    li.innerHTML = `
      <input type="checkbox" data-id="${id}" ${checked}>
      <div class="cookie-main${hasDetail ? ' clickable' : ''}" data-id="${id}">
        <div class="nl-name" title="${escapeHtml(site.name)}">${escapeHtml(site.name)}</div>
        <div class="nl-meta">${escapeHtml(meta)}${
          hasDetail
            ? ` <span class="cookie-toggle">${escapeHtml(
                expandedCookieSites.has(id) ? t('cookiesHide') : t('cookiesView')
              )}</span>`
            : ''
        }</div>
      </div>
      <span class="tag">${escapeHtml(host)}</span>
      <span class="status ${status || 'pending'}">${escapeHtml(t(`status_${status || 'new'}`))}</span>
    `;
    if (hasDetail && expandedCookieSites.has(id)) {
      const detail = document.createElement('div');
      detail.className = 'cookie-detail';
      detail.innerHTML = res.cookies
        .map(
          (c) =>
            `<div class="cookie-line"><code>${escapeHtml(c.name)}</code>` +
            `<span class="cookie-val">${escapeHtml(c.value)}</span></div>`
        )
        .join('');
      li.appendChild(detail);
    }
    list.appendChild(li);
  });
  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) cookieSelectedIds.add(cb.dataset.id);
      else cookieSelectedIds.delete(cb.dataset.id);
      updateCookieSelCount();
    });
  });
  list.querySelectorAll('.cookie-main.clickable').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (expandedCookieSites.has(id)) expandedCookieSites.delete(id);
      else expandedCookieSites.add(id);
      renderCookieList();
    });
  });
  updateCookieSelCount();
  renderCookieLastRun();
}

// Plain-language line describing what the warm-up is doing right now.
function updateCookieStep() {
  const box = $('#cookieStep');
  const text = $('#cookieStepText');
  if (!cookieLive || cookieLive.phase === 'done') {
    box.hidden = true;
    return;
  }
  const site = cookieLive.current || t('cookiesASite');
  const msgByPhase = {
    opening: t('cookiesOpening', site),
    accepting: t('cookiesAccepting', site),
  };
  text.textContent = msgByPhase[cookieLive.phase] || t('cookiesWarming', site);
  box.hidden = false;
}

function updateCookieSelCount() {
  $('#cookieSelCount').textContent = t('selectedCount', cookieSelectedIds.size);
}

function renderCookieLastRun() {
  const el = $('#cookieLastRun');
  if (!cache.cookieRun) {
    el.textContent = t('cookiesNoRun');
    return;
  }
  const results = cache.cookieRun.results || [];
  const accepted = results.filter((r) => r.status === 'success').length;
  el.textContent = t('cookiesLastRun', timeAgo(cache.cookieRun.at), accepted, results.length);
}

export function bindCookies() {
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
      alert(t('cookiesPickOne'));
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

export function setCookieRunning(running) {
  $('#cookieRunBtn').disabled = running;
  $('#cookieStopBtn').disabled = !running;
  $('#cookieProgress').hidden = !running;
  setStatus(running ? 'running' : 'idle', t(running ? 'statusWarming' : 'statusIdle'));
  if (!running) {
    cookieLive = null;
    $('#cookieStep').hidden = true;
    renderCookieList();
  }
}

function updateCookieProgress(p) {
  if (!p) return;
  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
  $('#cookieProgressBar').style.width = `${pct}%`;
  $('#cookieProgressText').textContent =
    `${p.done} / ${p.total}${p.current ? ` · ${p.current}` : ''}`;
}

// COOKIE_PROGRESS from the background.
export function onCookieProgress(data) {
  cookieLive = data;
  $('#cookieRunBtn').disabled = true;
  $('#cookieStopBtn').disabled = false;
  $('#cookieProgress').hidden = false;
  setStatus('running', t('statusWarming'));
  updateCookieProgress(data);
  renderCookieList();
  updateCookieStep();
}

export async function queryCookieStatus() {
  const resp = await chrome.runtime.sendMessage({
    type: MSG.COOKIE_STATUS_QUERY,
  });
  if (resp?.status === RUN_STATUS.RUNNING) {
    cookieLive = { ...resp.progress, results: resp.results || [] };
    setCookieRunning(true);
    updateCookieProgress(resp.progress);
    renderCookieList();
    updateCookieStep();
  }
}

// Run tab: pick newsletters for the active email and run the signups.

import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { MSG, RUN_STATUS } from '../lib/messages.js';
import { $, cache, escapeHtml, setStatus } from './ui.js';

const selectedIds = new Set();

export function renderRunList() {
  const list = $('#runList');
  if (cache.newsletters.length === 0) {
    list.innerHTML = `<li class="empty">${escapeHtml(t('runEmpty'))}</li>`;
    updateSelCount();
    return;
  }
  const activeId = cache.emails.find((e) => e.id === $('#activeEmail').value)?.id;
  list.innerHTML = '';
  cache.newsletters.forEach((n) => {
    const li = document.createElement('li');
    const histKey = activeId ? store.historyKey(activeId, n.id) : '';
    const hist = cache.history[histKey];
    const histStatus = hist ? hist.status : null;
    const checked = selectedIds.has(n.id) ? 'checked' : '';
    li.innerHTML = `
      <input type="checkbox" data-id="${n.id}" ${checked}>
      <div class="nl-main">
        <div class="nl-name" title="${escapeHtml(n.name)}">${escapeHtml(n.name)}</div>
        <div class="nl-meta">${escapeHtml(n.slug || n.url || '')}</div>
      </div>
      <span class="tag ${n.type}">${escapeHtml(t(`type_${n.type}`))}</span>
      <span class="status ${histStatus || 'pending'}">${escapeHtml(t(`status_${histStatus || 'new'}`))}</span>
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
  $('#selCount').textContent = t('selectedCount', selectedIds.size);
}

export function bindRun() {
  $('#selectAll').addEventListener('click', () => {
    cache.newsletters.forEach((n) => selectedIds.add(n.id));
    renderRunList();
  });
  $('#selectNone').addEventListener('click', () => {
    selectedIds.clear();
    renderRunList();
  });
  $('#selectUnsubbed').addEventListener('click', () => {
    selectedIds.clear();
    const activeId = $('#activeEmail').value;
    cache.newsletters.forEach((n) => {
      const h = cache.history[store.historyKey(activeId, n.id)];
      if (!h || h.status !== 'success') selectedIds.add(n.id);
    });
    renderRunList();
  });

  $('#runBtn').addEventListener('click', async () => {
    if (selectedIds.size === 0) {
      alert(t('runPickOne'));
      return;
    }
    const activeId = $('#activeEmail').value;
    if (!activeId) {
      alert(t('runNeedEmail'));
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

export function setRunning(running) {
  $('#runBtn').disabled = running;
  $('#stopBtn').disabled = !running;
  $('#progress').hidden = !running;
  setStatus(running ? 'running' : 'idle', t(running ? 'statusRunning' : 'statusIdle'));
}

export function updateProgress(p) {
  if (!p) return;
  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
  $('#progressBar').style.width = `${pct}%`;
  $('#progressText').textContent = `${p.done} / ${p.total}`;
}

export async function queryRunStatus() {
  const resp = await chrome.runtime.sendMessage({ type: MSG.RUN_STATUS_QUERY });
  if (resp?.status === RUN_STATUS.RUNNING) {
    setRunning(true);
    updateProgress(resp.progress);
  }
}

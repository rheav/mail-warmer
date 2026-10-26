// Log tab.

import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { $, escapeHtml } from './ui.js';

export function bindLog() {
  $('#clearLog').addEventListener('click', () => store.clearLog());
}

export function renderLog(entries) {
  const list = $('#logList');
  $('#logCount').textContent = t('logCount', entries.length);
  if (entries.length === 0) {
    list.innerHTML = `<li class="empty">${escapeHtml(t('logEmpty'))}</li>`;
    return;
  }
  list.innerHTML = '';
  [...entries].reverse().forEach((e) => {
    const li = document.createElement('li');
    li.className = e.level;
    const time = new Date(e.at).toLocaleTimeString();
    li.innerHTML = `<span class="log-time">${time}</span><span>${escapeHtml(e.message)}</span>`;
    list.appendChild(li);
  });
}

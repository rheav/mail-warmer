// Emails tab, plus the "From" picker on the Run tab.

import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { $, cache, escapeHtml } from './ui.js';

export function bindEmails() {
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
  $('#activeEmail').addEventListener('change', (e) => store.setActiveEmail(e.target.value));
}

export function renderEmails() {
  const list = $('#emailList');
  if (cache.emails.length === 0) {
    list.innerHTML = `<li class="empty">${escapeHtml(t('emailsEmpty'))}</li>`;
    return;
  }
  list.innerHTML = '';
  cache.emails.forEach((e) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="material-symbols-outlined" style="color: var(--gm-text-faint);">account_circle</span>
      <div>
        <div class="nl-name">${escapeHtml(e.address)}</div>
        ${e.label ? `<div class="nl-meta">${escapeHtml(e.label)}</div>` : ''}
      </div>
      <span class="nl-meta">${new Date(e.addedAt).toLocaleDateString()}</span>
      <button class="btn-icon" data-action="remove-email" data-id="${e.id}" title="${escapeHtml(t('remove'))}">
        <span class="material-symbols-outlined" style="font-size:18px">delete</span>
      </button>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('[data-action="remove-email"]').forEach((btn) => {
    btn.addEventListener('click', () => store.removeEmail(btn.dataset.id));
  });
}

export function renderEmailSelect() {
  const sel = $('#activeEmail');
  sel.innerHTML = '';
  if (cache.emails.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = t('emailsAddFirst');
    opt.disabled = true;
    sel.appendChild(opt);
    return;
  }
  cache.emails.forEach((e) => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.label ? `${e.label} <${e.address}>` : e.address;
    sel.appendChild(opt);
  });
  if (cache.emails.some((e) => e.id === cache.activeEmailId)) {
    sel.value = cache.activeEmailId;
  }
}

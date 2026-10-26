// Lists tab: the newsletter list, the add dialog and per-newsletter
// selector overrides.

import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { $, cache, escapeHtml } from './ui.js';

export function renderNewsletters() {
  const list = $('#newsletterList');
  if (cache.newsletters.length === 0) {
    list.innerHTML = `<li class="empty">${escapeHtml(t('listsEmpty'))}</li>`;
    return;
  }
  list.innerHTML = '';
  cache.newsletters.forEach((n) => {
    const li = document.createElement('li');
    const hasOverride = n.selectors && n.selectors.email;
    const selTitle = escapeHtml(t('overrideTitle'));
    li.innerHTML = `
      <span class="tag ${n.type}">${escapeHtml(t(`type_${n.type}`))}</span>
      <div>
        <div class="nl-name">${escapeHtml(n.name)} ${hasOverride ? `<span class="tag override" title="${selTitle}">★</span>` : ''}</div>
        <div class="nl-meta">${escapeHtml(n.host || n.slug || n.url || '')}</div>
      </div>
      ${n.type === 'form'
        ? `<button class="btn-icon" data-action="edit-nl" data-id="${n.id}" title="${selTitle}"><span class="material-symbols-outlined" style="font-size:18px">tune</span></button>`
        : '<span></span>'}
      <button class="btn-icon" data-action="remove-nl" data-id="${n.id}" title="${escapeHtml(t('remove'))}">
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

export function bindLists() {
  bindNewsletterDialog();
  bindOverrideDialog();
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
    if (confirm(t('listsResetConfirm'))) {
      await store.resetNewslettersToDefaults();
    }
  });
}

// --- Selector override dialog ---
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
      alert(t('overrideEmailRequired'));
      return;
    }
    await store.updateNewsletter(overrideTargetId, { selectors });
    dialog.close();
  });
}

function openOverrideDialog(newsletterId) {
  overrideTargetId = newsletterId;
  const n = cache.newsletters.find((x) => x.id === newsletterId);
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

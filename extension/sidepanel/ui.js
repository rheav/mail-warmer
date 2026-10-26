// Helpers and data shared by the side panel tab modules.

import { t } from '../lib/i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Storage snapshot the tabs render from; sidepanel.js keeps it fresh.
export const cache = {
  emails: [],
  activeEmailId: null,
  newsletters: [],
  history: {},
  cookieRun: null,
};

// Static text in sidepanel.html: data-i18n (text), data-i18n-placeholder,
// data-i18n-title. The English inline text is only the pre-load fallback.
export function applyI18n(root = document) {
  $$('[data-i18n]', root).forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$('[data-i18n-placeholder]', root).forEach(
    (el) => (el.placeholder = t(el.dataset.i18nPlaceholder))
  );
  $$('[data-i18n-title]', root).forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}

// Top-bar pill: state is 'idle' | 'running' | 'done'.
export function setStatus(state, label) {
  const el = $('#runStatus');
  el.className = `gm-status ${state === 'idle' ? '' : state}`.trim();
  el.querySelector('.run-text').textContent = label;
}

export function timeAgo(ts) {
  if (!ts) return t('agoNever');
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return t('agoNow');
  if (m < 60) return t('agoMinutes', m);
  const h = Math.round(m / 60);
  if (h < 24) return t('agoHours', h);
  return t('agoDays', Math.round(h / 24));
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

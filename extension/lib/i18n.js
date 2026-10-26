// UI strings, English and Brazilian Portuguese, from _locales/<lang>/messages.json.
//
// Not chrome.i18n.getMessage: that follows the browser's UI language only, and
// the store screenshots need both languages from one browser. The language is
// `lang` in storage when set, else the browser's; anything not Portuguese
// falls back to English. Substitutions are $1…$9.

export const LANGS = ['en', 'pt_BR'];

let messages = {};
let current = 'en';

export async function loadLocale() {
  const { lang } = await chrome.storage.local.get('lang');
  const ui = chrome.i18n.getUILanguage().toLowerCase();
  current = LANGS.includes(lang) ? lang : ui.startsWith('pt') ? 'pt_BR' : 'en';
  const res = await fetch(chrome.runtime.getURL(`_locales/${current}/messages.json`));
  messages = await res.json();
  return current;
}

export function currentLang() {
  return current;
}

export function t(key, ...args) {
  const msg = messages[key]?.message ?? key;
  return msg.replace(/\$(\d)/g, (_, i) => String(args[i - 1] ?? ''));
}

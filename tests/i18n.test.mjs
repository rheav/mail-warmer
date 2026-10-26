import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetStorage, setUiLanguage } from './chrome-stub.mjs';
import { loadLocale, t } from '../extension/lib/i18n.js';

test('browser language picks the locale; anything not Portuguese is English', async () => {
  resetStorage();
  setUiLanguage('pt-BR');
  assert.equal(await loadLocale(), 'pt_BR');
  assert.equal(t('navProfile'), 'Perfil');
  setUiLanguage('de-DE');
  assert.equal(await loadLocale(), 'en');
  assert.equal(t('navProfile'), 'Profile');
});

test('`lang` in storage overrides the browser language', async () => {
  resetStorage({ lang: 'pt_BR' });
  setUiLanguage('en-US');
  assert.equal(await loadLocale(), 'pt_BR');
});

test('t substitutes $1…$n and falls back to the key', async () => {
  resetStorage();
  setUiLanguage('en-US');
  await loadLocale();
  assert.equal(t('cookiesLastRun', '2h ago', 3, 5), 'Last warm-up 2h ago — 3/5 sites accepted cookies.');
  assert.equal(t('noSuchKey'), 'noSuchKey');
});

// Profile tab: the identity used for extra signup fields.

import * as store from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { generateFakeProfile } from '../lib/fake-profile.js';
import { $ } from './ui.js';

export function bindProfile() {
  const form = $('#profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const patch = Object.fromEntries(fd);
    await store.setProfile(patch);
    flashProfileStatus(t('profileSaved'));
  });

  $('#regenerateBtn').addEventListener('click', async () => {
    if (!confirm(t('profileRegenerateConfirm'))) return;
    await store.replaceProfile(generateFakeProfile());
    await loadProfile();
    flashProfileStatus(t('profileRegenerated'));
  });

  $('#fillBlanksBtn').addEventListener('click', async () => {
    const patch = await store.fillProfileBlanks();
    await loadProfile();
    const n = Object.keys(patch).length;
    flashProfileStatus(
      n === 0 ? t('profileNothingToFill') : n === 1 ? t('profileFilledOne') : t('profileFilledMany', n)
    );
  });
}

function flashProfileStatus(text) {
  const status = $('#profileSaveStatus');
  status.textContent = text;
  setTimeout(() => (status.textContent = ''), 2000);
}

export async function loadProfile() {
  const profile = await store.getProfile();
  const form = $('#profileForm');
  Object.entries(profile).forEach(([k, v]) => {
    const el = form.elements[k];
    if (el) el.value = v ?? '';
  });
}

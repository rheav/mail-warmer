// Thin wrapper around chrome.storage.local with typed keys + defaults.
// Schema:
//   emails:        [{ id, address, label, addedAt }]
//   activeEmailId: string | null
//   newsletters:   [{ id, name, type, slug?, url?, source: 'default'|'custom' }]
//   history:       { [`${emailId}:${newsletterId}`]: { status, at, message? } }
//   log:           [{ at, level, message }]   (capped, newest last)
//   profile:       { firstName, lastName, fullName, age, dob, gender, country, ... }
//   cookieRun:     { at, results: [{ id, name, status }] } | null
//   lang:          'en' | 'pt_BR' | unset (see lib/i18n.js)

import { generateFakeProfile, fillBlanksWithFake } from './fake-profile.js';
import { t } from './i18n.js';

const DEFAULTS = {
  emails: [],
  activeEmailId: null,
  newsletters: [],
  history: {},
  log: [],
  profile: {
    firstName: '',
    lastName: '',
    fullName: '',
    age: '',
    dob: '',
    gender: '',
    country: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    company: '',
    jobTitle: '',
    website: '',
  },
  cookieRun: null,
};

const LOG_LIMIT = 500;

export async function get(...keys) {
  const flatKeys = keys.flat();
  const defaults = Object.fromEntries(
    flatKeys.map((k) => [k, DEFAULTS[k]])
  );
  return chrome.storage.local.get(defaults);
}

export async function set(patch) {
  return chrome.storage.local.set(patch);
}

export async function getAll() {
  return chrome.storage.local.get(DEFAULTS);
}

export function onChange(cb) {
  const listener = (changes, area) => {
    if (area === 'local') cb(changes);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

// --- Emails ---

export async function addEmail(address, label = '') {
  const { emails, activeEmailId } = await get('emails', 'activeEmailId');
  const trimmed = address.trim().toLowerCase();
  if (!trimmed) throw new Error(t('errEmailRequired'));
  if (emails.some((e) => e.address === trimmed)) {
    throw new Error(t('errEmailExists'));
  }
  const newEmail = {
    id: cryptoId(),
    address: trimmed,
    label: label.trim(),
    addedAt: Date.now(),
  };
  const next = [...emails, newEmail];
  await set({
    emails: next,
    activeEmailId: activeEmailId || newEmail.id,
  });
  return newEmail;
}

export async function removeEmail(id) {
  const { emails, activeEmailId } = await get('emails', 'activeEmailId');
  const next = emails.filter((e) => e.id !== id);
  const nextActive = activeEmailId === id ? (next[0]?.id ?? null) : activeEmailId;
  await set({ emails: next, activeEmailId: nextActive });
}

export async function setActiveEmail(id) {
  await set({ activeEmailId: id });
}

export async function getActiveEmail() {
  const { emails, activeEmailId } = await get('emails', 'activeEmailId');
  return emails.find((e) => e.id === activeEmailId) || null;
}

// --- Profile ---

export async function getProfile() {
  const { profile } = await get('profile');
  return profile;
}

export async function setProfile(patch) {
  const { profile } = await get('profile');
  await set({ profile: { ...profile, ...patch } });
}

export async function replaceProfile(next) {
  await set({ profile: next });
}

// Auto-seed profile w/ a fake person if every field is blank.
// Returns true if seeding happened.
export async function ensureProfileSeeded() {
  const { profile } = await get('profile');
  const allBlank = Object.values(profile).every(
    (v) => !v || String(v).trim() === ''
  );
  if (allBlank) {
    await set({ profile: generateFakeProfile() });
    return true;
  }
  return false;
}

// Fills only the blank fields. Useful from the Profile tab "Regenerate empty"
// action so user-typed values are preserved.
export async function fillProfileBlanks() {
  const { profile } = await get('profile');
  const patch = fillBlanksWithFake(profile);
  if (Object.keys(patch).length > 0) {
    await set({ profile: { ...profile, ...patch } });
  }
  return patch;
}

// --- Newsletters ---

export async function addNewsletter(data) {
  const { newsletters } = await get('newsletters');
  const item = {
    id: cryptoId(),
    name: data.name.trim(),
    type: data.type,
    slug: data.slug?.trim() || undefined,
    host: data.host?.trim() || undefined,
    url: data.url?.trim() || undefined,
    source: 'custom',
  };
  await set({ newsletters: [...newsletters, item] });
  return item;
}

export async function removeNewsletter(id) {
  const { newsletters } = await get('newsletters');
  await set({ newsletters: newsletters.filter((n) => n.id !== id) });
}

export async function updateNewsletter(id, patch) {
  const { newsletters } = await get('newsletters');
  const next = newsletters.map((n) => (n.id === id ? { ...n, ...patch } : n));
  await set({ newsletters: next });
}

// The curated list ships inside the extension (newsletters.json) and only
// changes with an extension update — mailWarmer talks to no server.
async function readBundledNewsletters() {
  const res = await fetch(chrome.runtime.getURL('newsletters.json'));
  return res.json();
}

// Replaces the 'default' newsletters with the bundled list.
// User-added 'custom' newsletters are preserved.
export async function resetNewslettersToDefaults() {
  const defaults = await readBundledNewsletters();
  const seeded = defaults.map((n) => ({
    ...n,
    id: cryptoId(),
    source: 'default',
  }));
  const { newsletters } = await get('newsletters');
  const custom = newsletters.filter((n) => n.source === 'custom');
  const next = [...seeded, ...custom];
  await set({ newsletters: next });
  return next;
}

// Stable identity for a newsletter, independent of its generated id —
// used to match remote entries against already-stored ones.
function newsletterKey(n) {
  return n.slug || n.host || n.url || n.name;
}

// After an extension update: syncs the 'default' newsletters with the
// bundled list without disturbing 'custom' entries or losing history.
// Existing ids are reused for unchanged entries (matched by
// slug/host/url/name) so history keys stay valid; removed entries drop,
// new ones get a fresh id.
export async function syncDefaultNewsletters() {
  const remote = await readBundledNewsletters();
  const { newsletters } = await get('newsletters');

  const existingByKey = new Map(
    newsletters
      .filter((n) => n.source === 'default')
      .map((n) => [newsletterKey(n), n])
  );

  const defaults = remote.map((n) => {
    const prior = existingByKey.get(newsletterKey(n));
    return { ...n, id: prior?.id || cryptoId(), source: 'default' };
  });

  const custom = newsletters.filter((n) => n.source === 'custom');
  const next = [...defaults, ...custom];
  await set({ newsletters: next });
  return next;
}

export async function ensureSeeded() {
  const { newsletters } = await get('newsletters');
  if (newsletters.length === 0) {
    await resetNewslettersToDefaults();
  }
}

// --- History ---

export function historyKey(emailId, newsletterId) {
  return `${emailId}:${newsletterId}`;
}

export async function getHistory() {
  const { history } = await get('history');
  return history;
}

export async function recordResult(emailId, newsletterId, status, message) {
  const { history } = await get('history');
  history[historyKey(emailId, newsletterId)] = {
    status,
    at: Date.now(),
    message,
  };
  await set({ history });
}

// --- Log ---

export async function appendLog(level, message) {
  const { log } = await get('log');
  const entry = { at: Date.now(), level, message };
  const next = [...log, entry].slice(-LOG_LIMIT);
  await set({ log: next });
  return entry;
}

export async function clearLog() {
  await set({ log: [] });
}

// --- Cookie warm-up ---

// Last cookie warm-up: { at, results: [{ id, name, status }] } | null.
export async function getCookieRun() {
  const { cookieRun } = await get('cookieRun');
  return cookieRun;
}

export async function setCookieRun(run) {
  await set({ cookieRun: run });
}

// --- Utils ---

function cryptoId() {
  return crypto.randomUUID();
}

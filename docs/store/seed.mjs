// Prints the chrome.storage.local seed for the store captures, in one
// language: `node docs/store/seed.mjs pt_BR`. Log lines are built from the
// extension's own messages, so they read exactly like a real run.
// Addresses use example.com: nobody's real inbox appears in the images.

import { readFileSync } from 'node:fs';

const lang = process.argv[2] || 'en';
const messages = JSON.parse(
  readFileSync(new URL(`../../extension/_locales/${lang}/messages.json`, import.meta.url))
);
const t = (key, ...args) =>
  messages[key].message.replace(/\$(\d)/g, (_, i) => String(args[i - 1] ?? ''));

const now = Date.now();
const min = 60_000;

const newsletters = [
  { id: 'n1', name: "Lenny's Newsletter", type: 'substack', slug: 'lennysnewsletter', source: 'default' },
  { id: 'n2', name: 'The Pragmatic Engineer', type: 'substack', host: 'newsletter.pragmaticengineer.com', source: 'default' },
  { id: 'n3', name: 'One Useful Thing (Ethan Mollick)', type: 'substack', host: 'www.oneusefulthing.org', source: 'default' },
  { id: 'n4', name: 'Platformer', type: 'substack', slug: 'platformer', source: 'default' },
  { id: 'n5', name: 'Garbage Day', type: 'substack', slug: 'garbageday', source: 'default' },
  { id: 'n6', name: 'TLDR Newsletter', type: 'form', url: 'https://tldr.tech/signup', source: 'default' },
  { id: 'n7', name: 'Construction Physics', type: 'substack', host: 'www.construction-physics.com', source: 'default' },
  {
    id: 'n8', name: 'Morning Brew', type: 'form', url: 'https://www.morningbrew.com/daily/subscribe',
    source: 'custom', selectors: { email: 'input[type="email"]' },
  },
];

const results = { n1: 'success', n2: 'success', n3: 'success', n4: 'success', n5: 'success', n6: 'error' };
const history = Object.fromEntries(
  Object.entries(results).map(([id, status], i) => [
    `e1:${id}`,
    { status, at: now - (30 - i) * min, message: status === 'error' ? t('ffNoFrame') : t('msgSubstackOk') },
  ])
);

const site = (id, name, status, cookieCount, cookies) => ({ id, name, status, cookieCount, ...(cookies ? { cookies } : { cookies: [] }) });
const cookieRun = {
  at: now - 2 * 60 * min,
  results: [
    site('plumguide.com', 'Plum Guide — Nice Villas', 'success', 18),
    site('cotedazur-sothebysrealty.com', "Côte d'Azur Sotheby's Realty", 'success', 12),
    site('ibizainmotion.com', 'Ibiza in Motion', 'skipped', 6),
    site('lecollectionist.com', 'Le Collectionist — Ibiza', 'success', 21),
    site('mareterra.com', 'Mareterra Monaco', 'success', 9),
    site('greekexclusiveproperties.com', 'Greek Exclusive Properties', 'skipped', 4),
    site('santorini.villas', 'Santorini Villas', 'success', 7),
    site('ferrari.com', 'Ferrari', 'success', 24, [
      { name: 'OptanonConsent', value: 'isGpcEnabled=0&datestamp=Mon+Oct+26+2026&version=202409…' },
      { name: 'OptanonAlertBoxClosed', value: '2026-10-26T09:12:44.318Z' },
      { name: '_ga', value: 'GA1.1.1844020571.1793006764' },
      { name: '_gcl_au', value: '1.1.204718233.1793006764' },
      { name: 'AMCV_ferrari', value: '179643557%7CMCIDTS%7C20387%7CvVersion%7C5.5.0' },
    ]),
    site('mercedes-benz.com.br', 'Mercedes-Benz Brazil', 'success', 15),
    site('bmw.com.br', 'BMW Brazil', 'success', 19),
    site('porsche.com', 'Porsche Brazil', 'success', 13),
    site('ysl.com', 'Yves Saint Laurent', 'success', 22),
    site('chanel.com', 'Chanel Brazil', 'success', 17),
    site('shop.dior.com.br', 'Dior Brazil', 'success', 11),
  ],
};

const done = Object.entries(results).filter(([, s]) => s === 'success').length;
const log = [
  ['info', t('logCookieStart', 14), 125],
  ['success', t('logCookieAccepted', 'Ferrari', 'selector #onetrust-accept-btn-handler'), 123],
  ['info', t('logCookieCount', 'Ferrari', 24), 123],
  ['info', t('logCookieComplete', 198, 14), 120],
  ['info', t('logRunStart', 6, 'warm.inbox@example.com'), 31],
  ['success', `[Lenny's Newsletter] ${t('status_success')} — ${t('msgSubstackOk')}`, 30],
  ['success', `[The Pragmatic Engineer] ${t('status_success')} — ${t('msgSubstackOk')}`, 29],
  ['success', `[One Useful Thing (Ethan Mollick)] ${t('status_success')} — ${t('msgSubstackOk')}`, 28],
  ['success', `[Platformer] ${t('status_success')} — ${t('msgSubstackOk')}`, 27],
  ['success', `[Garbage Day] ${t('status_success')} — ${t('msgSubstackOk')}`, 26],
  ['warn', `[TLDR Newsletter] ${t('status_error')} — ${t('ffNoFrame')}`, 25],
  ['info', t('logRunComplete', done, 6), 25],
].map(([level, message, ago]) => ({ at: now - ago * min, level, message }));

const pt = lang === 'pt_BR';
const seed = {
  lang,
  emails: [
    { id: 'e1', address: 'warm.inbox@example.com', label: pt ? 'Principal' : 'Main', addedAt: now - 9 * 86_400_000 },
    { id: 'e2', address: 'side.project@example.com', label: pt ? 'Projeto paralelo' : 'Side project', addedAt: now - 5 * 86_400_000 },
    { id: 'e3', address: 'backup.inbox@example.com', label: pt ? 'Reserva' : 'Backup', addedAt: now - 86_400_000 },
  ],
  activeEmailId: 'e1',
  newsletters,
  history,
  cookieRun,
  log,
  profile: {
    firstName: 'Jordan', lastName: 'Hayes', fullName: 'Jordan Hayes', age: '31', dob: '1995-04-17',
    gender: 'prefer not to say', country: 'Canada', state: 'Ontario', city: 'Toronto', postalCode: 'M5V 2T6',
    phone: '+1 (416) 555-0142', company: 'Northwind Labs', jobTitle: 'Product Manager', website: '',
  },
};

console.log(JSON.stringify(seed));

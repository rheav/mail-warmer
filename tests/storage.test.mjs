import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetStorage } from './chrome-stub.mjs';
import * as store from '../extension/lib/storage.js';

const bundled = JSON.parse(readFileSync(new URL('../extension/newsletters.json', import.meta.url)));

test('syncDefaultNewsletters keeps ids and custom entries, drops removed ones', async () => {
  const kept = bundled[0];
  resetStorage({
    newsletters: [
      { ...kept, id: 'keep-me', source: 'default' },
      { name: 'Gone', type: 'substack', slug: 'no-longer-listed', id: 'gone', source: 'default' },
      { name: 'Mine', type: 'form', url: 'https://example.org/join', id: 'mine', source: 'custom' },
    ],
  });
  const next = await store.syncDefaultNewsletters();
  assert.equal(next.length, bundled.length + 1);
  assert.equal(next.find((n) => n.slug === kept.slug).id, 'keep-me');
  assert.ok(!next.some((n) => n.id === 'gone'));
  assert.deepEqual(next.at(-1), { name: 'Mine', type: 'form', url: 'https://example.org/join', id: 'mine', source: 'custom' });
});

test('ensureSeeded loads the bundled list once', async () => {
  resetStorage();
  await store.ensureSeeded();
  const { newsletters } = await store.get('newsletters');
  assert.equal(newsletters.length, bundled.length);
  assert.ok(newsletters.every((n) => n.source === 'default' && n.id));
});

test('addEmail rejects duplicates', async () => {
  resetStorage();
  await store.addEmail('Warm@Example.com');
  await assert.rejects(store.addEmail('warm@example.com'));
  const { emails, activeEmailId } = await store.get('emails', 'activeEmailId');
  assert.equal(emails.length, 1);
  assert.equal(activeEmailId, emails[0].id);
});

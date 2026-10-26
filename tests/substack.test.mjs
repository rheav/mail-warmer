import { test } from 'node:test';
import assert from 'node:assert/strict';
import { net, resetStorage } from './chrome-stub.mjs';
import { loadLocale } from '../extension/lib/i18n.js';
import { signupSubstack } from '../extension/background/adapters/substack.js';

resetStorage();
await loadLocale();

test('posts to the publication origin and reports success', async () => {
  let called;
  net.handler = (url, init) => {
    called = { url, body: String(init.body) };
    return new Response(JSON.stringify({ email_subscription: { id: 1 } }), { status: 200 });
  };
  const r = await signupSubstack('a@example.org', { host: 'www.slowboring.com' });
  assert.equal(r.status, 'success');
  assert.equal(called.url, 'https://www.slowboring.com/api/v1/free');
  assert.match(called.body, /email=a%40example.org/);
});

test('HTTP errors come back as an error result', async () => {
  net.handler = () => new Response('not found', { status: 404 });
  const r = await signupSubstack('a@example.org', { slug: 'gone' });
  assert.equal(r.status, 'error');
  assert.match(r.message, /^HTTP 404/);
});

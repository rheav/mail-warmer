// Minimal in-memory chrome.* for unit tests. Packaged files resolve to
// extension/ on disk; fetch() reads them, anything else goes to the
// per-test `net` handler.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXT = new URL('../extension/', import.meta.url);
let data = {};
export let uiLanguage = 'en-US';
export const net = { handler: null };

export function resetStorage(seed = {}) {
  data = structuredClone(seed);
}
export function setUiLanguage(lang) {
  uiLanguage = lang;
}

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        if (keys == null) return structuredClone(data);
        if (typeof keys === 'string') keys = [keys];
        const defaults = Array.isArray(keys) ? Object.fromEntries(keys.map((k) => [k, undefined])) : keys;
        const out = {};
        for (const [k, def] of Object.entries(defaults)) {
          const v = k in data ? data[k] : def;
          if (v !== undefined) out[k] = structuredClone(v);
        }
        return out;
      },
      async set(patch) {
        Object.assign(data, structuredClone(patch));
      },
      async remove(keys) {
        for (const k of [].concat(keys)) delete data[k];
      },
    },
    onChanged: { addListener() {}, removeListener() {} },
  },
  runtime: { getURL: (p) => new URL(p, EXT).href },
  i18n: { getUILanguage: () => uiLanguage },
};

globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('file:')) {
    const body = readFileSync(fileURLToPath(url), 'utf8');
    return new Response(body, { status: 200 });
  }
  if (!net.handler) throw new Error(`unexpected network call: ${url}`);
  return net.handler(String(url), init);
};

# CLAUDE.md

## What this is

mailWarmer — Chrome extension (MV3, plain ES modules, no bundler) that subscribes the user's email addresses to curated newsletters so the inboxes stay active. Public repo, published on the Chrome Web Store (`ikibedkcbfcilgignjobgdlioninmige`).

| Path | What | Deployed to |
| --- | --- | --- |
| `extension/` | The extension itself — load this folder unpacked | Chrome Web Store (zip from `npm run build`) |
| `website/` | Astro + Tailwind landing, docs, privacy, terms (English) | https://mail-warmer.rheav.dev — Cloudflare Pages project `mail-warmer`, builds `website/` on every push to `main`. `mailwarmer.rheav.dev` 301-redirects to it (zone redirect rule) |
| `docs/store/` | Listing copy, permission/privacy answers, screenshots, render tools | — |
| `server/` | Old newsletter API. **The extension must never use it.** | VPS (EasyPanel `my-projects_mail-warmer`) |

## Rule that matters most: zero server connections

The extension makes no request to any server of ours — no remote list, no analytics, no install ID. Only `fetch(chrome.runtime.getURL(...))` for packaged files and the Substack adapter's call to each newsletter's own signup endpoint. `scripts/preflight.mjs` enforces it and runs before every build; never bypass or loosen it. The website privacy page and `docs/store/LISTING.md` say the same thing — keep them in sync.

## Commands

- `npm test` — `node --test tests/` (chrome.* stub in `tests/chrome-stub.mjs`)
- `npm run build` — preflight, then `release/mailwarmer-<version>.zip`
- `npm run store-images` — frames `docs/store/raw/<lang>/*.png` into `docs/store/screenshots/` (headless Chrome, no deps)
- Website: `cd website && npm run dev | build`

## Extension architecture

- `background/index.js` — service worker: on install seeds storage; on update re-syncs the default newsletters from `newsletters.json` (ids kept, custom entries untouched). Routes `MSG.*` messages to `runner.js` (signups) and `cookie-warmer.js` (warm-up); both keep in-memory state and broadcast progress.
- Adapters: `substack.js` (POST `/api/v1/free`), `form.js` (background tab + `content/form-filler.js` in every frame). The form-filler returns i18n reason keys; the background translates them.
- `sidepanel/` — `sidepanel.js` wires one module per tab (`run`, `cookies`, `emails`, `profile`, `lists`, `log`) around the shared `ui.js` (`$`, `cache`, `applyI18n`, `setStatus`).
- `lib/` — `storage.js` (all of chrome.storage.local), `i18n.js`, `wait.js` (delay/jitter/waitForTabComplete), `badge.js`, `fake-profile.js`, `cookie-sites.js`, `messages.js`.

## Translations (en + pt_BR)

Every user-visible string — HTML, JS, log lines — is in `extension/_locales/{en,pt_BR}/messages.json`. HTML: `data-i18n` / `data-i18n-placeholder` / `data-i18n-title`; JS: `t('key', ...args)` with `$1…$9`. Not `chrome.i18n.getMessage`: the locale comes from `lang` in storage when set (store screenshots), else the browser language. New strings need both locales; the preflight fails otherwise.

## Releases

`docs/RELEASE.md`. Version lives in `extension/manifest.json` (`version` + `version_name`) and the root `package.json`; the preflight fails if they differ. The website reads the version from the manifest (`website/src/data/site.ts`); public notes are `website/src/data/changelog.ts`, developer notes `CHANGELOG.md`.

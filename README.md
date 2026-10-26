# mailWarmer

Chrome extension (Manifest V3) that auto-subscribes a set of email addresses
to curated newsletters, so those inboxes keep receiving mail and stay active.

- **No server.** The extension talks to no backend of ours: the curated list
  ships inside the extension, and nothing — no analytics, no install ID — is
  ever sent. `npm run build` fails if code gains a network call of its own
  (`scripts/preflight.mjs`).
- **English and Português (Brasil)**, following the browser language.
- Free and open source. [Chrome Web Store](https://chromewebstore.google.com/detail/mail-warmer/ikibedkcbfcilgignjobgdlioninmige) ·
  [mail-warmer.rheav.dev](https://mail-warmer.rheav.dev)

---

## Repository layout

```
extension/                 The extension (load this folder unpacked)
├── manifest.json
├── _locales/{en,pt_BR}/   UI strings (lib/i18n.js)
├── newsletters.json       The curated newsletter list
├── background/
│   ├── index.js           Service worker: install/update, message router
│   ├── runner.js          Signup run loop + progress
│   ├── cookie-warmer.js   Cookie warm-up loop
│   └── adapters/
│       ├── substack.js    Substack public signup endpoint
│       └── form.js        Generic form (opens tab, injects form-filler)
├── content/form-filler.js Finds the email field, skips honeypots, submits
├── lib/                   storage, i18n, wait helpers, badge, fake profile,
│                          cookie-site list, message constants
├── sidepanel/             sidepanel.html/.css + one module per tab
│                          (run, cookies, emails, profile, lists, log) + ui.js
└── public/                logo.png, self-hosted fonts
scripts/preflight.mjs      Build guard (network, version, translations)
tests/                     node --test unit tests (chrome.* stub)
docs/store/                Store listing, screenshots and the tools that make them
website/                   Astro landing site (mail-warmer.rheav.dev)
server/                    Old newsletter API — not used by the extension
```

## Develop

```sh
npm test            # unit tests
npm run build       # preflight + release/mailwarmer-<version>.zip
```

Load the extension: `chrome://extensions` → Developer mode → **Load
unpacked** → select `extension/`. No build step: the folder is the extension.

Website: `cd website && npm install && npm run dev`.

## How a run works

1. Pick an email and newsletters on the **Run** tab, hit **Run signups**.
2. `background/runner.js` takes them one at a time, 2.5–5.5 s apart:
   - **substack** → `POST https://<host>/api/v1/free` with the email;
   - **form** → opens the signup URL in a background tab, injects
     `content/form-filler.js` into every frame, fills the email (and any
     profile fields the form asks for) and submits.
3. Each result lands in `history` per email + newsletter, the **Log** tab and
   the toolbar badge (orange while running, then green successes or red errors).

## Cookie warm-up (the Cookies tab)

Optional, before signups: a fresh browser profile with no cookies looks
unusual. For each selected site mailWarmer opens it in a background tab,
scrolls and clicks the page body to nudge lazy consent banners, accepts the
banner (known consent-platform selectors first — OneTrust, Cookiebot,
Didomi, Usercentrics, Osano, CookieYes, Complianz, tarteaucitron, Axeptio,
Iubenda… — then a short accept-text fallback), closes the tab and reads back
the cookies the visit left. The site list is `extension/lib/cookie-sites.js`.

## Translations

`extension/_locales/en` and `pt_BR` hold every string, including log lines
and form-filler reasons. HTML uses `data-i18n`, `data-i18n-placeholder` and
`data-i18n-title`; JS uses `t('key', ...args)` with `$1…$9`. The browser
language picks the locale; a `lang` key in storage (`en` / `pt_BR`)
overrides it — the store screenshots use that. The preflight fails if a key
is missing in either language.

## Newsletter entry format

```jsonc
// Substack by slug — resolves to <slug>.substack.com
{ "name": "Lenny's Newsletter", "type": "substack", "slug": "lennysnewsletter" }

// Substack on a custom domain
{ "name": "Slow Boring", "type": "substack", "host": "www.slowboring.com" }

// Generic signup form at an arbitrary URL
{ "name": "TLDR Newsletter", "type": "form", "url": "https://tldr.tech/signup" }
```

In storage each entry also gets an `id` and a `source`: `default` (from
`newsletters.json`, re-synced on every extension update, ids kept) or
`custom` (added by the user, never touched).

## Data & storage

Everything lives in `chrome.storage.local` (schema in `lib/storage.js`):
`emails`, `activeEmailId`, `newsletters`, `history`, `log` (capped at 500),
`profile`, `cookieRun`, and optionally `lang`. Nothing leaves the browser
except the signups and warm-up visits the user starts.

## Releases

See [`docs/RELEASE.md`](docs/RELEASE.md) and [`CHANGELOG.md`](CHANGELOG.md).

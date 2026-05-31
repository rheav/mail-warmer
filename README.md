# Mail Warmer

Chrome extension (Manifest V3) that auto-subscribes a set of email addresses
to curated newsletters, so those inboxes keep receiving mail and stay active.

It pairs with a tiny **Node.js backend** that hosts the curated newsletter
list — so the list can change without shipping a new extension build (which
would require Google review each time).

---

## How it works

```
┌─────────────────────┐      GET /api/newsletters       ┌──────────────────┐
│  Chrome extension   │ ───────────────────────────────▶│  Express server  │
│  (sidepanel UI +    │ ◀─────────────────────────────── │  (on your VPS)   │
│   background worker)│      { version, newsletters }    │  + status board  │
└─────────────────────┘   cached 24h in chrome.storage   └──────────────────┘
         │
         │ for each newsletter: open tab, detect signup form,
         │ fill email (+ profile fields), submit
         ▼
   Substack / generic signup forms
```

0. *(Optional)* The **Cookies** tab warms up the browser: it opens a curated
   set of sites in background tabs, accepts their cookie banners, and closes
   them — so the profile has a normal cookie set before signups.
1. You add email addresses and pick newsletters in the sidepanel.
2. **Run** opens each newsletter's signup page in a tab.
3. An adapter detects the signup form, fills it, and submits.
4. Results are recorded per `email × newsletter` in `chrome.storage.local`.
5. The newsletter list refreshes from the backend daily (24h cache, with an
   offline fallback to the bundled `newsletters.json`).

The **toolbar icon badge** mirrors progress while you work: an orange running
count during a run, then a green success count (or a red error count) when it
finishes. Cookie warm-up ends with a green badge of sites accepted.

---

## Repository layout

```
mail-warmer/
├── manifest.json          Extension manifest (MV3)
├── newsletters.json       Bundled fallback list (used if API unreachable)
├── background/            Service worker
│   ├── index.js           Message routing, install + daily-refresh alarm
│   ├── runner.js           Orchestrates a signup run
│   ├── cookie-warmer.js   Opens sites + auto-accepts cookie banners
│   └── adapters/          Per-source signup logic
│       ├── substack.js
│       └── form.js        Generic HTML form fallback
├── content/
│   └── form-filler.js     Injected: detects + fills + submits signup forms
├── sidepanel/             UI — Cookies / Run / Emails / Profile / Lists / Log
│   ├── sidepanel.html / .css / .js
├── lib/
│   ├── config.js          Backend URL config
│   ├── storage.js         Typed wrapper over chrome.storage.local
│   ├── remote.js          Fetches the newsletter list, 24h cache + fallback
│   ├── analytics.js       Sends an anonymous run pulse to the backend
│   ├── cookie-sites.js    Curated site list for cookie warm-up
│   ├── messages.js        Message-type constants
│   ├── badge.js           Toolbar action-badge helper (run/cookie counts)
│   └── fake-profile.js    Generates a fake person for signup fields
├── public/                Extension icons — logo.svg (source) + logo.png
└── server/                Backend API + status dashboard  (see server/README.md)
```

---

## Extension — install (development)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select this folder.
4. Click the toolbar icon to open the sidepanel.

### Configure the backend URL

Before loading, set the API base in **`lib/config.js`**:

```js
export const API_BASE = 'https://api.yourdomain.com';
```

Use HTTPS — Chrome may block plain-HTTP fetches from the extension.

If the server is unreachable, the extension falls back to the bundled
`newsletters.json`, so signups keep working offline.

---

## Icons

`public/logo.svg` is the source of truth and is what the side panel renders.
Chrome's manifest `icons` / `action.default_icon` only accept raster images,
so `public/logo.png` is a 128×128 export of that SVG. Regenerate it after
editing the SVG (headless Chrome rasterizes the gradient + strokes correctly,
where ImageMagick does not):

```sh
cd public
cat > _r.html <<'H'
<!doctype html><style>*{margin:0}html,body{background:transparent}
img{width:128px;height:128px;display:block}</style><img src="logo.svg">
H
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --default-background-color=00000000 \
  --window-size=128,128 --hide-scrollbars \
  --screenshot=logo.png "file://$PWD/_r.html"; rm _r.html
```

---

## Cookie warm-up (the Cookies tab)

The first sidepanel tab builds a normal-looking cookie profile in the browser
before any signups run — a fresh profile with no cookies looks unusual.

For each selected site Mail Warmer:

1. opens it in a background tab,
2. does a quick scroll + a benign click to nudge lazy consent banners,
3. accepts the cookie-consent banner,
4. closes the tab,
5. reads back the cookies the visit left and logs them.

**Accepting** is a two-tier in-page clicker, run in every frame: known
consent-platform selectors (OneTrust, Cookiebot, Quantcast, Didomi,
Usercentrics, Osano, CookieYes, Complianz, HubSpot, tarteaucitron, Axeptio,
WordPress Cookie Notice, Iubenda, Cookie Information), then a short
accept-text fallback (`Accept all`, `I agree`, …). It polls ~7s per site.

**The site list** lives in `lib/cookie-sites.js` — a curated set of luxury
real-estate, automotive, and fashion sites. Edit that file to change it.

**Captured cookies** — after each site the run logs the real `name = value`
pairs to the **Log** tab (values clipped), and the Cookies tab shows a
per-site cookie count with an expandable name/value view. The last run is
stored in `chrome.storage.local` as `cookieRun`.

Requires the `cookies` and `tabs` permissions (already in `manifest.json`).
Background-tab visits to sites behind aggressive bot management (e.g. Akamai)
may be blocked before the banner renders — those just collect fewer cookies.

---

## Backend — the newsletter API

A small Express server in **`server/`** that:

- serves the curated list at `GET /api/newsletters` (24h `Cache-Control` + ETag),
- lets you edit the list at `PUT /api/newsletters` (token-gated) or from the
  dashboard's **Edit list** editor — persisted to a volume,
- collects anonymous run analytics at `POST /api/pulse` into a SQLite DB,
- exposes `GET /api/status`, `GET /api/analytics`, and a **dashboard** at `/`,
- reloads the data file automatically when it changes.

### Run locally

```sh
cd server
npm install
npm start          # http://localhost:3000
```

### Deploy

- **Easypanel** — App service from this repo, build path `server`, Volume
  Mount `analytics-db` → `/app/db`, auto HTTPS.
- **Plain Docker / VPS** — `cd server && docker compose up -d --build`, then
  a reverse proxy for HTTPS.

The analytics SQLite DB persists in the `/app/db` volume across redeploys.
Full deploy + update instructions: **[`server/README.md`](server/README.md)**.

### Updating the newsletter list

Two ways, no extension rebuild and no Google review either way:

- **Dashboard editor (recommended)** — open the server dashboard at `/`, click
  **Edit list**, add/edit/delete newsletters, **Save & publish**. Token-gated
  (`ADMIN_TOKEN`) and persisted to the volume, so it survives redeploys.
- **Edit the seed file** — change `server/data/newsletters.json` and redeploy
  with `docker compose up -d --build`.

Extensions pick up the change within 24h, or instantly on browser restart.

---

## Newsletter entry format

Each entry in `newsletters` is one of:

```jsonc
// Substack by slug — resolves to <slug>.substack.com
{ "name": "Lenny's Newsletter", "type": "substack", "slug": "lennysnewsletter" }

// Substack on a custom domain
{ "name": "Slow Boring", "type": "substack", "host": "www.slowboring.com" }

// Generic signup form at an arbitrary URL
{ "name": "TLDR Newsletter", "type": "form", "url": "https://tldr.tech/signup" }
```

Inside the extension's storage, each entry also gets an `id` and a
`source` of `default` (from the API) or `custom` (added by the user).

---

## Data & storage

All extension state lives in `chrome.storage.local` (see schema in
`lib/storage.js`):

| Key             | Contents |
|-----------------|----------|
| `emails`        | Addresses to subscribe |
| `activeEmailId` | Currently selected email |
| `newsletters`   | The working list (default + custom) |
| `history`       | Result per `emailId:newsletterId` |
| `log`           | Capped activity log |
| `profile`       | Fake person used to fill non-email fields |
| `newslettersCache` | Cached API response + fetch timestamp |
| `installId`     | Random anonymous UUID for analytics pulses |
| `cookieRun`     | Last cookie warm-up — timestamp + per-site result |

The only data leaving the browser is the read-only `GET` for the newsletter
list and, after each run, an **anonymous analytics pulse** — per-newsletter
success/failure counts plus a random `installId`. No email addresses or
profile data are ever sent. See `lib/analytics.js` and `server/README.md`.

---

## Versioning

See [`CHANGELOG.md`](CHANGELOG.md). Bump `version` and `version_name` in
`manifest.json` on every extension release. The backend's list has its own
independent `version` field in `newsletters.json`.

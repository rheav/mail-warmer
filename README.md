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

1. You add email addresses and pick newsletters in the sidepanel.
2. **Run** opens each newsletter's signup page in a tab.
3. An adapter detects the signup form, fills it, and submits.
4. Results are recorded per `email × newsletter` in `chrome.storage.local`.
5. The newsletter list refreshes from the backend daily (24h cache, with an
   offline fallback to the bundled `newsletters.json`).

---

## Repository layout

```
mail-warmer/
├── manifest.json          Extension manifest (MV3)
├── newsletters.json       Bundled fallback list (used if API unreachable)
├── background/            Service worker
│   ├── index.js           Message routing, install + daily-refresh alarm
│   ├── runner.js           Orchestrates a signup run
│   └── adapters/          Per-source signup logic
│       ├── substack.js
│       └── form.js        Generic HTML form fallback
├── content/
│   └── form-filler.js     Injected: detects + fills + submits signup forms
├── sidepanel/             UI — Run / Emails / Profile / Lists / Log tabs
│   ├── sidepanel.html / .css / .js
├── lib/
│   ├── config.js          Backend URL config
│   ├── storage.js         Typed wrapper over chrome.storage.local
│   ├── remote.js          Fetches the newsletter list, 24h cache + fallback
│   ├── analytics.js       Sends an anonymous run pulse to the backend
│   ├── messages.js        Message-type constants
│   └── fake-profile.js    Generates a fake person for signup fields
├── public/                Extension icons
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

## Backend — the newsletter API

A small Express server in **`server/`** that:

- serves the curated list at `GET /api/newsletters` (24h `Cache-Control` + ETag),
- collects anonymous run analytics at `POST /api/pulse` into a SQLite DB,
- exposes `GET /api/status`, `GET /api/analytics`, and a **dashboard** at `/`,
- reloads `data/newsletters.json` automatically when it changes.

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

1. Edit `server/data/newsletters.json` (bump `version` + `updatedAt`).
2. Redeploy: `docker compose up -d --build`.
3. Extensions pick up the change within 24h, or instantly on browser restart.

No extension rebuild, no Google review.

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

The only data leaving the browser is the read-only `GET` for the newsletter
list and, after each run, an **anonymous analytics pulse** — per-newsletter
success/failure counts plus a random `installId`. No email addresses or
profile data are ever sent. See `lib/analytics.js` and `server/README.md`.

---

## Versioning

See [`CHANGELOG.md`](CHANGELOG.md). Bump `version` and `version_name` in
`manifest.json` on every extension release. The backend's list has its own
independent `version` field in `newsletters.json`.

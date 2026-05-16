# Mail Warmer — Newsletter API

Tiny Express server that hosts the curated newsletter list so the extension
can be updated without shipping a new build (which needs Google review).

## Endpoint

```
GET /api/newsletters
```

Response:

```json
{
  "version": 1,
  "updatedAt": "2026-05-15T00:00:00.000Z",
  "newsletters": [ { "name": "...", "type": "substack", "slug": "..." } ]
}
```

- `Cache-Control: public, max-age=86400` and an `ETag` are set.
- The extension caches the result for 24h (see `lib/remote.js`).

## Other routes

| Route                | Purpose |
|----------------------|---------|
| `GET /`              | Status + analytics dashboard (HTML/CSS/JS, no build step) |
| `GET /api/status`    | List metadata as JSON — version, count, type breakdown, etag, uptime |
| `POST /api/pulse`    | Receives an anonymous run analytics pulse from the extension |
| `GET /api/analytics` | Aggregated analytics (totals, per-newsletter, recent pulses) |
| `GET /health`        | `{ "ok": true }` for liveness checks |

The dashboard at `/` shows the current list version, newsletter count, type
breakdown, server uptime, a filterable table of every newsletter, and a
**run analytics** section. Open it in a browser after deploying.

## Analytics

After each signup run the extension POSTs a **pulse** to `POST /api/pulse`.
Pulses are stored in a SQLite database (`better-sqlite3`).

The data is **strictly anonymous**. A pulse contains:

```json
{
  "installId": "<random UUID, generated once per install>",
  "extVersion": "0.3.0",
  "runAt": 1747000000000,
  "results": [ { "newsletter": "Platformer", "type": "substack", "status": "success" } ]
}
```

`status` is one of `success`, `error`, or anything else (bucketed as
`skipped`). **No email addresses, profiles, or other identifying data are
ever sent** — `installId` is a random UUID not linked to any person.

- Duplicate pulses (same `installId` + `runAt`) are ignored.
- A single pulse is capped at 500 results and a 64 KB body.

### Database persistence

The SQLite file lives in `$DB_DIR/analytics.db` (default `/app/db`), kept
separate from `data/` so it can be mounted as a volume without shadowing the
baked-in `newsletters.json`.

- **Plain Docker:** `docker-compose.yml` defines a named volume
  `analytics-db` → `/app/db`. Reset analytics with `docker compose down -v`.
- **Easypanel:** add a Volume Mount named `analytics-db` at `/app/db`
  (see the Easypanel deploy steps above).

`entrypoint.sh` chowns `$DB_DIR` to the `node` user on every start, so the
volume is writable whether Docker or Easypanel provisions it. `DB_DIR` can be
overridden via env if you need the DB somewhere else.

## Run locally

```sh
cd server
npm install
npm start            # http://localhost:3000/api/newsletters
```

## Deploy with plain Docker

```sh
cd server
docker compose up -d --build
```

The container restarts automatically (`restart: unless-stopped`). The
analytics DB persists in the named volume `analytics-db`.

## Deploy on Easypanel

Easypanel runs this as a Docker app and handles HTTPS for you.

1. **Create service** → *App*. Source: this GitHub repo, branch `main`.
2. **Build** → type *Dockerfile*. Since the server lives in a subfolder, set
   the **Build Path / context** to `server` (Dockerfile path `server/Dockerfile`).
3. **Mounts** → add a **Volume Mount** (not a bind mount):
   - **Name:** `analytics-db`
   - **Mount path:** `/app/db`

   This is what persists the SQLite database across redeploys.
4. **Environment** → `PORT=3000` (optional; it is the default).
5. **Domain** → add your domain; Easypanel issues a TLS cert automatically.
6. **Deploy.**

The container starts as root only long enough for `entrypoint.sh` to fix the
volume's ownership, then drops to the unprivileged `node` user — so the
volume is writable regardless of how Easypanel provisions it.

Update the newsletter list later by editing `data/newsletters.json` and
redeploying from Easypanel — analytics in the volume are untouched.

## Update the newsletter list

1. Edit `server/data/newsletters.json` — keep the `{ version, updatedAt, newsletters }` shape.
   Bump `version` and `updatedAt`.
2. Redeploy:

   ```sh
   docker compose up -d --build
   ```

The extension picks up the change within 24h (its cache TTL), or immediately
on browser restart.

> Alternative: uncomment the `volumes:` block in `docker-compose.yml` to mount
> `data/` into the container. Then editing the file on the host is enough —
> the server watches it and reloads within ~5s, no rebuild needed.

## HTTPS

Chrome may block plain-HTTP fetches from the extension, so the API needs TLS.

**On Easypanel** this is automatic — assign a domain to the service and
Easypanel issues and renews the certificate. Nothing else to do.

**On a plain VPS**, put it behind a reverse proxy that terminates TLS
(Caddy / nginx / Traefik). Example Caddy:

```
api.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Then set `API_BASE` in `lib/config.js` to `https://api.yourdomain.com`.

> The Docker image uses `node:20-slim` (Debian) so `better-sqlite3` installs
> from a prebuilt binary — no compiler toolchain needed.

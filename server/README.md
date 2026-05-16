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

| Route             | Purpose |
|-------------------|---------|
| `GET /`           | Status dashboard (HTML/CSS/JS, no build step) |
| `GET /api/status` | List metadata as JSON — version, count, type breakdown, etag, uptime |
| `GET /health`     | `{ "ok": true }` for liveness checks |

The dashboard at `/` shows the current list version, newsletter count, type
breakdown, when the list was last updated, server uptime, and a filterable
table of every newsletter. Open it in a browser after deploying.

## Run locally

```sh
cd server
npm install
npm start            # http://localhost:3000/api/newsletters
```

## Deploy on the VPS (Docker)

```sh
cd server
docker compose up -d --build
```

The container restarts automatically (`restart: unless-stopped`).

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

Chrome may block plain-HTTP fetches from the extension. Put this behind a
reverse proxy that terminates TLS (Caddy / nginx / Traefik). Example Caddy:

```
api.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Then set `API_URL` in `lib/remote.js` to `https://api.yourdomain.com/api/newsletters`.

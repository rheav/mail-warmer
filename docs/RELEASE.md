# Release checklist

## Extension

1. Bump the version in **both** `extension/manifest.json` (`version` and `version_name`) and the root `package.json` — only after the live check below. A minor never goes past `.99`.
2. `npm test` and `npm run build` (preflight, then `release/mailwarmer-<version>.zip`).
3. Live check in the shared Chrome: reload the unpacked `extension/`, open the side panel in English and in Português (`lang` in storage), add an email, run a signup against a local test form, and confirm the panel's network panel shows no request to any server.
4. `CHANGELOG.md` (developer notes) and `website/src/data/changelog.ts` (public, short).
5. Commit, then an annotated tag `vX.Y.Z` whose message is the release title.
6. Chrome Web Store: upload the zip. If permissions or data handling changed, update `docs/store/LISTING.md`, the privacy form and the site's privacy page first.

## Store images

Follow "Images" in `docs/store/LISTING.md`, then `npm run store-images`.

## Website

`cd website && npm run build`. The site is served at https://mail-warmer.rheav.dev (Cloudflare); https://mailwarmer.rheav.dev redirects to it.

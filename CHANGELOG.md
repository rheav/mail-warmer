# Changelog

All notable changes to Mail Warmer.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking storage schema / manifest permission changes.
- **MINOR** — new features (tabs, adapters, UI surfaces).
- **PATCH** — bug fixes, copy tweaks, default-list updates.

Bump `version` in `manifest.json` (and `version_name`) on every release.

---

## [0.4.0] — 2026-05-16

### Added
- **Cookies tab** (first tab) — cookie-profile warm-up. Opens a curated set of
  popular US websites in background tabs, auto-accepts each cookie-consent
  banner, then closes the tab. Builds a normal-looking cookie profile before
  newsletter signups run.
- `lib/cookie-sites.js` — curated 12-site US list (news, business, sports,
  tech, health), each picked for a dismissible consent dialog.
- `background/cookie-warmer.js` — orchestrator: paced background tabs, an
  injected accept-clicker covering OneTrust / Cookiebot / Quantcast / Didomi /
  generic consent platforms (selector + text-match, ~7s poll), all frames.
- Per-site checklist, progress bar, and last-warm-up summary in the sidepanel;
  result stored in `chrome.storage.local` as `cookieRun`.

---

## [0.3.0] — 2026-05-15

### Added
- **Sidepanel UI** replacing popup; 5 tabs: Run / Emails / Profile / Lists / Log.
- **Gmail design language** — Google Sans + Roboto, Material Symbols icons,
  Gmail color tokens, compose-style primary button, row hover, status pills.
- **Profile system** — 14 fields (name, age, dob, gender, address, company, etc.)
  stored in `chrome.storage.local`, used to fill non-email signup fields.
- **Fake profile auto-seed** on first install via `lib/fake-profile.js`
  (625 name combos × 10 location presets, 555-exchange fake phones).
- **Smart DOM detection** with honeypot avoidance:
  - CSS visibility + off-screen + clip + opacity checks
  - Hidden ancestor chain detection
  - `tabindex=-1`, `aria-hidden`, `readonly` disqualifiers
  - Honeypot-name list (Mailchimp `b_email`, `website`, `url`, `homepage`, etc.)
  - Positive scoring on `type=email`, autocomplete tokens, label text
- **Profile-aware field filling** — 13 rules for first/last/full name, age,
  DOB, gender, country/state/city/postal, phone, company, job title.
  React-compatible value injection (`HTMLInputElement.prototype.value` setter)
  fires `input`/`change`/`blur` events for framework forms.
- **Select / radio / checkbox handling** — fuzzy value or label match,
  safe-default for required selects.
- **Per-newsletter selector overrides** — UI editor with email + submit +
  per-field CSS selectors. ★ badge on rows with overrides.
- **Iframe-aware execution** — `webNavigation` permission; injects filler
  into all frames, asks each in order (top first, deepest-URL next), first
  success wins. Unblocks MailerLite / Beehiiv / Mailchimp embedded forms.
- **Custom-domain Substack support** — newsletter config accepts optional
  `host` field. Pubs that moved off `slug.substack.com` (slowboring.com,
  noahpinion.blog, oneusefulthing.org, pragmaticengineer.com, etc.) now work.
- **Versioning + changelog** — this file + manifest `version_name`.

### Changed
- Default newsletter list re-curated: 20 entries, mostly Substack on
  custom domains. Removed pubs that 404'd or are invite-only.
- Run pacing: 2.5–5.5s jittered delay between signups to look organic.
- Per-frame content-script timeout: 8s (was implicit 25s for whole tab).
- Logo lives at `public/logo.png`; manifest wires it as toolbar + management icon.

### Storage schema
```
emails:        [{ id, address, label, addedAt }]
activeEmailId: string | null
newsletters:   [{ id, name, type, slug?, host?, url?, selectors?, source }]
history:       { [`${emailId}:${newsletterId}`]: { status, at, message? } }
log:           [{ at, level, message }]   (capped at 500)
profile:       { firstName, lastName, fullName, age, dob, gender,
                 country, state, city, postalCode, phone,
                 company, jobTitle, website }
```

---

## [0.2.0] — 2026-05-14

### Added
- Smart form-filler content script with honeypot detection (initial version).
- Generic form-type newsletter support via tab injection.
- Activity log + signup history per (email, newsletter) pair.

---

## [0.1.0] — 2026-05-14

### Added
- Initial MV3 extension scaffolding.
- Popup UI with email config + newsletter list.
- Substack-only adapter (`POST /api/v1/free`).
- Curated default list of 16 newsletters.

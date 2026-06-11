# mailWarmer — Landing Page Design System

Design language for the mailWarmer marketing site. Adapted from the youZen
Astro landing (soft analog atmosphere, pure-CSS "html gif" feature loops),
re-skinned to mailWarmer's **Gmail-blue** brand with **warm-peach** accents
pulled from the logo.

> **Core idea inherited from youZen:** nothing on this page is a video. Every
> product demo is a *real CSS state machine* looping live — toggles flip,
> forms fill, inboxes warm. Cheap to ship, never buffers, scales crisp.

---

## 1. Brand foundations

### Palette (Gmail-blue primary + warm logo accents)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-canvas` | `#f6f8fc` | Page background (Gmail page bg) |
| `--color-surface` | `#ffffff` | Cards, mock windows |
| `--color-surface-alt` | `#f1f3f4` | Chips, hovered rows |
| `--color-blue` | `#1a73e8` | **Primary accent** — CTAs, links, active state |
| `--color-blue-hover` | `#1765cc` | Hover |
| `--color-blue-bg` | `#e8f0fe` | Tinted blue surfaces, pills |
| `--color-ink` | `#202124` | Headings, body |
| `--color-muted` | `#5f6368` | Secondary text |
| `--color-faint` | `#80868b` | Tertiary / meta |
| `--color-warm-1` | `#ffe0c2` | Logo gradient top — warm accents |
| `--color-warm-2` | `#ffb9a8` | Logo gradient bottom — **warm accent** |
| `--color-warm-ink` | `#5a4a4e` | Logo stroke — warm-tinted deep text |
| `--color-green` | `#137333` / bg `#e6f4ea` | Success status |
| `--color-red` | `#c5221f` / bg `#fce8e6` | Error status |
| `--color-yellow` | `#b06000` / bg `#feefc3` | Running status |

**Rule:** Blue carries action and trust (matches the in-product Gmail-style
sidepanel). Peach/coral is reserved for *warmth moments* — the logo, the
"inbox staying warm" demo, the cursive accent word, ambient steam. Never let
peach compete with blue for the CTA.

### Typography

- **Sans:** `Outfit Variable` (geometric, close to Google Sans). Headings
  `font-weight: 500`, `letter-spacing: -0.025em`, `line-height: 1.05`.
- **Accent display:** `Fraunces Variable` *italic* — one highlighted word per
  heading (`.accent-word`), painted with an **animated warm gradient**
  (coral→peach, `background-clip: text`, slow left↔right shift). Soft serif
  warmth pairs with Outfit; replaces the old flat-peach cursive. Gradient
  technique borrowed from the unfunnelizer site's `animated-gradient-text`.
- Body `line-height: 1.6`, color `--color-ink`.

### Logo
The mark is the Gmail-style coral envelope at `/logo.png` (shared by the
extension icon, the favicon, and the site's `LogoMark`). Single source of
truth — no separate SVG to drift.

### Texture & depth

- **Grain overlay:** fixed full-viewport SVG fractal-noise, `mix-blend-mode:
  overlay`, opacity `0.30`. Same data-URI trick as youZen (zero network).
- **Shadows:** soft only. `--shadow-soft: 0 4px 20px -2px rgba(60,64,67,.10)`,
  `--shadow-soft-lg: 0 8px 32px -4px rgba(60,64,67,.12)`. Mirrors Gmail's
  `rgba(60,64,67,…)` shadow tint, not pure black.
- **Radii:** generous — cards `2rem`, mock window `14px`, pills `9999px`.

---

## 2. Ambient atmosphere

Replaces youZen's floating leaves with a **rising-warmth motif** taken from the
logo's heat waves — keeps the "alive, breathing" feel while saying *warmer*.

| Element | Spec |
|---------|------|
| **Breathing blobs** | 2–3 per section, `filter: blur(90px)`, radial-masked edges, 14–17s `blob-breathe` scale/translate loop. Tints: `--color-blue-bg`, `--color-warm-1`, soft lavender `#eef2fb`. |
| **Floating steam** | 6–7 fixed wisps drifting bottom→top (`steam-rise` keyframe), warm-tinted, opacity ≤0.18, `z-index:5`, behind content. Replaces `FloatingLeaves`. |
| **Warmth burst** | On primary-CTA + nav-link hover, emit a few rising warm puffs (the youZen `leaf-burst` analog). Single shared script in `Layout.astro`. |
| **Reveal-on-scroll** | `.reveal` → `translateY(30px)` + fade, IntersectionObserver, staggered children via `.reveal-group`. |

**Every** animation must collapse under `@media (prefers-reduced-motion: reduce)`
— blobs/steam/bursts off, reveals forced visible, demos frozen at clean state.

---

## 3. Page structure (section flow)

```
Layout (grain + steam + burst script)
 └ Navbar          floating pill, blue "Add to browser" CTA
 └ Hero            headline w/ cursive "warm", dual CTA, trust line
 └ Scenarios       timeline of "the inbox goes cold" story
 └ AppPreview      ★ BIG html-gif: auto-subscribe sidepanel mock (12s loop)
 └ FeatureDemos    ★ 3 html-gif cards: cookie warm-up · inbox warming · status grid
 └ ClosingCTA      final warm nudge, single CTA
 └ FAQ             accordion, smooth height animation
 └ Footer          logo + links
```

### Hero copy direction
- Eyebrow pill: blue dot + "Keep every inbox alive".
- Headline: `Inbox that stays` **`warm`** `, not forgotten.` (cursive on "warm").
- Sub: one line on auto-subscribing emails to curated newsletters so inboxes
  stay active. Trust line: `Free · no account · no inbox access · open source`.

### Scenarios (the cold-inbox story)
6 timestamped cards (reuse youZen's sticky-heading + card-grid layout), e.g.
"A fresh Gmail, zero mail." → "Weeks pass, the inbox looks abandoned." →
"Deliverability score drops." → "Important mail lands in spam." → ending on
"Tomorrow, it could stay warm." Accent dots ramp peach→blue.

---

## 4. The "html gifs" (pure-CSS demo loops)

All four are **zero-JS**, looping CSS keyframe state machines. Class prefixes
keep them isolated (`.ap-*` big mock, `.fd-*` cards). Each pauses ~40% of its
loop in the clean/resolved state. Staggered start so they never beat in unison.

### 4A. AppPreview — auto-subscribe (★ the hero demo)

A macOS-Chrome window docked next to the **mailWarmer sidepanel** (rebuild the
real sidepanel: blue compose button, nav rail, newsletter checklist with status
pills). 12s synchronized loop:

```
t=0.0s  Idle. Newsletter list shows 3 rows, all "pending" pills.
t=1.0s  "Run" (blue compose btn) presses → ripple.
t=1.3s  Row 1: pill pending→running (yellow), a signup-form card slides in
        on the page side, email auto-types into the field.
t=2.6s  Form submits → row 1 pill running→success (green check).
t=3.5s  Row 2 repeats (running→success).
t=5.5s  Row 3 repeats.
t=7.0s  Hold: all-green, toolbar badge shows "3".
t=10.5s Reset: pills fade back to pending.
t=12s   Loop.
```

Build notes:
- Page side = a faux newsletter signup page: header bar, hero, an email
  `<input>` mock whose value is "painted" by a width-growing highlight +
  a typed-caret pseudo-element (`ap-type` keyframe).
- Sidepanel reuses tokens from `sidepanel/sidepanel.css` (Gmail blue) so the
  marketing mock and the real product are visually identical.
- Toolbar-badge chip in the Chrome toolbar counts `0→1→2→3` (orange running →
  green done) — mirrors the real `manifest` action badge behavior.

### 4B. FeatureDemos card — Cookie warm-up

`.fd-stage` mini browser (corner traffic-dots). A column of 4 site rows; each
shows a cookie-banner bar that, in sequence, gets an "Accept" press → banner
collapses → a small green ✓ + tab closes. A counter pill top-right ticks up.
Loop 10s, freeze on "4 sites warmed".

### 4C. FeatureDemos card — Inbox staying warm (the emotional hook)

A mini inbox list. Starts **cold**: desaturated, empty, a faint "no new mail"
note, a small thermometer/temperature dot in cool gray-blue. Mid-loop,
newsletter rows **arrive** one by one (slide+fade in with sender avatars), the
thermometer dot shifts cool→`--color-warm-2`, and a soft warm glow blooms
behind the list. This is the one place peach takes center stage. Freeze warm.

### 4D. FeatureDemos card — Status tracking grid

A compact `email × newsletter` grid (3 emails × 4 newsletters = 12 cells).
Cells fill in a wave: `pending` (gray) → `running` (yellow pulse) → resolve to
`success` (green) with one `error` (red) for realism. Uses the exact status-pill
colors from `sidepanel.css`. Loop 10s, freeze on the filled grid.

> Note: the question picked all four demos. 4A is the large AppPreview; 4B–4D
> are the three FeatureDemos cards. If trimming to 3 cards is preferred, keep
> 4B + 4C + 4D and drop nothing — that's already three.

---

## 5. Components & interaction details

- **ChromeButton** (`Add to browser`): blue gradient `#1a73e8→#4285f4`, soft
  blue glow that grows on hover, diagonal shine sweep, browser icons
  (Chrome/Edge/Brave) with a tiny tilt on hover, fires warmth-burst. One CTA
  used in navbar (small), hero, closing.
- **Navbar:** fixed floating pill, `backdrop-blur`, white/72%. Links get a
  left→right underline wipe in blue; logo chip = the envelope SVG.
- **FAQ:** native `<details>` with JS-driven smooth height animation (open AND
  close), `+`→`×` icon rotate. Questions: data/privacy (no inbox access, local
  storage), no-setup/auto-updating list, Web Store cost, supported sites.
- **Secondary CTA:** "See it work" ghost button → scrolls to `#preview`.

---

## 6. Tech

- **Astro 5** + **Tailwind v4** (`@theme` tokens) + `@lucide/astro` icons +
  `@fontsource-variable/outfit` & `caveat`. Mirrors youZen's stack so the
  component patterns port directly.
- One global stylesheet (`src/styles/global.css`) holds tokens, grain, blobs,
  steam, reveal, shadows, reduced-motion guard.
- Per-component scoped `<style is:global>` for the `.ap-*` / `.fd-*` demo
  machines (kept prefixed so they can't leak).

---

## 7. Token cheat-sheet (drop into `@theme`)

```css
--color-canvas:#f6f8fc; --color-surface:#fff; --color-surface-alt:#f1f3f4;
--color-blue:#1a73e8; --color-blue-hover:#1765cc; --color-blue-bg:#e8f0fe;
--color-ink:#202124; --color-muted:#5f6368; --color-faint:#80868b;
--color-warm-1:#ffe0c2; --color-warm-2:#ffb9a8; --color-warm-ink:#5a4a4e;
--color-green:#137333; --color-green-bg:#e6f4ea;
--color-red:#c5221f;   --color-red-bg:#fce8e6;
--color-yellow:#b06000;--color-yellow-bg:#feefc3;
--font-outfit:"Outfit Variable",system-ui,sans-serif;
--font-accent:"Fraunces Variable",Georgia,serif; /* italic, gradient-clipped */
```

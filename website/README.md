# mailWarmer — landing page

Astro + Tailwind v4 marketing site for the mailWarmer extension.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # serve the built site
```

## What's here

- **`design.md`** — the design system: palette, type, atmosphere, and specs for
  every "html gif" demo loop. Read this first.
- **`src/components/AppPreview.astro`** — the big pure-CSS auto-subscribe demo
  (Chrome window + mailWarmer sidepanel, 12s synchronized loop).
- **`src/components/FeatureDemos.astro`** — three smaller CSS demo cards: cookie
  warm-up, inboxes-staying-warm, status grid.
- Everything is zero-JS animation (CSS keyframes) and respects
  `prefers-reduced-motion` (each demo freezes at its resolved state).

## Brand

Gmail-blue primary (`#1a73e8`, matches the in-product sidepanel) with warm
peach/coral accents from the logo (`#ffb9a8`). Tokens live in
`src/styles/global.css` under `@theme`.

/**
 * Chrome Web Store asset config for Mail Warmer.
 *
 * Run from the repo root (after `cd website && npm run build`):
 *   node ../../tools/store-shots/src/index.mjs store-shots.config.mjs
 *
 * Scenes capture the real product UI from the built marketing site. Each is
 * frozen to its resolved state via reduced-motion, then composited into a
 * branded 1280×800 frame. Output lands in ./store-assets.
 */

const here = new URL(".", import.meta.url).pathname;

export default {
  // Static site to capture (built output). Served on an ephemeral localhost.
  staticDir: "website/dist",

  brand: {
    name: "Mail Warmer",
    bg: "linear-gradient(135deg,#e8f0fe 0%,#ffffff 46%,#ffe4cf 100%)",
    accent: "#1a73e8",
    ink: "#202124",
    logo: here + "website/public/logo.png",
  },

  tagline: "Keep every inbox alive & valid",
  subtagline: "Free · open source · no account",

  // 128×128 store-icon export + source-size check.
  icon: here + "website/public/logo.png",

  outputs: {
    dir: "store-assets",
    tile: true,
    marquee: true,
  },

  // Desktop viewport for element capture; reduced-motion freezes loops.
  shots: [
    {
      id: "01-inbox-fills",
      type: "element",
      url: "/",
      selector: ".ap-window",
      reducedMotion: true,
      viewport: { width: 1440, height: 1000 },
      hero: true,
      caption: "Confirmations land as your inboxes warm up",
      subcaption: "Auto-subscribe to real newsletters — your inbox stays active",
    },
    {
      id: "02-why-it-matters",
      type: "element",
      url: "/",
      selector: "#scenarios ol",
      reducedMotion: true,
      viewport: { width: 1440, height: 1100 },
      caption: "A quiet inbox is a dying inbox",
      subcaption: "Dormant accounts get flagged, limited, or locked",
    },
    {
      id: "03-three-things",
      type: "element",
      url: "/",
      selector: "#features .grid",
      reducedMotion: true,
      viewport: { width: 1440, height: 1100 },
      caption: "Quiet work that keeps inboxes alive",
      subcaption: "Warm-up · staying active · full result tracking",
    },
  ],
};

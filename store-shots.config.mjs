/**
 * Chrome Web Store asset config for Mail Warmer.
 *
 * Captures the REAL extension sidepanel (loaded unpacked in Playwright),
 * seeded to a finished-run state, across the Run / Cookies / Log tabs. Each
 * panel is composited into a branded 1280×800 frame. Output → store-assets/mailwarmer.
 *
 * Run from the repo root:
 *   node ../../tools/store-shots/src/index.mjs store-shots.config.mjs
 *
 * Note: loading an extension needs a headed/--headless=new browser (handled
 * by the runner). Works locally; in CI wrap with `xvfb-run`.
 */

const here = new URL(".", import.meta.url).pathname; // repo root (the unpacked extension)
const now = Date.now();

// A believable finished run: one inbox, five newsletters, four done + one failed.
const seed = {
  emails: [
    { id: "e1", address: "warm.inbox@gmail.com", label: "Warm inbox", addedAt: now },
  ],
  activeEmailId: "e1",
  newsletters: [
    { id: "n1", name: "The Daily Brief", type: "substack", slug: "thedailybrief", source: "default" },
    { id: "n2", name: "Morning Roast", type: "substack", slug: "morningroast", source: "default" },
    { id: "n3", name: "Tech in Five", type: "substack", slug: "techinfive", source: "default" },
    { id: "n4", name: "Lenny's Newsletter", type: "substack", slug: "lennysnewsletter", source: "default" },
    { id: "n5", name: "Platformer", type: "substack", slug: "platformer", source: "default" },
  ],
  history: {
    "e1:n1": { status: "success", at: now },
    "e1:n2": { status: "success", at: now },
    "e1:n3": { status: "success", at: now },
    "e1:n4": { status: "success", at: now },
    "e1:n5": { status: "error", at: now, message: "No signup form found" },
  },
};

export default {
  brand: {
    name: "Mail Warmer",
    // Gentle single-hue blue gradient (ray.so style): light sky → periwinkle.
    bg: "linear-gradient(125deg,#aecbf5 0%,#88abee 48%,#7791e2 100%)",
    accent: "#1a73e8",
    ink: "#202124",
    onBg: "#ffffff", // text colour over the blue background
    glowA: "#cfe1fb", // soft light-blue sheen (top-left)
    glowB: "#9fb8ee", // soft periwinkle (bottom-right)
    chrome: true, // wrap the sidepanel in a macOS window card (kills the "phone" look)
    logo: here + "public/logo.png",
  },

  tagline: "Keep every inbox alive & valid",
  subtagline: "Free · open source · no account",
  icon: here + "public/logo.png",

  outputs: {
    dir: "store-assets/mailwarmer",
    prefix: "mailwarmer",
    tile: true,
    marquee: true,
    screenshotLayout: "split", // two-column: big text | windowed sidepanel
  },

  // Shared extension setup for every scene.
  extension: {
    dist: here,
    page: "sidepanel/sidepanel.html",
    viewport: { width: 412, height: 760 },
    seed,
  },

  shots: [
    {
      id: "run",
      type: "extension",
      scale: 3,
      hero: true,
      side: "right", // text left · panel right
      clicks: ['[data-tab="run"]'],
      caption: "Subscribe an inbox in one click",
      subcaption: "Pick newsletters, hit Run — every result tracked live",
    },
    {
      id: "cookies",
      type: "extension",
      scale: 3,
      side: "left", // panel left · text right
      clicks: ['[data-tab="cookies"]'],
      caption: "Warm up the browser first",
      subcaption: "Accepts cookie banners so the profile looks lived-in",
    },
    {
      id: "log",
      type: "extension",
      scale: 3,
      side: "right", // text left · panel right
      clicks: ['[data-tab="log"]'],
      seed: {
        log: [
          { at: now, level: "info", message: "Run started · warm.inbox@gmail.com" },
          { at: now, level: "success", message: "Subscribed · The Daily Brief" },
          { at: now, level: "success", message: "Subscribed · Morning Roast" },
          { at: now, level: "success", message: "Subscribed · Tech in Five" },
          { at: now, level: "success", message: "Subscribed · Lenny's Newsletter" },
          { at: now, level: "error", message: "No signup form found · Platformer" },
          { at: now, level: "info", message: "Run finished · 4 of 5 subscribed" },
        ],
      },
      caption: "See exactly what happened",
      subcaption: "A clear, time-stamped log of every signup",
    },
  ],
};

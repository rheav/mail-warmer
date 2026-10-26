// Renders the Chrome Web Store images from the raw side-panel captures
// (docs/store/raw/<lang>/<id>.png, 400×760 CSS px at 2×) with headless
// Chrome — no npm dependencies. Same frame as unFunnelizer's store kit:
// caption left, panel right, blue gradient with a dot grid.
//
//   npm run store-images
//
// Output: docs/store/screenshots/<lang>/<n>.png (1280×800),
// promo-tile-440x280.png and marquee-1400x560.png per language.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = process.env.RAW_DIR || join(ROOT, 'docs/store/raw');
const OUT = process.env.OUT_DIR || join(ROOT, 'docs/store/screenshots');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`;
const logo = dataUri(join(ROOT, 'extension/public/logo.png'), 'image/png');
const fontFile = join(ROOT, 'website/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2');
const font = existsSync(fontFile)
  ? `@font-face{font-family:Outfit;font-weight:100 900;src:url(${dataUri(fontFile, 'font/woff2')}) format("woff2")}`
  : ''; // without website/node_modules the frame falls back to the system font

// [raw capture id, title, subtitle]
const COPY = {
  en: [
    ['run', 'Keep every inbox warm', 'Pick newsletters, hit Run — every signup is tracked per inbox.'],
    ['cookies', 'Warm up the browser first', 'Visits well-known sites and accepts their cookie banners, so the profile looks lived-in.'],
    ['emails', 'As many inboxes as you need', 'Add every address you want to keep active and switch with one click.'],
    ['profile', 'Fills the extra fields for you', 'Name, city, company: a believable profile for forms that ask for more than an email.'],
    ['log', 'See exactly what happened', 'A time-stamped log of every signup and every warm-up.'],
    ['lists', 'No server. No account.', 'The curated list ships inside the extension. Add your own — nothing is ever sent to us.'],
  ],
  'pt-BR': [
    ['run', 'Mantenha cada caixa aquecida', 'Escolha as newsletters, clique em Fazer inscrições e acompanhe cada uma por e-mail.'],
    ['cookies', 'Aqueça o navegador antes', 'Visita sites conhecidos e aceita os avisos de cookies para o perfil parecer de uso real.'],
    ['emails', 'Quantas caixas você precisar', 'Adicione todos os endereços que quer manter ativos e troque com um clique.'],
    ['profile', 'Preenche os campos extras', 'Nome, cidade, empresa: um perfil crível para formulários que pedem mais que o e-mail.'],
    ['log', 'Veja exatamente o que aconteceu', 'Um registro com horário de cada inscrição e de cada aquecimento.'],
    ['lists', 'Sem servidor. Sem conta.', 'A lista selecionada vem dentro da extensão. Adicione as suas — nada é enviado para nós.'],
  ],
};
const PROMO = {
  en: 'Keeps your inboxes active with real newsletters.',
  'pt-BR': 'Mantém suas caixas de e-mail ativas com newsletters reais.',
};

const css = (w, h) => `${font}
  *{box-sizing:border-box;margin:0}
  body{width:${w}px;height:${h}px;overflow:hidden;position:relative;color:#fff;
    font-family:Outfit,"Avenir Next",Helvetica,sans-serif;
    background:radial-gradient(circle at 88% 92%,rgba(255,185,168,.55),transparent 42%),
      linear-gradient(135deg,#1558c9 0%,#1a73e8 45%,#5e9bf2 100%)}
  .dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1px);background-size:22px 22px;opacity:.5}
  .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:22px;opacity:.95}
  .brand img{width:36px;height:36px}
  .shot{position:absolute;border-radius:16px;overflow:hidden;background:#fff;
    box-shadow:0 30px 70px rgba(10,30,80,.45),0 0 0 1px rgba(255,255,255,.35)}
  .shot img{display:block;width:100%}`;

const screenshotHtml = (title, sub, panel) => `<html><head><meta charset="utf-8"><style>${css(1280, 800)}
  .cap{position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;gap:18px}
  h1{font-weight:800;font-size:50px;line-height:1.05;letter-spacing:-.02em}
  p{font-size:22px;line-height:1.4;opacity:.92}
  .shot{right:150px;top:40px;width:400px;height:720px}
</style></head><body><div class="dots"></div>
  <div class="cap"><div class="brand"><img src="${logo}">mailWarmer</div><h1>${title}</h1><p>${sub}</p></div>
  <div class="shot"><img src="${panel}"></div></body></html>`;

const promoHtml = (w, h, big, text, panel) => `<html><head><meta charset="utf-8"><style>${css(w, h)}
  .c{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 ${big ? 90 : 30}px;gap:${big ? 20 : 10}px}
  .b{display:flex;align-items:center;gap:${big ? 16 : 10}px;font-weight:800;font-size:${big ? 56 : 30}px}
  .b img{width:${big ? 72 : 42}px;height:${big ? 72 : 42}px}
  .t{font-size:${big ? 34 : 18}px;line-height:1.25;font-weight:600;max-width:${big ? 700 : 380}px;opacity:.95}
  .shot{right:90px;top:60px;width:400px;height:${h - 120}px}
</style></head><body><div class="dots"></div>
  <div class="c"><div class="b"><img src="${logo}">mailWarmer</div><div class="t">${text}</div></div>
  ${big ? `<div class="shot"><img src="${panel}"></div>` : ''}</body></html>`;

const profile = mkdtempSync(join(tmpdir(), 'mw-render-'));
function render(html, out, w, h) {
  const page = join(profile, 'page.html');
  writeFileSync(page, html);
  execFileSync(CHROME, [
    '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-gpu',
    `--user-data-dir=${join(profile, 'chrome')}`, '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${out}`, `file://${page}`,
  ], { stdio: 'ignore' });
}

try {
  for (const [lang, items] of Object.entries(COPY)) {
    mkdirSync(join(OUT, lang), { recursive: true });
    const raw = (id) => dataUri(join(RAW, lang, `${id}.png`), 'image/png');
    items.forEach(([id, title, sub], i) => {
      render(screenshotHtml(title, sub, raw(id)), join(OUT, lang, `${i + 1}.png`), 1280, 800);
    });
    render(promoHtml(440, 280, false, PROMO[lang]), join(OUT, lang, 'promo-tile-440x280.png'), 440, 280);
    render(promoHtml(1400, 560, true, PROMO[lang], raw('run')), join(OUT, lang, 'marquee-1400x560.png'), 1400, 560);
    console.log(`${lang}: ${items.length} screenshots, tile, marquee`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}

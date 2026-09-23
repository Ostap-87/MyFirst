// Renders one specimen PNG per font in catalog.json (previews/<slug>.png)
// plus one combined contact-sheet gallery (previews/gallery.png) for fast visual browsing.
//
// Usage: node font-library/scripts/render-previews.mjs
//
// Requires Playwright with a local Chromium (already configured project-wide
// via PLAYWRIGHT_BROWSERS_PATH) — no network fetch of fonts happens here,
// everything loads from the local files in font-library/fonts/.

import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

// playwright is installed globally in this environment, not per-project —
// resolve it explicitly instead of requiring a local node_modules copy.
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog.json'), 'utf-8'));

const SAMPLE_HEADLINE = 'Технологии будущего';
const SAMPLE_BODY = 'Съешь ещё этих мягких французских булок 0123456789';

function fontFaceCss(font) {
  return font.weights
    .map(
      (w) => `
    @font-face {
      font-family: '${font.family}';
      src: url('file://${path.join(ROOT, w.file)}');
      font-weight: ${w.weight};
    }`
    )
    .join('\n');
}

function cardHtml(font) {
  const boldWeight = font.weights[font.weights.length - 1].weight;
  return `
  <style>
    ${fontFaceCss(font)}
    body { margin: 0; background: #ffffff; }
    .card {
      width: 900px; padding: 40px 48px; box-sizing: border-box;
      font-family: system-ui, sans-serif;
    }
    .meta { color: #6b6b76; font-size: 15px; margin-bottom: 18px; }
    .meta b { color: #17171d; }
    .headline {
      font-family: '${font.family}'; font-weight: ${boldWeight};
      font-size: 56px; color: #17171d; line-height: 1.15; margin: 0 0 14px 0;
    }
    .body { font-family: '${font.family}'; font-weight: ${font.weights[0].weight};
      font-size: 24px; color: #17171d; margin: 0;
    }
    .tags { margin-top: 18px; }
    .tag {
      display: inline-block; font-family: system-ui, sans-serif; font-size: 13px;
      color: #2563eb; background: #eeeef2; border-radius: 999px;
      padding: 4px 12px; margin-right: 6px;
    }
  </style>
  <div class="card">
    <div class="meta"><b>${font.family}</b> — ${font.category} · ${font.cyrillic ? 'кириллица есть' : 'только латиница'} · ${font.license}</div>
    <p class="headline">${SAMPLE_HEADLINE}</p>
    <p class="body">${SAMPLE_BODY}</p>
    <div class="tags">${font.mood.map((m) => `<span class="tag">${m}</span>`).join('')}</div>
  </div>`;
}

async function main() {
  mkdirSync(path.join(ROOT, 'previews'), { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 260 } });

  for (const font of catalog.fonts) {
    // Chromium blocks @font-face file:// loads from an opaque (about:blank/
    // data:) origin, so write real HTML to disk and navigate to it via
    // file:// — same-origin file access then works.
    const tmpHtml = path.join(ROOT, 'previews', `.tmp-${font.slug}.html`);
    writeFileSync(tmpHtml, cardHtml(font));
    await page.goto(`file://${tmpHtml}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const card = await page.$('.card');
    const outPath = path.join(ROOT, 'previews', `${font.slug}.png`);
    await card.screenshot({ path: outPath });
    unlinkSync(tmpHtml);
    console.log(`rendered ${font.slug} -> previews/${path.basename(outPath)}`);
  }

  await browser.close();
  console.log('Done. Run scripts/build-gallery.mjs next to stitch a contact sheet.');
}

main();

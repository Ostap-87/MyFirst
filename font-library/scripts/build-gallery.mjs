// Stitches all fonts into one contact-sheet PNG (previews/gallery.png) by
// rendering all cards on a single page — so browsing the whole library, or
// a filtered slice of it, is one image instead of 16 separate files.
//
// Usage:
//   node font-library/scripts/build-gallery.mjs                        -> previews/gallery.png (all fonts)
//   node font-library/scripts/build-gallery.mjs display-serif editorial-serif
//                                                                       -> previews/gallery-filtered.png
//   node font-library/scripts/build-gallery.mjs handwritten-script bad-script
//                                                                       (category or slug both match)

import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

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
    @font-face { font-family: '${font.family}'; src: url('file://${path.join(ROOT, w.file)}'); font-weight: ${w.weight}; }`
    )
    .join('\n');
}

function cardHtml(font) {
  const boldWeight = font.weights[font.weights.length - 1].weight;
  return `
    <div class="card">
      <div class="meta"><b>${font.family}</b> — ${font.category} · ${font.cyrillic ? 'кириллица есть' : 'только латиница'} · ${font.license}</div>
      <p class="headline" style="font-family:'${font.family}';font-weight:${boldWeight}">${SAMPLE_HEADLINE}</p>
      <p class="body" style="font-family:'${font.family}';font-weight:${font.weights[0].weight}">${SAMPLE_BODY}</p>
      <div class="tags">${font.mood.map((m) => `<span class="tag">${m}</span>`).join('')}</div>
    </div>`;
}

function pageHtml(fonts) {
  return `<html><head><style>
    ${fonts.map(fontFaceCss).join('\n')}
    body { margin: 0; background: #ffffff; font-family: system-ui, sans-serif; }
    .card { width: 900px; padding: 24px 32px; box-sizing: border-box; border-bottom: 1px solid #eeeef2; }
    .meta { color: #6b6b76; font-size: 14px; margin-bottom: 14px; }
    .meta b { color: #17171d; }
    .headline { font-size: 48px; color: #17171d; line-height: 1.15; margin: 0 0 12px 0; }
    .body { font-size: 20px; color: #17171d; margin: 0; }
    .tags { margin-top: 14px; }
    .tag { display: inline-block; font-size: 12px; color: #2563eb; background: #eeeef2; border-radius: 999px; padding: 4px 12px; margin-right: 6px; }
  </style></head><body>
    ${fonts.map(cardHtml).join('\n')}
  </body></html>`;
}

async function main() {
  const filters = process.argv.slice(2);
  const fonts = filters.length
    ? catalog.fonts.filter((f) => filters.includes(f.category) || filters.includes(f.slug))
    : catalog.fonts;

  if (fonts.length === 0) {
    console.error('No fonts matched filters:', filters);
    process.exit(1);
  }

  mkdirSync(path.join(ROOT, 'previews'), { recursive: true });
  const outName = filters.length ? 'gallery-filtered.png' : 'gallery.png';
  const outPath = path.join(ROOT, 'previews', outName);
  const tmpHtml = path.join(ROOT, 'previews', '.tmp-gallery.html');
  writeFileSync(tmpHtml, pageHtml(fonts));

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await page.goto(`file://${tmpHtml}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  unlinkSync(tmpHtml);

  console.log(`Built ${outPath} with ${fonts.length} font(s): ${fonts.map((f) => f.slug).join(', ')}`);
}

main();

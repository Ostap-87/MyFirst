// Презентация в PDF: HTML-слайды 1920×1080 → PNG каждого слайда + deck.pdf (Chromium, печать фонов).
// Запуск: node scripts/deck-render.cjs deck/<файл>.html out/deck/<имя>
// Слайды — секции .slide; шрифты и картинки — относительными путями из public/.
const puppeteer = require('/root/.npm/_npx/702923228c2ce1e6/node_modules/puppeteer-core');
const fs = require('fs'), path = require('path');
const [html, outDir] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'], headless: true, defaultViewport: { width: 1920, height: 1080 } });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(html), { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 500));
  const n = await p.evaluate(() => document.querySelectorAll('.slide').length);
  for (let i = 0; i < n; i++) {
    const el = (await p.$$('.slide'))[i];
    await el.screenshot({ path: path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await p.pdf({ path: path.join(outDir, 'deck.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  console.log('slides', n); await b.close();
})();

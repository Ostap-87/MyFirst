// Запись экрана личного сайта ostapdotcenko.ru в реальном времени (CDP-скринкаст):
// главная — герой, прокрутка по секциям «Обо мне», «Карьера», «Результаты» —
// клик «Блог» в шапке — прокрутка списка статей. Итог 19 с, 1440×900.
// Запуск: node scripts/site-record-personal.cjs <папка>, затем
// python3 scripts/site-record-video.py <папка> — кадры в видео 30 к/с (screen.mp4).
const puppeteer = require('/root/.npm/_npx/702923228c2ce1e6/node_modules/puppeteer-core');
const fs = require('fs'); const path = require('path');
const outDir = process.argv[2]; const W = 1440, H = 900;
fs.mkdirSync(path.join(outDir, 'f'), { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--hide-scrollbars'], headless: true, defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  const frames = [], marks = [], cursor = [];
  const now = () => Date.now() / 1000;
  const mark = (name) => { marks.push({ name, t: now() }); console.log('MARK', name, frames.length); };
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `f/${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(outDir, file), Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp, scroll: f.metadata.scrollOffsetY });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  // плавная прокрутка с торможением на концах
  const scrollTo = (y, ms) => page.evaluate((y, ms) => new Promise((res) => {
    const y0 = window.scrollY, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, y0 + (y - y0) * e); if (k < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  }), y, ms);
  await page.goto('https://ostapdotcenko.ru/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  mark('home'); await wait(2000);
  await scrollTo(950, 2600); mark('about'); await wait(900);
  await scrollTo(3300, 2600); mark('career'); await wait(800);
  await scrollTo(5300, 2200); mark('results'); await wait(800);
  // клик по «Блог» в шапке
  const box = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find((e) => e.innerText.trim().toLowerCase() === 'блог' && e.getBoundingClientRect().width > 0); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  console.log('blog link', box);
  cursor.push({ t: now(), x: W / 2, y: H * 0.6, kind: 'from' });
  await wait(500); cursor.push({ t: now(), x: box.x, y: box.y, kind: 'to' });
  await page.mouse.move(box.x, box.y); await wait(500);
  mark('click-blog');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}), page.mouse.click(box.x, box.y)]);
  mark('blog'); await wait(1600);
  await scrollTo(1700, 3200); mark('blog-list'); await wait(1200);
  mark('end');
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ W, H, frames, marks, cursor }));
  console.log('frames', frames.length, 'sec', (frames.at(-1).t - frames[0].t).toFixed(1));
  await browser.close();
})();

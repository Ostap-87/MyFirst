// Запись экрана сайта в реальном времени: кадры CDP-скринкаста, метки
// Запуск: node scripts/site-record.cjs <ru|en> <папка> [mobile], затем
// python3 scripts/site-record-video.py <папка> — кадры в видео 30 к/с.
// puppeteer-core берётся из кэша npx (его ставит hyperframes), в зависимости
// проекта не добавлен. Прокси-сертификат должен быть в NSS: certutil -A
// -d sql:$HOME/.pki/nssdb -n ccr-agent-proxy -t C,, -i /root/.ccr/agent-proxy-ca.crt
// событий и путь курсора. Курсор рисуется в монтаже по этому пути —
// пошаговое движение настоящей мыши на тяжёлых страницах тормозило
// запись в десять раз. Настоящая мышь прыгает в точку наведения и клика,
// поэтому все hover-эффекты сайта живые.
// node record2.cjs <ru|en> <outDir> [mobile]
const puppeteer = require('/root/.npm/_npx/702923228c2ce1e6/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const [lang, outDir, mode] = process.argv.slice(2);
const P = lang === 'en' ? '/en' : '';
const T = lang === 'en'
  ? { catalog: 'Catalogue', exp: 'expeditions', ready: 'Ready expeditions', build: 'Build your own program', robo: 'Robotics', corp: 'corporate training', back: 'All expeditions' }
  : { catalog: 'Каталог', exp: 'экспедиции', ready: 'Готовые экспедиции', build: 'Собрать свою программу', robo: 'Робототехника', corp: 'корпоративное обучение', back: 'Все экспедиции' };
const mobile = mode === 'mobile';
const W = mobile ? 390 : 1440, H = mobile ? 844 : 900, DPR = mobile ? 2 : 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(path.join(outDir, 'f'), { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--hide-scrollbars'],
    headless: true,
    defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: mobile, hasTouch: mobile },
  });
  const page = await browser.newPage();
  if (mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
  const cdp = await page.createCDPSession();
  const frames = [], marks = [], cursor = [];
  const now = () => Date.now() / 1000;
  const mark = (name) => { marks.push({ name, t: now() }); console.log('MARK', name); };
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `f/${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(outDir, file), Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp, scroll: f.metadata.scrollOffsetY });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });

  let cx = W / 2, cy = H * 0.58;
  const moveTo = async (x, y, ms = 700) => {
    cursor.push({ t: now(), x: cx, y: cy, kind: 'from' });
    await wait(ms);
    cursor.push({ t: now(), x, y, kind: 'to' });
    cx = x; cy = y;
    await page.mouse.move(x, y);
  };
  const find = async (sel, text, exact = false) => {
    const test = (sel, text, exact) => [...document.querySelectorAll(sel)].find((e) => {
      const t = e.innerText.trim().toLowerCase(); const q = text.toLowerCase(); const r = e.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight && (exact ? t === q : t.includes(q));
    });
    await page.waitForFunction((sel, text, exact) => !!(new Function('sel', 'text', 'exact', `return (${'' + ((sel, text, exact) => [...document.querySelectorAll(sel)].find((e) => { const t = e.innerText.trim().toLowerCase(); const q = text.toLowerCase(); const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && (exact ? t === q : t.includes(q)); }))})(sel, text, exact)`))(sel, text, exact), { timeout: 15000 }, sel, text, exact)
      .catch(async () => { await page.screenshot({ path: path.join(outDir, 'err.png') }); });
    const box = await page.evaluate((sel, text, exact) => {
      const el = [...document.querySelectorAll(sel)].find((e) => { const t = e.innerText.trim().toLowerCase(); const q = text.toLowerCase(); const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && (exact ? t === q : t.includes(q)); });
      if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel, text, exact);
    void test;
    if (!box) throw new Error(`нет элемента ${sel} «${text}» на ${page.url()}`);
    return box;
  };
  const hoverEl = async (sel, text, ms = 700, exact = false) => { const b = await find(sel, text, exact); await moveTo(b.x, b.y, ms); return b; };
  const click = async () => { cursor.push({ t: now(), x: cx, y: cy, kind: 'click' }); await page.mouse.down(); await wait(80); await page.mouse.up(); };
  const scrollBy = async (dy, ms) => { await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), dy); await wait(ms); };
  const nav = () => page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  await page.goto('about:blank');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
  await wait(600);

  if (mobile) {
    // Страница программы по робототехнике с телефона: плавно вниз и обратно.
    await page.goto(`https://globaltechtour.ru${P}/expeditions/robotics-expedition`, { waitUntil: 'domcontentloaded' });
    await wait(4000);
    mark('m-start');
    await scrollBy(700, 2600);
    await scrollBy(700, 2600);
    await scrollBy(-900, 2600);
    mark('m-end');
  } else {
    mark('blank');
    await wait(900);
    mark('enter');
    await page.goto(`https://globaltechtour.ru${P}/`, { waitUntil: 'domcontentloaded' });
    mark('dom');
    await page.mouse.move(cx, cy);
    await wait(1500);
    mark('loaded');
    await moveTo(880, 460, 1500);
    await wait(1500);
    await moveTo(820, 560, 1200);
    await page.mouse.wheel({ deltaY: 300 });
    await wait(1400);
    mark('home-end');
    // ——— Каталог → карточки ———
    await page.evaluate(() => window.scrollTo(0, 0));
    await hoverEl('a', T.catalog, 800, true);
    mark('catalog-hover');
    await wait(500);
    await click(); await nav();
    mark('industries');
    await wait(1200);
    for (const [i, [x, y]] of [[300, 465], [720, 465], [1135, 465], [300, 568], [720, 568], [1135, 568]].entries()) {
      await moveTo(x, y, 550); await wait(350); mark(`card-${i}`);
    }
    mark('industries-end');
    // ——— Экспедиции → Robotics → маршрут ———
    await hoverEl('button', T.exp, 800, true);
    await wait(300); await click(); await wait(600);
    mark('menu-open');
    await hoverEl('a', T.ready, 500, true);
    await wait(300); await click(); await nav();
    mark('expeditions');
    await wait(1300);
    await hoverEl('a', 'Robotics Expedition', 800);
    await wait(700); await click(); await nav();
    mark('robo');
    await wait(2000);
    await scrollBy(480, 1300);
    mark('map');
    for (const [i, [x, y]] of [[480, 400], [600, 640], [560, 760]].entries()) {
      await moveTo(x, y, 800); await wait(1500); mark(`city-${i}`);
    }
    await scrollBy(300, 1500);
    mark('robo-end');
    // ——— Собрать свою программу ———
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await hoverEl('a', T.back, 700);
    await wait(250); await click(); await nav();
    await wait(1200);
    mark('expeditions-2');
    await hoverEl('a', T.build, 800, true);
    mark('build-hover');
    await wait(550); await click(); await nav();
    mark('build');
    await wait(1300);
    await hoverEl('button', T.robo, 800);
    await wait(500); await click();
    await wait(2000);
    mark('robo-companies');
    await moveTo(700, 600, 1000);
    await scrollBy(300, 1300);
    mark('build-end');
    // ——— Корпоративное обучение ———
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await hoverEl('a', T.corp, 800, true);
    await wait(300); await click(); await nav();
    mark('corp');
    await wait(1500);
    await scrollBy(560, 1400);
    mark('corp-cards');
    for (const [i, x] of [300, 720, 1135].entries()) { await moveTo(x, 420, 650); await wait(650); mark(`corp-${i}`); }
    await moveTo(300, 420, 800); await wait(300); await click(); await nav();
    mark('corp-huawei');
    await wait(2200);
  }
  mark('end');
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ W, H, DPR, frames, marks, cursor }, null, 1));
  console.log('FRAMES', frames.length);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

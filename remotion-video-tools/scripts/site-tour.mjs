#!/usr/bin/env node
// Промо сайта «по одному промпту»: озвучка + запись экрана → пропсы GTT-SiteTour.
//
//   npm run site-tour -- --lang ru      голос, раскладка, субтитры, пропсы
//   npm run site-tour -- --lang en
//
// Что на входе (public/local/promo/, вне git):
//   vo/<lang>-<N>.wav         реплики голосом владельца, N = 1…8 по блокам
//   <lang>/screen.mp4 + .json запись ноутбука: видео 30 к/с, метки и путь курсора
//   <lang>/phone.mp4  + .json запись телефона
//
// Что на выходе:
//   public/local/promo/<lang>/voice.wav      дорожка ровно под 60 с
//   public/captions/site-tour-<lang>.json    субтитры по этой дорожке
//   data/site-tour/<lang>.json               пропсы композиции
//
// ——— Почему блоки считаются от голоса, а не от промпта ———
//
// Промпт задаёт тайминги блоков (0:00–0:07 и т. д.), но текст в них не
// влезает: открывающая реплика — тридцать слов на семь секунд. Поэтому
// блоки идут друг за другом ровно по длине своих реплик, а темп реплик
// подбирается так, чтобы всё вместе заняло 60 секунд. Самый важный блок
// (экспедиции) ускоряется меньше остальных, финал — почти не ускоряется:
// в промпте он «чуть медленнее остального ролика».
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const lang = args.lang === "en" ? "en" : "ru";
const FPS = 30;
const TOTAL = 60;
const PUB = resolve(ROOT, "public");
const DIR = `local/promo/${lang}`;
const VO = "local/promo/vo";

// Какой дубль реплики брать (переделанные лежат с суффиксом b).
const TAKES = {
  ru: ["ru-1", "ru-2", "ru-3", "ru-4", "ru-5", "ru-6", "ru-7", "ru-8"],
  en: ["en-1b", "en-2b", "en-3", "en-4", "en-5", "en-6b", "en-7c", "en-8c"],
}[lang];
// Блоки: голова, главная, каталог, экспедиции, телефон, своя программа,
// корпоративное обучение, голова.
const KIND = ["head", "screen", "screen", "screen", "phone", "screen", "screen", "head"];
// Темп: null — общий, подбирается под 60 с; число — задан явно.
const RATE = [null, null, null, 1.08, null, null, null, 1.03];
const LEAD = 0.15, GAP = 0.12, TAIL = 0.45;

const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);

// ——— 1. Реплики: подрезать тишину и паузы ———
mkdirSync(resolve(PUB, DIR, "vo"), { recursive: true });
const lines = TAKES.map((take, i) => {
  const src = resolve(PUB, VO, `${take}.wav`);
  if (!existsSync(src)) fail(`Нет реплики ${src}`);
  const out = resolve(PUB, DIR, "vo", `${i + 1}.wav`);
  // Паузы внутри финала длиннее: перед «десять дней» нужна пауза.
  const keep = i === 7 ? 0.5 : 0.16;
  ff("-i", src, "-af",
    "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.05,areverse," +
    "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.08,areverse," +
    `silenceremove=stop_periods=-1:stop_duration=${keep}:stop_threshold=-38dB:detection=peak`,
    "-ar", "48000", "-ac", "1", out);
  return { out, raw: probe(out) };
});

// ——— 2. Темп под 60 секунд ———
const budget = TOTAL - LEAD - TAIL - GAP * (lines.length - 1);
const fixedSum = lines.reduce((a, l, i) => a + (RATE[i] ? l.raw / RATE[i] : 0), 0);
const freeRaw = lines.reduce((a, l, i) => a + (RATE[i] ? 0 : l.raw), 0);
const k = freeRaw / (budget - fixedSum);
if (k > 1.25) console.log(`  ! общий темп ×${k.toFixed(2)} — речь будет заметно быстрой`);
let t = LEAD;
const blocks = lines.map((l, i) => {
  const rate = RATE[i] ?? k;
  const dur = l.raw / rate;
  const b = { i: i + 1, kind: KIND[i], at: +t.toFixed(3), dur: +dur.toFixed(3), rate: +rate.toFixed(4), file: l.out };
  t += dur + GAP;
  return b;
});
// Блоки в кадре идут встык: последний тянется до конца ролика.
for (let i = 0; i < blocks.length; i++) {
  const next = blocks[i + 1];
  blocks[i].from = i === 0 ? 0 : blocks[i].at - GAP / 2;
  blocks[i].until = next ? next.at - GAP / 2 : TOTAL;
}

// ——— 3. Сборка голоса ———
const voice = resolve(PUB, DIR, "voice.wav");
{
  const inputs = blocks.flatMap((b) => ["-i", b.file]);
  const chains = blocks.map((b, i) => {
    let r = b.rate, tempo = [];
    while (r > 2) { tempo.push("atempo=2"); r /= 2; }
    tempo.push(`atempo=${r.toFixed(4)}`);
    return `[${i}:a]${tempo.join(",")},adelay=${Math.round(b.at * 1000)}|${Math.round(b.at * 1000)}[a${i}]`;
  });
  const mix = blocks.map((_, i) => `[a${i}]`).join("") +
    `amix=inputs=${blocks.length}:normalize=0,apad=whole_dur=${TOTAL},atrim=0:${TOTAL},loudnorm=I=-16:TP=-1.5:LRA=9[out]`;
  ff(...inputs, "-filter_complex", [...chains, mix].join(";"), "-map", "[out]", "-ar", "48000", "-ac", "2", voice);
}

// ——— 4. Субтитры ———
const capRel = `captions/site-tour-${lang}.json`;
execFileSync("node", ["scripts/transcribe.mjs", "--audio", voice, "--model", "medium", "--language", lang, "--out", resolve(PUB, capRel)], { cwd: ROOT, stdio: "ignore" });
{
  // Адрес сайта whisper пишет как слышит: «globaltektur.ru», «GlobalTekTour.ru».
  const caps = JSON.parse(readFileSync(resolve(PUB, capRel), "utf8"));
  // Названия компаний whisper пишет кириллицей на слух, «ё» не ставит.
  // Слова сверены со сценарием; правится только написание, не тайминг.
  const FIX = {
    ru: { "Куа-Вэй,": "Huawei,", "Альбаба,": "Alibaba,", "Сяуми": "Xiaomi", "жмете": "жмёте", "Разберем": "Разберём", "соберем": "соберём", "еще": "ещё", "имен,": "имён," },
    en: { "needed,": "needed.", "application": "From application" },
  }[lang];
  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    const lead = c.text.match(/^\s*/)[0];
    const word = c.text.trim();
    if (FIX[word]) c.text = lead + FIX[word];
    c.text = c.text.replace(/glob\S*\.ru/gi, "globaltechtour.ru");
    // После точки — с заглавной: whisper сливает две реплики в одну фразу.
    if (i > 0 && /[.?!]$/.test(caps[i - 1].text.trim())) c.text = c.text.replace(/^(\s*)(\p{Ll})/u, (_, sp, ch) => sp + ch.toUpperCase());
  }
  writeFileSync(resolve(PUB, capRel), JSON.stringify(caps, null, 2));
}

// ——— 5. Куски записи экрана под блоки ———
const rec = JSON.parse(readFileSync(resolve(PUB, DIR, "screen.json"), "utf8"));
const M = rec.marks;
const clicks = rec.cursor.filter((c) => c.kind === "click").map((c) => c.t);
// Клики по порядку: 0 каталог, 1 меню «Экспедиции», 2 «Готовые», 3 Robotics,
// 4 «Все экспедиции», 5 «Собрать свою программу», 6 карточка индустрии,
// 7 «Корпоративное обучение».
const C = (n) => clicks[n];
// В кадр идут только загруженные страницы: каждый кусок после перехода
// начинается с метки «…-ready», записанной через 3–5 с после загрузки.
const PLAN = {
  2: [[M.blank - 0.1, M.enter + 0.2], [M["home-ready"] - 0.2, M["home-ready"] + 3.4]],
  3: [[C(0) - 0.9, C(0) + 0.35], [M["industries-ready"], M["card-3"] + 0.4]],
  4: [[C(1) - 0.8, C(1) + 0.5], [C(2) - 0.6, C(2) + 0.3], [M["expeditions-ready"], C(3) + 0.35], [M["robo-ready"], M["city-2"] + 0.4]],
  6: [[C(5) - 1.2, C(5) + 0.35], [M["build-ready"], C(6) + 1.6]],
  7: [[C(7) - 1.3, C(7) + 0.3], [M["corp-ready"], M["corp-2"] + 0.6]],
};
// Планы камеры: [номер куска в блоке, секунда от его начала, приближение,
// точка на экране по ширине и высоте]. Блок начинается общим планом и за
// 0,7 с до конца отъезжает к нему же.
const ZOOM = {
  2: [[1, 0.4, 1.12, 0.5, 0.42]],
  3: [[1, 0.5, 1.42, 0.5, 0.64]],
  4: [[2, 0.2, 1.35, 0.3, 0.55], [3, 1.6, 1.62, 0.28, 0.52]],
  6: [[0, 0.1, 1.38, 0.33, 0.44], [1, 0.5, 1.4, 0.5, 0.62]],
  7: [[1, 1.8, 1.42, 0.5, 0.45]],
};
const screen = [];
const shots = [];
for (const [n, segs] of Object.entries(PLAN)) {
  const b = blocks[Number(n) - 1];
  const len = b.until - b.from;
  const total = segs.reduce((a, [s, e]) => a + (e - s), 0);
  let rate = total / len;
  // Медленнее ×0,8 запись не тянем — последний кусок удлиняется.
  if (rate < 0.8) { segs[segs.length - 1][1] += len * 0.8 - total; rate = 0.8; }
  rate = Math.min(rate, 1.9);
  let at = b.from;
  const starts = [];
  for (const [s, e] of segs) {
    const out = (e - s) / rate;
    starts.push(at);
    screen.push({ from: Math.round(at * FPS), to: Math.round((at + out) * FPS), rec: +s.toFixed(3), rate: +rate.toFixed(4) });
    at += out;
  }
  shots.push({ frame: Math.round(b.from * FPS), scale: 1, fx: 0.5, fy: 0.5 });
  for (const [seg, dt, scale, fx, fy] of ZOOM[n] ?? []) {
    shots.push({ frame: Math.round((starts[seg] + dt) * FPS), scale, fx, fy });
  }
  shots.push({ frame: Math.round((b.until - 0.8) * FPS), scale: 1, fx: 0.5, fy: 0.5 });
}
// Точки маршрута на карте — в кадрах ролика, по меткам записи.
const recToFrame = (tr) => {
  const s = screen.find((x) => tr >= x.rec && tr <= x.rec + ((x.to - x.from) / FPS) * x.rate);
  return s ? Math.round(s.from + ((tr - s.rec) / s.rate) * FPS) : null;
};
const phone = JSON.parse(readFileSync(resolve(PUB, DIR, "phone.json"), "utf8"));

const L = lang === "en"
  ? { companies: "companies in the catalogue", cities: ["Beijing", "Shanghai", "Shenzhen"], days: "days from request to visit",
      industries: ["Automotive & NEV", "Robotics & Autonomous Systems", "AI, Large Models & AI Chips", "Food, Beverage & Catering", "Consumer Brands, Apparel & Retail", "New Energy & Storage"] }
  : { companies: "компаний в базе", cities: ["Пекин", "Шанхай", "Шэньчжэнь"], days: "дней от заявки до посещения",
      industries: ["Автопром и электромобили", "Робототехника и беспилотные системы", "AI, большие модели и чипы", "Продукты, напитки и общепит", "Потребительские бренды и ритейл", "Новая энергетика и накопители"] };

const props = {
  lang,
  voiceSrc: `${DIR}/voice.wav`,
  captionsSrc: capRel,
  screenSrc: `${DIR}/screen.mp4`,
  screenW: rec.W,
  screenH: rec.H,
  url: lang === "en" ? "globaltechtour.ru/en" : "globaltechtour.ru",
  screen,
  cursor: rec.cursor.map((c) => ({ t: +c.t.toFixed(3), x: Math.round(c.x), y: Math.round(c.y), kind: c.kind })),
  typing: { from: Math.round(blocks[1].from * FPS), to: screen[1].from },
  shots,
  enterFrame: Math.round(blocks[1].from * FPS),
  phoneSrc: `${DIR}/phone.mp4`,
  // Телефон — только первая прокрутка вниз, ×1,25: вся запись в три
  // секунды блока шла втрое быстрее и страницу было не разглядеть.
  phone: { from: Math.round(blocks[4].from * FPS), to: Math.round(blocks[4].until * FPS), rec: phone.marks["m-start"] - 0.2, rate: 1.25 },
  heads: [
    { from: 0, to: Math.round(blocks[0].until * FPS), clips: [{ src: "local/pool/DJI_20010108123424_0148_D.MP4", start: 13.0 }] },
    { from: Math.round(blocks[7].from * FPS), to: TOTAL * FPS, clips: [{ src: "local/pool/0926-3.mov", start: 57.2, seconds: 4.4 }, { src: "local/pool/DJI_20010108123424_0148_D.MP4", start: 31.6 }] },
  ],
  stat: { from: Math.round((blocks[1].from + 2) * FPS), to: Math.round(blocks[1].until * FPS), value: 900, label: L.companies },
  ticker: { from: Math.round(blocks[2].from * FPS), to: Math.round(blocks[2].until * FPS), items: L.industries },
  route: { cities: L.cities, frames: ["city-0", "city-1", "city-2"].map((m) => recToFrame(M[m] - 1.2)) },
  cta: { from: Math.round(blocks[7].from * FPS), days: 10, daysLabel: L.days },
  blocks: blocks.map(({ i, kind, from, until }) => ({ i, kind, from: Math.round(from * FPS), to: Math.round(until * FPS) })),
};
mkdirSync(resolve(ROOT, "data/site-tour"), { recursive: true });
writeFileSync(resolve(ROOT, `data/site-tour/${lang}.json`), JSON.stringify(props, null, 2));

console.log(`\n  ${lang.toUpperCase()}: общий темп ×${k.toFixed(3)}`);
for (const b of blocks) console.log(`  блок ${b.i} ${b.kind.padEnd(6)} ${b.from.toFixed(2)}–${b.until.toFixed(2)} с  речь ${b.dur.toFixed(2)} с  ×${b.rate.toFixed(2)}`);
for (const s of screen) console.log(`  экран ${(s.from / FPS).toFixed(2)}–${(s.to / FPS).toFixed(2)} ← запись ${s.rec.toFixed(1)} с  ×${s.rate}`);
console.log(`\n  ✔ data/site-tour/${lang}.json\n`);

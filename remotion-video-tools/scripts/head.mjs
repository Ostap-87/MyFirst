#!/usr/bin/env node
// Пул сырых роликов → ролики ChinaStories, по одному, на глазах у владельца.
//
//   npm run head                          что лежит в пуле и на каком этапе
//   npm run head -- --prepare <ролик>     поворот, паузы, звук, расшифровка
//   npm run head -- --draft <ролик> --focus 0.38 --hook "Строка 1|Строка 2"
//                                         идеи монтажа + стол со скриншотами
//   npm run head -- --render <ролик>      финал по одобренному черновику
//
// Сырые ролики кладутся в public/local/pool/ (в .gitignore). Имя ролика —
// имя файла без расширения.
//
// ——— Почему три команды, а не одна ———
//
// Между ними стоит человек. После --prepare ассистент смотрит сетку и
// расшифровку и решает, где глаза и какой крючок. После --draft владелец
// видит стол с пронумерованными идеями и отвечает «убери 3, на 5 сильнее».
// Склеить шаги в один — значит отрендерить финал, который никто не видел.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const POOL = resolve(ROOT, "public/local/pool");
const WORK = resolve(ROOT, "public/local/head");
const DRAFTS = resolve(ROOT, "data/head");
const FPS = 30;

const say = (s) => console.log(s);
const rel = (p) => p.replace(ROOT + "/", "");
const run = (cmd, a) => execFileSync(cmd, a, { stdio: "inherit" });
const probe = (file, entries) =>
  execFileSync("ffprobe", ["-v", "error", "-show_entries", entries, "-of", "json", file]).toString();
const duration = (file) => Number(JSON.parse(probe(file, "format=duration")).format.duration);

const draftPath = (name) => resolve(DRAFTS, `${name}.json`);
const readDraft = (name) =>
  existsSync(draftPath(name)) ? JSON.parse(readFileSync(draftPath(name), "utf8")) : null;
const writeDraft = (d) => {
  mkdirSync(DRAFTS, { recursive: true });
  writeFileSync(draftPath(d.name), JSON.stringify(d, null, 2) + "\n");
};

const rawFiles = () =>
  existsSync(POOL)
    ? readdirSync(POOL).filter((f) => /\.(mp4|mov|m4v)$/i.test(f)).sort()
    : [];

const rawOf = (name) => {
  const f = rawFiles().find((x) => x.replace(/\.[^.]+$/, "") === name);
  if (!f) fail(`В пуле нет ролика «${name}». Что есть: npm run head`);
  return resolve(POOL, f);
};

const outDirOf = (name) => {
  const d = resolve(ROOT, "out/head", name);
  mkdirSync(d, { recursive: true });
  return d;
};

const shot = (file, label) => say(`СКРИН ${rel(file)}  ${label}`);

// ——— Список пула ———

if (!args.prepare && !args.draft && !args.render) {
  const files = rawFiles();
  if (!files.length) {
    say(`\n  Пул пуст. Сырые ролики кладутся в ${rel(POOL)}/\n`);
    process.exit(0);
  }
  say(`\n  В пуле ${files.length}:\n`);
  for (const f of files) {
    const name = f.replace(/\.[^.]+$/, "");
    const d = readDraft(name);
    say(`    ${name.padEnd(28)} ${d?.stage ?? "сырой"}`);
  }
  say("");
  process.exit(0);
}

// ——— Подготовка ———

if (args.prepare) {
  const name = String(args.prepare);
  const raw = rawOf(name);
  const out = outDirOf(name);
  mkdirSync(WORK, { recursive: true });

  const info = JSON.parse(probe(raw, "stream=codec_type,width,height:stream_side_data=rotation:format=duration"));
  const v = info.streams.find((s) => s.codec_type === "video");
  const hasAudio = info.streams.some((s) => s.codec_type === "audio");
  const rot = Math.abs(Number(v?.side_data_list?.[0]?.rotation ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v.width, v.height];
  say(`\n  ${name}: ${w}×${h}${rot ? `, поворот ${rot}°` : ""}, ${Number(info.format.duration).toFixed(1)} с, звук ${hasAudio ? "есть" : "НЕТ"}`);
  if (!hasAudio) fail("Без звука говорящую голову не собрать — нужна съёмка со звуком.");
  if (w > h) say("  ! Горизонтальная съёмка: для сторис будет обрезана по центру. Проверьте кадр.");

  // 1. Вертикаль 1080×1920, 30 кадров. ffmpeg сам применяет поворот айфона;
  //    HEVC перекодируется в H.264 — его понимает и рендер, и превью.
  const norm = resolve(WORK, `${name}-norm.mp4`);
  run("ffmpeg", ["-v", "error", "-y", "-i", raw,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
    "-c:a", "aac", "-ar", "48000", "-b:a", "192k", norm]);
  const first = resolve(out, "01-ishodnik.jpg");
  run("ffmpeg", ["-v", "error", "-y", "-ss", "1.5", "-i", norm, "-frames:v", "1", "-q:v", "3", first]);
  shot(first, "исходник после поворота");

  // 2. Паузы и мычание.
  const tight = resolve(WORK, `${name}-tight.mp4`);
  run("node", [resolve(ROOT, "scripts/tighten.mjs"), "--video", rel(norm), "--out", rel(tight)]);

  // 3. Студийный звук. voice.mjs отдаёт только дорожку — картинка
  //    подкладывается без перекодирования.
  const wav = resolve(WORK, `${name}-voice.wav`);
  run("node", [resolve(ROOT, "scripts/voice.mjs"), "--in", rel(tight), "--out", rel(wav)]);
  const final = resolve(WORK, `${name}.mp4`);
  run("ffmpeg", ["-v", "error", "-y", "-i", tight, "-i", wav, "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final]);

  // 4. Расшифровка — после подтяжки: вырезание сдвинуло тайминги.
  const captions = `captions/head-${name}.json`;
  run("node", [resolve(ROOT, "scripts/transcribe.mjs"), "--audio", rel(final),
    "--out", `public/${captions}`]);

  // 5. Сетка: по ней видно, на какой доле высоты глаза — центр зумов —
  //    и где свободно под плашки.
  const grid = resolve(out, "02-setka.jpg");
  const lines = [];
  for (let i = 1; i < 20; i += 1) {
    const y = Math.round(1920 * i * 0.05);
    lines.push(`drawbox=x=0:y=${y}:w=1080:h=${i % 2 ? 1 : 3}:color=yellow@0.7:t=fill`);
    if (i % 2 === 0) {
      lines.push(`drawtext=fontfile=${resolve(ROOT, "public/fonts/Inter.ttf")}:text='${(i * 0.05).toFixed(1)}':x=14:y=${y - 44}:fontsize=40:fontcolor=yellow:box=1:boxcolor=black@0.5`);
    }
  }
  run("ffmpeg", ["-v", "error", "-y", "-ss", "3", "-i", final, "-frames:v", "1",
    "-vf", lines.join(","), "-q:v", "3", grid]);
  shot(grid, "сетка: где глаза, где свободно");

  const words = JSON.parse(readFileSync(resolve(ROOT, "public", captions), "utf8"));
  writeDraft({
    name,
    stage: "подготовлен",
    props: {
      footage: `local/head/${name}.mp4`,
      captionsSrc: captions,
      durationSeconds: +duration(final).toFixed(2),
    },
    proposals: [],
  });
  say(`\n  ✔ ${name}: ${duration(final).toFixed(1)} с, слов ${words.length}`);
  say(`    Текст: ${words.map((x) => x.text).join("").trim()}\n`);
  process.exit(0);
}

// ——— Черновик: идеи монтажа ———

/**
 * Фразы — по знакам препинания и паузам. Всё монтажное (смена кадра,
 * плашка) встаёт на границу фразы или слова, никогда посреди слова.
 *
 * Паузы сами по себе ненадёжны: после подтяжки они укорочены до 0,18 с,
 * и вся речь сливается в одну фразу. Поэтому главный признак — запятые и
 * точки из расшифровки, а фраза длиннее 4 с дробится по словам: вид кадра
 * должен меняться каждые 2–4 с.
 */
const phrasesOf = (words) => {
  const raw = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const gap = next ? next.startMs - w.endMs : Infinity;
    if (gap >= 250 || /[.,!?;:—]$/.test(w.text.trim())) {
      raw.push(cur);
      cur = [];
    }
  });
  if (cur.length) raw.push(cur);

  const out = [];
  for (const ws of raw) {
    const len = (ws[ws.length - 1].endMs - ws[0].startMs) / 1000;
    const parts = Math.max(1, Math.round(len / 3));
    const per = Math.ceil(ws.length / parts);
    for (let i = 0; i < ws.length; i += per) {
      const chunk = ws.slice(i, i + per);
      out.push({ words: chunk, at: chunk[0].startMs / 1000, until: chunk[chunk.length - 1].endMs / 1000 });
    }
  }
  return out;
};

const peaksOf = (file) => {
  const RATE = 8000;
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
  const per = RATE / FPS;
  const peaks = new Array(Math.ceil(pcm.length / 2 / per)).fill(0);
  for (let i = 0; i < pcm.length / 2; i += 1) {
    const k = Math.floor(i / per);
    peaks[k] = Math.max(peaks[k], Math.abs(pcm.readInt16LE(i * 2)));
  }
  return peaks;
};

const clean = (t) => t.trim().replace(/[.,!?;:«»"]/g, "");
const isBrand = (t) => /^[A-Z][A-Za-z0-9-]{1,}$/.test(clean(t));
const NUMBER_WORDS = /^(один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|двадцать|тридцать|сорок|пятьдесят|сто|двести|тысяч|миллион|миллиард|полтор)/i;
const isNumber = (t) => /\d/.test(t) || NUMBER_WORDS.test(clean(t));
// Слова-усилители: на них голос и так бьёт, зум это подчёркивает.
const EMPHASIS = /^(именно|полностью|каждый|каждую|весь|всю|вся|всё|только|никогда|главное|лично|сразу|не$)/i;
const CUTAWAY_WORDS = /^(сайт|ссылк|программ|маршрут|каталог)/i;
const CTA_WORDS = /^(пиши|подпис|ссылк|директ|присоедин|жд[её]м|регистр)/i;

if (args.draft) {
  const name = String(args.draft);
  const d = readDraft(name);
  if (!d) fail(`Сначала подготовка: npm run head -- --prepare ${name}`);
  const focusY = args.focus ? Number(args.focus) : 0.4;
  const words = JSON.parse(readFileSync(resolve(ROOT, "public", d.props.captionsSrc), "utf8"));
  const total = d.props.durationSeconds;
  const phrases = phrasesOf(words);
  const peaks = peaksOf(resolve(ROOT, "public", d.props.footage));
  const loud = (w) => {
    const a = Math.floor((w.startMs / 1000) * FPS);
    const b = Math.max(a + 1, Math.ceil((w.endMs / 1000) * FPS));
    return Math.max(...peaks.slice(a, b));
  };
  const median = peaks.slice().sort((a, b) => a - b)[Math.floor(peaks.length / 2)] || 1;

  const [hookTop, hookBottom] = String(args.hook ?? "").split("|");
  const ideas = [];
  const add = (x) => ideas.push(x);

  // 1. Хук — всегда быстрый зум с первого кадра: решает, досмотрят ли.
  const hookEnd = Math.min(2.2, phrases[0]?.until ?? 2.2);
  add({ at: 0, until: +hookEnd.toFixed(2), kind: "punch", scale: 1.15, zone: "face",
    what: "быстрый зум ×1,15", why: "хук: первые слова решают, досмотрят ли", applied: true });

  // 2. Плашки: бренды латиницей подряд — одной строкой через точку, числа —
  //    с соседним словом. Тексты — ровно из речи, ничего не придумывается.
  let lastPlate = -10;
  for (const p of phrases) {
    const brands = p.words.filter((w) => isBrand(w.text));
    const num = p.words.find((w) => isNumber(w.text));
    let text = null;
    let at = null;
    if (brands.length >= 1) {
      text = brands.map((w) => clean(w.text)).join(" · ");
      at = brands[0].startMs / 1000;
    } else if (num) {
      // Соседнее слово берётся из всей речи: «две | компании» часто
      // разрезаны границей фразы, а «две» без него ничего не значит.
      const i = words.indexOf(num);
      text = [num, words[i + 1]].filter(Boolean).map((w) => clean(w.text)).join(" ");
      at = num.startMs / 1000;
    }
    // Крючок стоит на месте плашек первые 2,8 с — раньше им не встать.
    if (text && at >= 2.9 && at - lastPlate >= 4) {
      const until = Math.min(total, +(p.until + 1.5).toFixed(2));
      add({ at: +at.toFixed(2), until, kind: "plate", zone: "top", applied: true,
        what: `плашка «${text}»`, why: `в речи: «${p.words.map((w) => w.text).join("").trim()}»`,
        plate: { text, at: +at.toFixed(2), until, kind: brands.length > 1 ? "accent" : "term" } });
      lastPlate = at;
    }
    // 3. Перебивка — только идея: скрин или B-roll даёт владелец.
    const cw = p.words.find((w) => CUTAWAY_WORDS.test(clean(w.text)));
    if (cw) {
      add({ at: +(cw.startMs / 1000).toFixed(2), until: +Math.min(total, cw.startMs / 1000 + 3).toFixed(2),
        kind: "cutaway", zone: "full", applied: false,
        what: "перебивка", why: `на «${clean(cw.text)}» — нужен скрин или B-roll` });
    }
  }

  // 4. Камера по фразам: чередуем, чтобы вид кадра менялся каждые 2–4 с,
  //    но между движениями остаётся не меньше 0,8 с чистого кадра.
  let lastEnd = hookEnd;
  let lastKind = "punch";
  for (const p of phrases.slice(1)) {
    if (p.at - lastEnd < 0.8) continue;
    const inTail = p.at > total - 2;
    const ctaWord = p.words.find((w) => CTA_WORDS.test(clean(w.text)));
    if (inTail && !ctaWord) continue;

    const hot = p.words.slice().sort((a, b) => loud(b) - loud(a))[0];
    const emphatic = hot && loud(hot) > median * 2.2;
    const trigger = p.words.find((w) => isBrand(w.text) || isNumber(w.text))
      ?? ctaWord ?? p.words.find((w) => EMPHASIS.test(clean(w.text)));
    const dur = p.until - p.at;

    let move;
    if ((trigger || emphatic) && lastKind !== "punch") {
      const w = trigger ?? hot;
      const at = w.startMs / 1000;
      move = { at, until: Math.min(p.until, at + 1.8), kind: "punch", scale: 1.2,
        what: "быстрый зум ×1,2", why: `удар на «${clean(w.text)}»` };
    } else if (dur >= 3 && lastKind !== "push") {
      move = { at: p.at, until: p.until, kind: "push", scale: 1.07,
        what: "лёгкий наезд ×1,07", why: `длинная фраза ${dur.toFixed(1)} с без событий` };
    } else if (p.at - lastEnd >= 2.5 && lastKind !== "cut") {
      move = { at: p.at, until: p.until, kind: "cut", scale: 1.12,
        what: "смена кадра ×1,12", why: "новая мысль — склейка как со второй камеры" };
    }
    if (!move || move.until - move.at < 0.6) continue;
    add({ ...move, at: +move.at.toFixed(2), until: +move.until.toFixed(2), zone: "face", applied: true });
    lastEnd = move.until;
    lastKind = move.kind;
  }

  ideas.sort((a, b) => a.at - b.at);
  ideas.forEach((x, i) => { x.n = i + 1; });

  const props = {
    ...d.props,
    hookTop: hookTop ?? d.props.hookTop ?? "",
    hookBottom: hookBottom ?? d.props.hookBottom ?? "",
    brandMark: "GLOBAL TECH TOUR",
    logoScale: 1.5,
    logoSpin: 72,
    focusY,
    plates: ideas.filter((x) => x.kind === "plate" && x.applied).map((x) => x.plate),
    cutaways: [],
    moves: ideas.filter((x) => ["punch", "push", "cut"].includes(x.kind) && x.applied)
      .map(({ at, until, kind, scale }) => ({ at, until, kind, scale })),
  };
  writeDraft({ ...d, stage: "черновик", props,
    proposals: ideas.map(({ plate, ...rest }) => rest) });

  say(`\n  Идеи для ${name} (${total.toFixed(1)} с, глаза на ${focusY}):\n`);
  for (const x of ideas) {
    say(`   №${String(x.n).padEnd(3)}${x.at.toFixed(1).padStart(5)}–${x.until.toFixed(1).padEnd(5)} ${x.applied ? " " : "?"} ${x.what} — ${x.why}`);
  }
  say(`\n  Черновик: ${rel(draftPath(name))}. Стол: npm run editor -- --props ${rel(draftPath(name))}\n`);
  process.exit(0);
}

// ——— Финал ———

if (args.render) {
  const name = String(args.render);
  const d = readDraft(name);
  if (!d || d.stage === "подготовлен") fail(`Сначала черновик: npm run head -- --draft ${name}`);
  const out = outDirOf(name);
  const propsFile = resolve(out, "props.json");
  writeFileSync(propsFile, JSON.stringify(d.props));
  const file = resolve(out, `${name}.mp4`);
  run("npx", ["remotion", "render", "src/index.ts", "GTT-Head", file, `--props=${propsFile}`]);
  writeDraft({ ...d, stage: "готов" });
  say(`ВИДЕО ${rel(file)}`);
}

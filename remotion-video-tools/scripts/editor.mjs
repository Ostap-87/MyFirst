#!/usr/bin/env node
// Монтажный стол: ролик ChinaStories и его лента в одном кадре,
// плюс скриншоты ключевых моментов по ходу сборки.
//
//   npm run editor -- --id GTT-Invite            скриншоты + видео стола
//   npm run editor -- --id GTT-Invite --stills   только скриншоты, быстро
//   npm run editor -- --props data/head/<ролик>.json   черновик из пула с идеями
//
// Результат — out/editor/<id>/:
//   01-krjuchok.jpg, 02-plashka-….jpg …   стол в момент каждого события
//   sheet.jpg                             все скриншоты одним листом
//   editor.mp4                            стол целиком, со звуком
//
// Каждый готовый файл печатается строкой «СКРИН <путь>» / «ВИДЕО <путь>» —
// по ним ассистент отправляет кадры в чат, не дожидаясь конца рендера.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
// Черновик из пула лежит файлом, а не записью в Root.tsx: пропсы и идеи
// монтажёра берутся оттуда.
const draft = args.props && args.props !== true
  ? JSON.parse(readFileSync(resolve(ROOT, String(args.props)), "utf8"))
  : null;
const id = draft ? draft.name : args.id && args.id !== true ? String(args.id) : null;
if (!id) {
  fail(
    "Какой ролик на стол? npm run editor -- --id GTT-Invite\n" +
      "    Подходит любая композиция на шаблоне ChinaStories.",
  );
}

const FPS = 30;
const outDir = resolve(ROOT, "out/editor", id);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log("\n  Собираю бандл…");
const serveUrl = await bundle({
  entryPoint: resolve(ROOT, "src/index.ts"),
  onProgress: () => undefined,
});
// Бандл копирует к себе всю public — с исходниками это гигабайты на
// каждый запуск. Не убирать за собой значит за день забить диск.
process.on("exit", () => rmSync(serveUrl, { recursive: true, force: true }));

// Пропсы берём у самой композиции: стол показывает ровно тот ролик,
// что зарегистрирован в Root.tsx, а не копию, которая разойдётся с ним.
const props = draft
  ? draft.props
  : (await selectComposition({ serveUrl, id })).props;
const proposals = draft?.proposals ?? [];
if (!props.footage || !Array.isArray(props.plates)) {
  fail(`${id} — не ChinaStories: нет footage или plates в пропсах.`);
}

// ——— Громкость по кадрам для волны на дорожке видео ———
//
// Считается здесь, а не в браузере: декодировать звук из MP4 в рендере
// медленно и зависит от кодеков сборки Chromium. Столбик на кадр — ровно
// то разрешение, которое видно на ленте.
const peaksRel = `local/editor/${id}.peaks.json`;
{
  const RATE = 8000;
  const pcm = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", resolve(ROOT, "public", props.footage),
     "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-"],
    { maxBuffer: 1 << 30 },
  );
  const per = RATE / FPS;
  const n = Math.ceil(pcm.length / 2 / per);
  const raw = new Array(n).fill(0);
  for (let i = 0; i < pcm.length / 2; i += 1) {
    const v = Math.abs(pcm.readInt16LE(i * 2));
    const k = Math.floor(i / per);
    if (v > raw[k]) raw[k] = v;
  }
  // Нормируем по 98-му перцентилю, а не по максимуму: один хлопок иначе
  // сплющит всю остальную речь в полоску.
  const top = raw.slice().sort((a, b) => a - b)[Math.floor(n * 0.98)] || 1;
  const peaks = raw.map((v) => Math.min(1, +(v / top).toFixed(3)));
  // Бандл уже скопировал public к себе, поэтому файл кладём и туда:
  // иначе рендер его не увидит, а пересобирать бандл ради него — минуты.
  for (const base of [resolve(ROOT, "public"), resolve(serveUrl, "public")]) {
    mkdirSync(resolve(base, "local/editor"), { recursive: true });
    writeFileSync(resolve(base, peaksRel), JSON.stringify(peaks));
  }
}

const inputProps = { ...props, title: id, peaksSrc: peaksRel, proposals };
const editor = await selectComposition({ serveUrl, id: "GTT-Editor", inputProps });

// ——— События: где делать скриншоты ———
const slug = (s) =>
  s.toLowerCase()
    .replace(/[аәӓ]/g, "a").replace(/б/g, "b").replace(/в/g, "v").replace(/г/g, "g")
    .replace(/д/g, "d").replace(/[её]/g, "e").replace(/ж/g, "zh").replace(/з/g, "z")
    .replace(/и/g, "i").replace(/й/g, "j").replace(/к/g, "k").replace(/л/g, "l")
    .replace(/м/g, "m").replace(/н/g, "n").replace(/о/g, "o").replace(/п/g, "p")
    .replace(/р/g, "r").replace(/с/g, "s").replace(/т/g, "t").replace(/у/g, "u")
    .replace(/ф/g, "f").replace(/х/g, "h").replace(/ц/g, "c").replace(/ч/g, "ch")
    .replace(/ш/g, "sh").replace(/щ/g, "sch").replace(/[ъь]/g, "").replace(/ы/g, "y")
    .replace(/э/g, "e").replace(/ю/g, "yu").replace(/я/g, "ya")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);

// Кадр берётся через 0,6 с после появления: анимация входа уже закончилась,
// и на скриншоте плашка стоит, а не проявляется.
const events = [{ at: 1.0, label: "Крючок" }];
for (const p of props.plates) events.push({ at: p.at + 0.6, label: `Плашка ${p.text}` });
for (const c of props.cutaways) events.push({ at: c.at + 0.8, label: `Сайт ${c.src.split("/").pop()}` });
for (const p of proposals) {
  if (p.kind === "plate" || (p.kind === "cutaway" && p.applied)) continue; // уже есть выше
  // Середина отрезка, но не позже чем через 1,2 с: зум уже доехал,
  // а рамка «где в кадре» ещё на экране.
  events.push({ at: p.at + Math.min(1.2, (p.until - p.at) / 2), label: `Идея ${p.n} ${p.what}` });
}
events.push({ at: props.durationSeconds - 0.8, label: "Финал" });
events.sort((a, b) => a.at - b.at);

const stills = [];
for (const [i, e] of events.entries()) {
  const frame = Math.min(editor.durationInFrames - 1, Math.round(e.at * FPS));
  const file = resolve(outDir, `${String(i + 1).padStart(2, "0")}-${slug(e.label)}.jpg`);
  await renderStill({
    serveUrl,
    composition: editor,
    inputProps,
    frame,
    output: file,
    imageFormat: "jpeg",
    jpegQuality: 88,
  });
  stills.push(file);
  console.log(`СКРИН ${file.replace(ROOT + "/", "")}  ${e.at.toFixed(1)} с · ${e.label}`);
}

// Лист: все скриншоты в одну картинку — на телефоне видно ход ролика сразу.
{
  const cols = Math.min(4, stills.length);
  const rows = Math.ceil(stills.length / cols);
  const list = resolve(outDir, "sheet.txt");
  writeFileSync(list, stills.map((f) => `file '${f}'`).join("\n"));
  const sheet = resolve(outDir, "sheet.jpg");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", `scale=360:-1,tile=${cols}x${rows}:padding=8:color=0x0B0E14`,
    "-frames:v", "1", "-q:v", "3", sheet,
  ]);
  rmSync(list);
  console.log(`СКРИН ${sheet.replace(ROOT + "/", "")}  лист из ${stills.length}`);
}

if (args.stills) {
  console.log("\n  --stills: видео стола не рендерю.\n");
  process.exit(0);
}

const video = resolve(outDir, "editor.mp4");
let shown = -1;
await renderMedia({
  serveUrl,
  composition: editor,
  inputProps,
  codec: "h264",
  crf: 23,
  outputLocation: video,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== shown) {
      shown = pct;
      console.log(`  рендер стола ${pct}%`);
    }
  },
});
console.log(`ВИДЕО ${video.replace(ROOT + "/", "")}`);
console.log(`\n  Готово: ${readdirSync(outDir).length} файлов в out/editor/${id}\n`);

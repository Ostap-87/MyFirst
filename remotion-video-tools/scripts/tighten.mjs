#!/usr/bin/env node
// Подтягивает съёмку: режет длинные паузы и звуки-заполнители.
//
//   npm run tighten -- --video public/local/china-full.mp4
//   npm run tighten -- --video ... --captions data/captions-china-full.json
//   npm run tighten -- --video ... --max-pause 0.14 --junk "ну,вот,типа"
//   npm run tighten -- --video ... --dry-run        только показать план
//
// Зачем это отдельным шагом, а не фильтром при рендере: вырезание меняет
// тайминги речи, поэтому расшифровку после него надо делать заново. Порядок
// всегда такой: подтянуть -> расшифровать -> собирать композицию.
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.video || args.video === true) {
  fail(
    "Укажите видео: npm run tighten -- --video public/local/имя.mp4\n" +
      "    --max-pause <с>    до скольки укорачивать паузу (по умолчанию 0.18)\n" +
      "    --min-pause <с>    какую паузу считать длинной (по умолчанию 0.32)\n" +
      "    --noise <dB>       порог тишины (по умолчанию -40)\n" +
      "    --captions <файл>  расшифровка: тогда режутся и звуки-заполнители\n" +
      '    --junk "ну,вот"    добавить мусорные слова к вырезанию\n' +
      "    --dry-run          показать план, ничего не делать",
  );
}

const videoPath = resolve(ROOT, String(args.video));
if (!existsSync(videoPath)) fail(`Видео не найдено: ${videoPath}`);

const maxPause = Number(args["max-pause"] ?? 0.18);
const minPause = Number(args["min-pause"] ?? 0.32);
const noise = Number(args.noise ?? -40);
const dryRun = Boolean(args["dry-run"]);

/**
 * Звуки-заполнители: чистое мычание без смысла.
 *
 * Список намеренно короткий. «Ну», «вот», «значит» — полноценные слова, и
 * вырезать их вслепую значит портить речь: на месте склейки слышен щелчок,
 * а фраза теряет интонацию. Такие слова добавляются флагом --junk осознанно,
 * когда человек действительно ими злоупотребляет.
 */
const FILLERS = [
  "э", "ээ", "эээ", "ээээ",
  "а-а", "аа", "ааа",
  "м", "мм", "ммм",
  "эм", "эмм",
  "ну-у", "э-э", "м-м",
];

const junk = typeof args.junk === "string"
  ? args.junk.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
  : [];

const ffprobe = (file, entries) =>
  execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", entries,
    "-of", "default=nw=1:nk=1",
    file,
  ]).toString().trim();

const duration = Number(ffprobe(videoPath, "format=duration"));

// ——— Тишина ———

// silencedetect пишет в stderr, а execFileSync отдаёт только stdout —
// поэтому склеиваем потоки через оболочку.
const detect = execSync(
  `ffmpeg -hide_banner -i ${JSON.stringify(videoPath)} ` +
    `-af silencedetect=noise=${noise}dB:d=${minPause} -f null - 2>&1`,
  { maxBuffer: 32 * 1024 * 1024 },
).toString();

/** Отрезки тишины: [начало, конец]. */
const silences = [];
let pending = null;
for (const line of detect.split("\n")) {
  const start = /silence_start:\s*([0-9.]+)/.exec(line);
  const end = /silence_end:\s*([0-9.]+)/.exec(line);
  if (start) pending = Number(start[1]);
  if (end && pending !== null) {
    silences.push([pending, Number(end[1])]);
    pending = null;
  }
}
if (pending !== null) silences.push([pending, duration]);

// Смыкаем соседние отрезки: silencedetect дробит одну паузу на несколько.
const merged = [];
for (const [from, to] of silences) {
  const last = merged[merged.length - 1];
  if (last && from - last[1] < 0.05) last[1] = to;
  else merged.push([from, to]);
}

// ——— Звуки-заполнители из расшифровки ———

const fillerSpans = [];
if (typeof args.captions === "string") {
  const capPath = resolve(ROOT, args.captions);
  if (!existsSync(capPath)) fail(`Расшифровка не найдена: ${capPath}`);

  for (const word of JSON.parse(read(capPath))) {
    const clean = word.text.trim().toLowerCase().replace(/[.,!?…]/g, "");
    if (FILLERS.includes(clean) || junk.includes(clean)) {
      fillerSpans.push([word.startMs / 1000, word.endMs / 1000, clean]);
    }
  }
}

// ——— Что вырезаем ———

/** Куски, которые уходят: длинная пауза сверх лимита + заполнители целиком. */
const cuts = [];
for (const [from, to] of merged) {
  const extra = to - from - maxPause;
  // Паузу не убираем совсем: речь без пауз звучит роботом. Укорачиваем.
  if (extra > 0.04) cuts.push([from + maxPause, to, "пауза"]);
}
for (const [from, to, word] of fillerSpans) cuts.push([from, to, `«${word}»`]);

cuts.sort((a, b) => a[0] - b[0]);

if (cuts.length === 0) {
  console.log("\n  Резать нечего: длинных пауз и заполнителей не найдено.\n");
  process.exit(0);
}

const cutTotal = cuts.reduce((sum, [from, to]) => sum + (to - from), 0);

console.log(`\n  ${videoPath.split("/").pop()} — ${duration.toFixed(2)} с`);
console.log(`  Найдено пауз: ${merged.length}, заполнителей: ${fillerSpans.length}\n`);
for (const [from, to, what] of cuts) {
  console.log(`    ${from.toFixed(2).padStart(6)} — ${to.toFixed(2).padStart(6)} с   ${(to - from).toFixed(2)} с   ${what}`);
}
console.log(
  `\n  Вырезается ${cutTotal.toFixed(2)} с. Останется ${(duration - cutTotal).toFixed(2)} с ` +
    `(было ${duration.toFixed(2)}).`,
);

if (dryRun) {
  console.log("\n  --dry-run: файл не создан.\n");
  process.exit(0);
}

// ——— Сборка ———

/** Отрезки, которые оставляем — дополнение к вырезанным. */
const keep = [];
let cursor = 0;
for (const [from, to] of cuts) {
  if (from - cursor > 0.02) keep.push([cursor, from]);
  cursor = Math.max(cursor, to);
}
if (duration - cursor > 0.02) keep.push([cursor, duration]);

const expr = keep
  .map(([from, to]) => `between(t,${from.toFixed(3)},${to.toFixed(3)})`)
  .join("+");

const outPath = typeof args.out === "string"
  ? resolve(ROOT, args.out)
  : videoPath.replace(/\.(mp4|mov)$/i, "-tight.mp4");

console.log(`\n  Собираю ${keep.length} кусков…`);

execFileSync(
  "ffmpeg",
  [
    "-v", "error", "-y",
    "-i", videoPath,
    "-vf", `select='${expr}',setpts=N/FRAME_RATE/TB`,
    "-af", `aselect='${expr}',asetpts=N/SR/TB`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    outPath,
  ],
  { stdio: "inherit" },
);

const got = Number(ffprobe(outPath, "format=duration"));
console.log(`
  ✔ ${outPath}
    ${duration.toFixed(2)} с  ->  ${got.toFixed(2)} с   (короче на ${(duration - got).toFixed(2)})

  Дальше расшифровку надо сделать ЗАНОВО — тайминги речи сдвинулись:
    npm run transcribe -- --audio <звук из нового файла>
`);

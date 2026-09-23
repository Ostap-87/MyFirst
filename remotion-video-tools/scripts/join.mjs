#!/usr/bin/env node
// Склеивает готовые ролики в один с переходами.
//
//   npm run join -- --out out/series.mp4 --clips out/a.mp4,out/b.mp4
//   npm run join -- --plan data/series.json
//   npm run join -- --plan data/series.json --fade 0.5 --dry-run
//
// Зачем скриптом, а не одной командой ffmpeg: переходы xfade считаются от
// накопленного смещения, и при смене порядка роликов все смещения надо
// пересчитывать заново. Руками это делается один раз, а порядок в сборке
// перебирается много раз.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

// read отдаёт строку — в этом проекте он не парсит JSON.
const plan = args.plan
  ? JSON.parse(read(resolve(ROOT, String(args.plan))))
  : null;
const clips = plan
  ? plan.clips
  : typeof args.clips === "string"
    ? args.clips.split(",").map((c) => c.trim()).filter(Boolean)
    : null;
const outPath = String(args.out ?? plan?.out ?? "");

if (!clips || clips.length < 2 || !outPath) {
  fail(
    "Укажите ролики и файл сборки:\n" +
      "    npm run join -- --out out/series.mp4 --clips out/a.mp4,out/b.mp4\n" +
      "    npm run join -- --plan data/series.json\n\n" +
      "    --fade <с>    длина перехода (по умолчанию 0.35)\n" +
      "    --no-norm     не выравнивать громкость всей сборки\n" +
      "    --dry-run     показать план, ничего не делать",
  );
}

const fade = Number(args.fade ?? plan?.fade ?? 0.35);
const dryRun = Boolean(args["dry-run"]);
const normalize = !args["no-norm"];

const probe = (file, entries, stream) =>
  Number(
    execFileSync("ffprobe", [
      "-v", "error",
      ...(stream ? ["-select_streams", stream] : []),
      "-show_entries", entries,
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]).toString().trim().split("\n")[0],
  );

const files = clips.map((c) => {
  const file = resolve(ROOT, String(c));
  if (!existsSync(file)) fail(`Ролик не найден: ${file}`);
  return file;
});

/**
 * Кадр, а не секунда, — единица измерения.
 *
 * xfade принимает смещение в секундах, но склейка ложится на сетку кадров.
 * Считая в секундах, к восьмому ролику накапливается ошибка на полкадра, и
 * последний переход уезжает. Поэтому считаем в кадрах и переводим в секунды
 * только на выходе.
 */
const fps = execFileSync("ffprobe", [
  "-v", "error", "-select_streams", "v:0",
  "-show_entries", "stream=r_frame_rate",
  "-of", "default=noprint_wrappers=1:nokey=1", files[0],
]).toString().trim();

// ffprobe отдаёт частоту дробью вида «30/1», числом её не прочитать.
const [num, den] = fps.split("/").map(Number);
const FPS = den ? num / den : num;
if (!Number.isFinite(FPS) || FPS <= 0) fail(`Не читается частота кадров: ${fps}`);
const fadeFrames = Math.round(fade * FPS);
const durations = files.map((f) => Math.round(probe(f, "format=duration") * FPS));

const total = durations.reduce((a, b) => a + b, 0) - fadeFrames * (files.length - 1);

console.log(`\n  Сборка из ${files.length} роликов, переход ${fade} с:\n`);
let at = 0;
files.forEach((f, i) => {
  console.log(
    `    ${String(i + 1).padStart(2)}. ${(at / FPS).toFixed(2).padStart(7)} с  ` +
      `${(durations[i] / FPS).toFixed(2).padStart(6)} с  ${f.replace(ROOT + "/", "")}`,
  );
  at += durations[i] - (i < files.length - 1 ? fadeFrames : 0);
});
console.log(`\n  Итого ${(total / FPS).toFixed(2)} с (${total} кадров).\n`);

if (dryRun) {
  console.log("  --dry-run: файл не создан.\n");
  process.exit(0);
}

// Цепочка переходов: каждый следующий ролик подмешивается к тому, что уже
// склеено, поэтому смещение считается от начала всей сборки, а не от начала
// очередного ролика.
const parts = [];
let vPrev = "0:v";
let aPrev = "0:a";
let offset = durations[0] - fadeFrames;

for (let i = 1; i < files.length; i += 1) {
  const last = i === files.length - 1;
  const v = last && !normalize ? "v" : `v${i}`;
  const a = `a${i}`;
  parts.push(
    `[${vPrev}][${i}:v]xfade=transition=fade:duration=${fade}:` +
      `offset=${(offset / FPS).toFixed(3)}[${v}]`,
  );
  parts.push(`[${aPrev}][${i}:a]acrossfade=d=${fade}:c1=tri:c2=tri[${a}]`);
  vPrev = v;
  aPrev = a;
  offset += durations[i] - fadeFrames;
}

// Громкость выравнивается один раз по всей сборке. Куски приходят с разбросом
// в доли децибела, и слышно это именно на стыке — как подскок на склейке.
if (normalize) {
  parts.push(`[${aPrev}]loudnorm=I=-14:TP=-1.5:LRA=11[aout]`);
  aPrev = "aout";
}

const ffmpegArgs = [
  "-y", "-loglevel", "error",
  ...files.flatMap((f) => ["-i", f]),
  "-filter_complex", parts.join(";"),
  "-map", `[${vPrev}]`, "-map", `[${aPrev}]`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "192k",
  resolve(ROOT, outPath),
];

console.log("  Собираю…\n");
execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
console.log(`  ✔ ${resolve(ROOT, outPath)}\n`);

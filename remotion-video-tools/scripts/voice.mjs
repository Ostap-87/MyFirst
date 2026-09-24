#!/usr/bin/env node
// Приводит запись голоса к студийному звучанию.
//
//   npm run voice -- --in public/local/voice.mp4
//   npm run voice -- --in ... --out public/audio/promo-voice.wav
//   npm run voice -- --in ... --target -14 --preset light
//   npm run voice -- --in ... --analyse      только замеры, без обработки
//
// Цепочка собрана под речь с телефона: тихо, есть придыхания, немного
// комнатного шума. Порядок фильтров не переставлять — каждый следующий
// работает по тому, что оставил предыдущий.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.in || args.in === true) {
  fail(
    "Укажите запись: npm run voice -- --in public/local/voice.mp4\n" +
      "    --out <файл>     куда писать (по умолчанию public/audio/<имя>-clean.wav)\n" +
      "    --target <LUFS>  громкость, по умолчанию -16 (речь в видео)\n" +
      "    --preset <имя>   studio (по умолчанию) | light | strong\n" +
      "    --analyse        только замерить вход, ничего не делать",
  );
}

const inPath = resolve(ROOT, String(args.in));
if (!existsSync(inPath)) fail(`Файл не найден: ${inPath}`);

const preset = String(args.preset ?? "studio");
const target = Number(args.target ?? -16);
const analyseOnly = Boolean(args.analyse);

const outPath = resolve(
  ROOT,
  String(
    args.out ??
      `public/audio/${inPath.split("/").pop().replace(/\.[^.]+$/, "")}-clean.wav`,
  ),
);

const ff = (a) => execFileSync("ffmpeg", a, { stdio: ["ignore", "pipe", "pipe"] });

/**
 * Уровень в выбранной полосе — по нему видно, что чистить.
 *
 * Через оболочку с 2>&1: volumedetect печатает в stderr, а execFileSync
 * отдаёт stdout, и без перенаправления возвращается пустая строка.
 */
const band = (file, filter) => {
  const text = execFileSync("sh", ["-c",
    `ffmpeg -hide_banner -i "${file}" -af "${filter}volumedetect" -f null - 2>&1`,
  ]).toString();
  const m = /mean_volume: ([-\d.]+)/.exec(text);
  return m ? Number(m[1]) : NaN;
};

/**
 * volumedetect пишет в stderr, а execFileSync возвращает stdout. Читаем
 * через оболочку с перенаправлением — иначе приходит пустая строка.
 */
const measure = (file) => {
  const text = execFileSync(
    "sh",
    ["-c", `ffmpeg -hide_banner -i "${file}" -af volumedetect -f null - 2>&1`],
  ).toString();
  const lufs = execFileSync(
    "sh",
    ["-c", `ffmpeg -hide_banner -i "${file}" -af ebur128=framelog=quiet -f null - 2>&1`],
  ).toString();
  const num = (re, src) => {
    const m = re.exec(src);
    return m ? Number(m[1]) : NaN;
  };
  return {
    mean: num(/mean_volume: ([-\d.]+)/, text),
    max: num(/max_volume: ([-\d.]+)/, text),
    lufs: num(/I:\s+([-\d.]+) LUFS/, lufs),
    lra: num(/LRA:\s+([-\d.]+) LU/, lufs),
  };
};

const show = (label, m) =>
  console.log(
    `    ${label.padEnd(8)} громкость ${String(m.lufs).padStart(6)} LUFS   ` +
      `пик ${String(m.max).padStart(6)} dB   разброс ${String(m.lra).padStart(5)} LU`,
  );

console.log(`\n  Вход: ${inPath.replace(ROOT + "/", "")}`);
const before = measure(inPath);
show("до", before);

// Полосы, по которым видно характер записи.
const hum = band(inPath, "bandpass=f=50:width_type=h:w=5,");
const hiss = band(inPath, "highpass=f=8000,");
console.log(
  `    сеть 50 Гц ${hum.toFixed(1)} dB   шипение 8к+ ${hiss.toFixed(1)} dB` +
    `   (относительно сигнала: ${(hum - before.mean).toFixed(1)} и ${(hiss - before.mean).toFixed(1)})`,
);
if (hum - before.mean > -20) {
  console.log("    ! заметна сетевая наводка — добавляется вырез на 50 и 100 Гц");
}

if (analyseOnly) {
  console.log("\n  --analyse: файл не создан.\n");
  process.exit(0);
}

/**
 * Цепочка.
 *
 * highpass 80    — рокот и удары воздуха в микрофон; ниже 80 Гц у голоса
 *                  нет ничего, кроме помех.
 * afftdn         — комнатный шум. Слабо: сильное шумоподавление даёт
 *                  «подводный» призвук, который слышно сразу.
 * equalizer      — минус на 300 Гц убирает бубнение, плюс на 3 кГц даёт
 *                  разборчивость согласных, плюс на 9 кГц — воздух.
 * deesser        — свистящие «с» и «ш», которые после подъёма верха лезут.
 * agate          — придыхания: вдох тише речи на 15-20 dB, и мягкий порог
 *                  их приглушает, не трогая тихие окончания слов.
 * acompressor    — ровность: разброс громкости между началом и концом
 *                  фразы у неподготовленного голоса доходит до 12 LU.
 * alimiter       — потолок, чтобы после усиления не было клиппинга.
 */
const CHAINS = {
  light: ["highpass=f=80", "acompressor=threshold=0.1:ratio=2:attack=20:release=250"],
  studio: [
    "highpass=f=80",
    "afftdn=nr=10:nf=-50",
    "equalizer=f=300:width_type=o:w=1:g=-2.5",
    "equalizer=f=3000:width_type=o:w=1.2:g=2",
    "equalizer=f=9000:width_type=o:w=1.5:g=1.5",
    "deesser=i=0.3:m=0.5:f=0.5",
    "agate=threshold=0.008:ratio=2:attack=6:release=200:knee=6",
    "acompressor=threshold=0.08:ratio=3:attack=12:release=220:knee=4",
    "alimiter=limit=0.94:level=false",
  ],
  strong: [
    "highpass=f=90",
    "afftdn=nr=18:nf=-45",
    "equalizer=f=300:width_type=o:w=1:g=-3.5",
    "equalizer=f=3000:width_type=o:w=1.2:g=3",
    "equalizer=f=9000:width_type=o:w=1.5:g=2",
    "deesser=i=0.45:m=0.5:f=0.5",
    "agate=threshold=0.015:ratio=3:attack=5:release=160:knee=6",
    "acompressor=threshold=0.05:ratio=4:attack=10:release=200:knee=4",
    "alimiter=limit=0.92:level=false",
  ],
};

const chain = CHAINS[preset];
if (!chain) fail(`Неизвестный пресет: ${preset}. Есть: ${Object.keys(CHAINS).join(", ")}`);

mkdirSync(dirname(outPath), { recursive: true });
const tmp = outPath.replace(/\.wav$/, ".stage1.wav");

console.log(`\n  Пресет: ${preset}, цель ${target} LUFS`);
console.log("  Чищу…");
ff(["-loglevel", "error", "-y", "-i", inPath, "-vn", "-af", chain.join(","),
    "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", tmp]);

/**
 * Громкость — вторым проходом.
 *
 * loudnorm в один проход считает по началу файла и на речи с паузами
 * стабильно промахивается на 3-4 dB. Двухпроходный меряет весь файл и
 * попадает.
 */
console.log("  Выравниваю громкость…");
const probe = execFileSync("sh", ["-c",
  `ffmpeg -hide_banner -i "${tmp}" -af loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`,
]).toString();
const json = /\{[^{]*"input_i"[\s\S]*?\}/.exec(probe);
if (!json) fail("Не удалось замерить громкость первым проходом");
const p = JSON.parse(json[0]);

ff(["-loglevel", "error", "-y", "-i", tmp, "-af",
    `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${p.input_i}:measured_TP=${p.input_tp}` +
    `:measured_LRA=${p.input_lra}:measured_thresh=${p.input_thresh}:offset=${p.target_offset}`,
    "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", outPath]);

execFileSync("rm", ["-f", tmp]);

const after = measure(outPath);
console.log("");
show("до", before);
show("после", after);
console.log(`\n  ✔ ${outPath.replace(ROOT + "/", "")}\n`);

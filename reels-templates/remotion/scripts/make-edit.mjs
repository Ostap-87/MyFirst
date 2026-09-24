#!/usr/bin/env node
// Собирает public/edit.json из расшифровки: каждый приём привязан к фразе,
// а не к секундам на глаз.
//
//   node scripts/make-edit.mjs
//
// Правило 4 инструкции: приём начинается на начале слова и заканчивается на
// конце фразы. Поэтому тайминги берутся из captions.json по первому и
// последнему слову опорной фразы, а не округляются вручную.
import fs from "node:fs";

const captions = JSON.parse(fs.readFileSync("public/captions.json", "utf8"));
const text = captions.map((w) => w.text).join("");
const lower = text.toLowerCase();

/** Слово, внутри которого стоит символ с этим смещением в общей строке. */
const tokenAt = (offset) => {
  let acc = 0;
  for (const w of captions) {
    if (acc + w.text.length > offset) return w;
    acc += w.text.length;
  }
  return captions[captions.length - 1];
};

/**
 * Границы фразы в миллисекундах.
 *
 * Начало — startMs первого токена фразы, конец — endMs последнего.
 * Токены whisper бывают кусками слова («технолог|ическая»), поэтому
 * конец ищется по последнему символу фразы, а не по числу слов.
 */
const span = (phrase) => {
  const i = lower.indexOf(phrase.toLowerCase());
  if (i < 0) throw new Error(`Фразы нет в расшифровке: «${phrase}»`);
  return {
    fromMs: tokenAt(i + (text[i] === " " ? 1 : 0)).startMs,
    toMs: tokenAt(i + phrase.length - 1).endMs,
  };
};

const durationMs = Math.round(
  Number(
    (
      await import("node:child_process")
    ).execSync(
      "ffprobe -v error -show_entries format=duration -of csv=p=0 public/take.mp4",
    ),
  ) * 1000,
);

/**
 * Зумы — единственный приём: B-roll и скриншотов нет.
 *
 * Чередуются с «чистым» спикером, чтобы раскладка менялась каждые 2–4 с
 * (правило 2). Масштаб разный — 1.18, 1.22, 1.15 — иначе повторяющийся
 * одинаковый наезд читается как дёрганье, а не как акцент.
 */
const PUNCHES = [
  { phrase: "что такое технологическая экспедиция в Китае", scale: 1.18 },
  { phrase: "это новые знакомства", scale: 1.16 },
  { phrase: "это новые точки роста", scale: 1.18 },
  { phrase: "присоединяйтесь к нам нашей экспедиции", scale: 1.18 },
  // Даты — главная информация анонса, без зума тут было 5,6 с одного кадра.
  // Берём диапазон без «2026 года»: сразу за «года» без паузы идёт «мы с
  // вами», и зум на всю фразу склеился бы со следующим, нарушив правило 3.
  { phrase: "с 15 по 21 ноября", scale: 1.15 },
  { phrase: "мы с вами посетим 12 заводов", scale: 1.18 },
];

/**
 * Геометрия этого дубля, замер по сетке: макушка на 41%, глаза на 54%,
 * подбородок на 72%, ниже чёрная футболка.
 *
 * Зум центрируется на глазах, а масштаб не больше ×1.18: так подбородок при
 * наезде не опускается ниже 76% и не заходит на субтитры.
 */
const EYES = 0.54;
const CAPTIONS = 0.8;

const punchIns = PUNCHES.map((p) => ({ ...span(p.phrase), scale: p.scale, originY: EYES }));

// Первый зум — с нуля, правило 1: хук всегда под наездом.
punchIns[0].fromMs = 0;

// Проверка воздуха между приёмами: правило 3, не меньше 0,8 с.
for (let i = 1; i < punchIns.length; i += 1) {
  const gap = punchIns[i].fromMs - punchIns[i - 1].toMs;
  if (gap < 800) {
    console.warn(`  ! между зумами ${i} и ${i + 1} всего ${gap} мс — меньше 0,8 с`);
  }
}

const edit = {
  durationMs,
  // Дубль со звуком после npm run voice: исходник записан на −29,6 LUFS, в
  // ленте он прозвучал бы тише соседей. Картинка скопирована без перекодирования,
  // take.mp4 не тронут — правило 4 инструкции.
  speakerSrc: "take-voice.mp4",
  // Студии нет — вырезка заблокирована, — поэтому фирменный тёплый грейд
  // ложится прямо на дубль. После T0 здесь стоял бы false.
  gradeSpeaker: true,
  captionsFile: "captions.json",
  drift: 0.04,
  speakerFocusY: EYES,
  // Субтитры на чёрной футболке, а не на 53% из THEME: там у этого дубля
  // глаза. 80% — ниже подбородка при любом зуме и выше интерфейса Reels,
  // который начинается с 83%. Белое на чёрном к тому же читается лучше.
  captionTopPct: CAPTIONS,
  punchIns,
  splits: [],
  stickers: [],
};

fs.writeFileSync("public/edit.json", JSON.stringify(edit, null, 2) + "\n");

const fmt = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;
console.log(`\n  public/edit.json: ${(durationMs / 1000).toFixed(2)} с, зумов ${punchIns.length}\n`);
PUNCHES.forEach((p, i) => {
  console.log(`  ${fmt(punchIns[i].fromMs)}–${fmt(punchIns[i].toMs)}  ×${p.scale}  «${p.phrase}»`);
});
console.log("");

// Превращает captions.json (из remotion/scripts/transcribe.mjs) в массив WORDS для HTML-шаблонов.
// Запуск: node captions-to-words.mjs ../remotion/public/captions.json > words.js
import fs from "node:fs";
const caps = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const words = caps
  .map((c) => [c.text.trim(), +(c.startMs / 1000).toFixed(2), +(c.endMs / 1000).toFixed(2)])
  .filter(([w]) => w.length);
console.log("const WORDS = " + JSON.stringify(words) + ";");
console.log("// в шаблоне замени addCaptions(tl, DEMO_WORDS) на addCaptions(tl, WORDS)");

// Транскрипция речи → public/captions.json (пословные тайминги, русский).
// Запуск: node scripts/transcribe.mjs public/speaker.mp4 public/captions.json
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const input = process.argv[2] ?? "public/speaker.mp4";
const out = process.argv[3] ?? "public/captions.json";
const whisperPath = path.join(process.cwd(), "whisper.cpp");
const version = "1.5.5";
const model = "medium"; // для русского medium заметно точнее small

await installWhisperCpp({ to: whisperPath, version });
await downloadWhisperModel({ model, folder: whisperPath });

const wav = path.join(process.cwd(), ".tmp-16k.wav");
execSync(`ffmpeg -y -i "${input}" -ar 16000 -ac 1 "${wav}"`, { stdio: "inherit" });

const whisperCppOutput = await transcribe({
  inputPath: wav,
  whisperPath,
  whisperCppVersion: version,
  model,
  language: "ru",
  tokenLevelTimestamps: true,
});

const { captions } = toCaptions({ whisperCppOutput });
fs.writeFileSync(out, JSON.stringify(captions, null, 2));
fs.unlinkSync(wav);
console.log(`✓ ${captions.length} слов → ${out}. Проверь опечатки в JSON перед рендером.`);

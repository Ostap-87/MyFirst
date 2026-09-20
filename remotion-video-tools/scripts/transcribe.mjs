#!/usr/bin/env node
// Расшифровывает аудиодорожку в пословные субтитры для KaraokeCaptions.
//
//   npm run transcribe -- --audio public/audio/reel-01.wav
//   npm run transcribe -- --audio ... --model medium --out data/captions-reel-01.json
//
// Работает локально через whisper.cpp: ни ключей, ни отправки аудио наружу.
// Первый запуск скачивает модель (base ≈ 150 МБ, medium ≈ 1,5 ГБ) в ./whisper.cpp —
// эта папка в .gitignore, в репозиторий модели не попадают.
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { lowConfidenceWords, mergeIntoWords } from "./captions-utils.mjs";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ROOT, fail, parseArgs, write } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.audio || args.audio === true) {
  fail(
    "Укажите аудиофайл: npm run transcribe -- --audio public/audio/reel.wav\n" +
      "    Модель: --model base | small | medium | large-v3 (по умолчанию small)\n" +
      "    Язык:   --language ru (по умолчанию ru)",
  );
}

const audioPath = resolve(ROOT, String(args.audio));
if (!existsSync(audioPath)) {
  fail(`Аудиофайл не найден: ${audioPath}`);
}

// whisper.cpp принимает только 16 кГц моно WAV — остальное конвертируем ffmpeg.
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  fail(
    "Не найден ffmpeg — он нужен, чтобы привести аудио к 16 кГц моно WAV.\n" +
      "    macOS: brew install ffmpeg    Ubuntu: sudo apt install ffmpeg",
  );
}

const model = typeof args.model === "string" ? args.model : "small";
const language = typeof args.language === "string" ? args.language : "ru";
const output = resolve(
  ROOT,
  typeof args.out === "string" ? args.out : "data/captions.json",
);
const whisperPath = resolve(ROOT, "whisper.cpp");
// Версия whisper.cpp указывается и при установке, и при запуске: transcribe
// по ней ищет исполняемый файл (в 1.5.x и 1.6+ он лежит по разным путям).
const whisperVersion = "1.5.5";

const prepared = resolve(ROOT, "out/transcribe-16khz.wav");
mkdirSync(dirname(prepared), { recursive: true });

console.log("\n  Готовлю аудио (16 кГц, моно)…");
execFileSync(
  "ffmpeg",
  ["-y", "-i", audioPath, "-ar", "16000", "-ac", "1", prepared],
  {
    stdio: "ignore",
  },
);

console.log(`  Проверяю whisper.cpp в ${whisperPath}…`);
await installWhisperCpp({ to: whisperPath, version: whisperVersion });

console.log(
  `  Проверяю модель «${model}»… (первый раз может занять несколько минут)`,
);
await downloadWhisperModel({ folder: whisperPath, model });

console.log("  Расшифровываю…");
const { transcription } = await transcribe({
  model,
  whisperPath,
  whisperCppVersion: whisperVersion,
  inputPath: prepared,
  tokenLevelTimestamps: true,
  language,
});

const { captions: tokens } = toCaptions({
  whisperCppOutput: { transcription },
});

// whisper отдаёт под-словные токены («вы|лож|ил»); в режиме одного слова в
// кадре это превращается в обрывки, поэтому склеиваем их в слова.
const captions = args["raw-tokens"] ? tokens : mergeIntoWords(tokens);

mkdirSync(dirname(output), { recursive: true });
write(output, `${JSON.stringify(captions, null, 2)}\n`);

const seconds = captions.length
  ? (captions[captions.length - 1].endMs / 1000).toFixed(1)
  : "0";
const doubtful = lowConfidenceWords(captions);

console.log(`
  ✔ ${args["raw-tokens"] ? "Токенов" : "Слов"}: ${captions.length}, длительность ${seconds} с  ->  ${output}
    сырых токенов whisper: ${tokens.length} (вернуть их — флаг --raw-tokens)
${
  doubtful.length
    ? `
  ⚠ Проверьте глазами ${doubtful.length} слов с низкой уверенностью:
      ${doubtful
        .slice(0, 8)
        .map((w) => `${(w.startMs / 1000).toFixed(1)}с «${w.text.trim()}»`)
        .join(", ")}
    Отдельно проверьте хвост дорожки: на музыке и шуме whisper дописывает
    выдуманную фразу, и она приезжает в кадр как настоящая реплика.`
    : ""
}
  Подключить в композиции:

    import captions from "../../../data/captions.json";
    <KaraokeCaptions theme={theme} captions={captions as Caption[]} mode="word" />
`);

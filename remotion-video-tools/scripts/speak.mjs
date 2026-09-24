#!/usr/bin/env node
// Озвучка текста голосом владельца: синтез, укладка в хронометраж,
// студийная чистка и расшифровка — одной командой.
//
//   npm run speak -- --text "Текст реплики" --voice <id>
//   npm run speak -- --text-file data/promo-script-en.txt --voice <id> --fit 44.6
//   npm run speak -- --in out/tts/dubl.wav --fit 44.6      доводка готового дубля
//   npm run speak -- --clone public/local/sample.mp3 --name "Ostap GTT"
//   npm run speak -- --voices                              что есть в аккаунте
//
// ——— Два режима и почему их два ———
//
// Синтез идёт через ElevenLabs: у него есть публичный API и клонирование
// голоса по образцу. У Higgsfield публичного API для речи нет вообще —
// Seed Audio живёт только внутри MCP, и скриптом его не вызвать. Голос,
// склонированный там, остаётся доступен только в диалоге с ассистентом.
//
// Поэтому режим `--in` работает без ключа: берёт готовый дубль, откуда бы
// он ни пришёл, и доводит его до дорожки, которую можно класть в композицию.
// Это ровно та половина работы, которая от поставщика синтеза не зависит.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

const USAGE = `Озвучка текста голосом из ElevenLabs.

  npm run speak -- --text "реплика" --voice <id>
  npm run speak -- --text-file <файл> --voice <id> --fit 44.6

    --out <файл>       куда писать (по умолчанию public/audio/speak.wav)
    --fit <секунды>    уложить в хронометраж, подтягивая паузы
    --model <id>       eleven_multilingual_v2 (по умолчанию) | eleven_v3
    --lang <код>       ru, en, zh… — подсказка модели, не обязательна
    --captions         сразу расшифровать в data/captions-<имя>.json
    --preset <имя>     пресет чистки: studio (по умолчанию) | light | strong
    --raw              не чистить и не выравнивать громкость

  Доводка готового дубля, ключ не нужен:

  npm run speak -- --in <файл> --fit 44.6

  Разовое клонирование голоса по образцу:

  npm run speak -- --clone <файл> --name "Имя"

  Список голосов аккаунта:

  npm run speak -- --voices

Ключ берётся из ELEVENLABS_API_KEY. Как его завести — docs/voice-cloning.md.`;

const API = "https://api.elevenlabs.io/v1";

const key = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) {
    fail(
      "Нет ключа: переменная ELEVENLABS_API_KEY пуста.\n" +
        "    Положите ключ в секреты репозитория, порядок — в docs/voice-cloning.md.\n" +
        "    Готовый дубль можно довести и без ключа: npm run speak -- --in <файл>",
    );
  }
  return k;
};

/**
 * Ошибку API показываем целиком.
 *
 * ElevenLabs объясняет отказ в теле ответа: не тот тариф, кончилась квота,
 * голос не принадлежит аккаунту. По одному коду 400 не понять ничего.
 */
const request = async (path, init = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": key(), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    fail(`ElevenLabs ответил ${res.status} на ${path}\n    ${text.slice(0, 500)}`);
  }
  return res;
};

const ff = (a) => execFileSync("ffmpeg", a, { stdio: ["ignore", "pipe", "pipe"] });

const duration = (file) =>
  Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
    ]).toString().trim(),
  );

// ——— Список голосов ———

if (args.voices) {
  const res = await request("/voices");
  const { voices } = await res.json();
  console.log(`\n  Голосов в аккаунте: ${voices.length}\n`);
  for (const v of voices) {
    const own = v.category === "cloned" || v.category === "professional" ? " ← свой" : "";
    console.log(`    ${v.voice_id}  ${v.name}${own}`);
  }
  console.log("");
  process.exit(0);
}

// ——— Клонирование ———

if (args.clone) {
  const sample = resolve(ROOT, String(args.clone));
  if (!existsSync(sample)) fail(`Образец не найден: ${sample}`);
  const name = String(args.name ?? "");
  if (!name) fail("Клону нужно имя: --name \"Имя голоса\"");

  /**
   * Образец отдаём как есть.
   *
   * Чистить его нельзя: клонер копирует всё, что слышит, и компрессор с
   * шумодавом уедут в сам голос. Обработка накладывается на синтез, а не
   * на образец. Единственное, что уместно, — remove_background_noise на
   * стороне ElevenLabs, но и это только для явно шумной записи.
   */
  const form = new FormData();
  form.append("name", name);
  form.append("files", new Blob([readFileSync(sample)]), sample.split("/").pop());
  if (args.denoise) form.append("remove_background_noise", "true");

  console.log(`\n  Клонирую по образцу: ${(statSync(sample).size / 1048576).toFixed(1)} МБ, ${duration(sample).toFixed(0)} с`);
  const res = await request("/voices/add", { method: "POST", body: form });
  const out = await res.json();
  console.log(`\n  ✔ Голос создан: ${out.voice_id}`);
  console.log(`    Дальше: npm run speak -- --text "…" --voice ${out.voice_id}\n`);
  process.exit(0);
}

// ——— Синтез или доводка ———

const hasText = Boolean(args.text || args["text-file"]);
if (!hasText && !args.in) fail(USAGE);

const outPath = resolve(
  ROOT,
  String(args.out ?? (args.in
    ? `public/audio/${String(args.in).split("/").pop().replace(/\.[^.]+$/, "")}-clean.wav`
    : "public/audio/speak.wav")),
);
mkdirSync(dirname(outPath), { recursive: true });

const stage = outPath.replace(/\.wav$/, ".stage.wav");
let source;

if (hasText) {
  if (!args.voice || args.voice === true) {
    fail("Укажите голос: --voice <id>. Что есть в аккаунте — npm run speak -- --voices");
  }
  const text = args["text-file"]
    ? readFileSync(resolve(ROOT, String(args["text-file"])), "utf8").trim()
    : String(args.text);
  if (!text) fail("Текст пустой");

  const model = String(args.model ?? "eleven_multilingual_v2");
  console.log(`\n  Синтез: ${text.length} знаков, модель ${model}`);

  /**
   * Просим pcm_48000, а не mp3.
   *
   * Дорожка идёт дальше через чистку и сведение, и лишний цикл сжатия на
   * входе слышен на согласных. 48 кГц — та же частота, что у остального
   * звука в проекте, пересчёта не будет.
   */
  const body = { text, model_id: model };
  if (args.lang && args.lang !== true) body.language_code = String(args.lang);

  const res = await request(
    `/text-to-speech/${encodeURIComponent(String(args.voice))}?output_format=pcm_48000`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const pcm = Buffer.from(await res.arrayBuffer());
  const rawPath = outPath.replace(/\.wav$/, ".raw.pcm");
  writeFileSync(rawPath, pcm);
  ff(["-loglevel", "error", "-y", "-f", "s16le", "-ar", "48000", "-ac", "1",
      "-i", rawPath, "-c:a", "pcm_s16le", stage]);
  execFileSync("rm", ["-f", rawPath]);
  source = stage;
  console.log(`  Готов дубль: ${duration(source).toFixed(2)} с`);
} else {
  source = resolve(ROOT, String(args.in));
  if (!existsSync(source)) fail(`Файл не найден: ${source}`);
  console.log(`\n  Дубль: ${source.replace(ROOT + "/", "")}, ${duration(source).toFixed(2)} с`);
}

// ——— Укладка в хронометраж ———

/**
 * Паузы укорачиваются, а не вырезаются.
 *
 * Речь без пауз звучит загнанной, и на слух это хуже, чем лишняя секунда.
 * `stop_duration` у silenceremove — это длина, до которой пауза
 * укорачивается, а не порог срабатывания: чем больше число, тем длиннее
 * остаются паузы и тем длиннее дорожка.
 *
 * Подбираем делением пополам: зависимость монотонная, но нелинейная —
 * считать её формулой не выйдет, а десяти проходов ffmpeg хватает с
 * запасом.
 */
const fitTo = (file, target, dest) => {
  const trim = (cap, to) => {
    ff(["-loglevel", "error", "-y", "-i", file, "-af",
        `silenceremove=stop_periods=-1:stop_duration=${cap.toFixed(3)}:stop_threshold=-35dB:detection=peak`,
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", to]);
    return duration(to);
  };

  const probe = dest.replace(/\.wav$/, ".probe.wav");
  let lo = 0.05, hi = 2.0, best = null, bestGap = Infinity;
  for (let i = 0; i < 10; i += 1) {
    const cap = (lo + hi) / 2;
    const got = trim(cap, probe);
    const gap = Math.abs(got - target);
    if (gap < bestGap) { bestGap = gap; best = cap; }
    if (got > target) hi = cap; else lo = cap;
  }
  const got = trim(best, dest);
  execFileSync("rm", ["-f", probe]);
  return { cap: best, got };
};

let fitted = source;
if (args.fit && args.fit !== true) {
  const target = Number(args.fit);
  const was = duration(source);
  if (was <= target) {
    console.log(`  Укладка не нужна: ${was.toFixed(2)} с уже короче ${target} с`);
  } else {
    fitted = outPath.replace(/\.wav$/, ".fit.wav");
    const { cap, got } = fitTo(source, target, fitted);
    console.log(`  Уложил: ${was.toFixed(2)} → ${got.toFixed(2)} с (паузы до ${cap.toFixed(2)} с)`);
  }
}

// ——— Студийная чистка ———

if (args.raw) {
  ff(["-loglevel", "error", "-y", "-i", fitted, "-ar", "48000", "-ac", "1",
      "-c:a", "pcm_s16le", outPath]);
  console.log("  --raw: чистка пропущена");
} else {
  // Через тот же voice.mjs, что чистит живые записи: у синтеза те же
  // болячки (неровная громкость, шипящие после подъёма верха), и
  // разводить две цепочки значит разойтись в звучании дорожек.
  execFileSync("node", [resolve(ROOT, "scripts/voice.mjs"),
    "--in", fitted, "--out", outPath,
    "--preset", String(args.preset ?? "studio")], { stdio: "inherit" });
}

for (const tmp of [stage, fitted]) {
  if (tmp && tmp !== outPath && existsSync(tmp)) execFileSync("rm", ["-f", tmp]);
}

// ——— Расшифровка ———

if (args.captions) {
  const name = outPath.split("/").pop().replace(/\.wav$/, "");
  const capPath = `data/captions-${name}.json`;
  console.log("\n  Расшифровываю…");
  execFileSync("node", [resolve(ROOT, "scripts/transcribe.mjs"),
    "--audio", outPath,
    "--language", String(args.lang && args.lang !== true ? args.lang : "ru"),
    "--out", capPath], { stdio: "inherit" });
}

console.log(`\n  ✔ ${outPath.replace(ROOT + "/", "")}  (${duration(outPath).toFixed(2)} с)\n`);

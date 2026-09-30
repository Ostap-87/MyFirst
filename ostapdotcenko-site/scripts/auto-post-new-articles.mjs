// Автопостинг новых статей блога в Facebook (RU) + LinkedIn (EN) сразу после
// деплоя, без ручного запуска post-to-facebook.mjs для каждой статьи.
//
// Как это работает: скрипт запускается из infra/deploy-ostapdotcenko.sh на
// VPS после каждого успешного билда. Он сравнивает список slug'ов из
// src/i18n/ru.ts со state-файлом (по одному slug на строку) вне репозитория
// (например /opt/.ostapdotcenko-posted-slugs) — какие уже были отправлены в
// соцсети. Для каждого нового slug'а, если он уже переведён на английский
// (есть в src/i18n/en.ts — без этого post-to-facebook.mjs упадёт), вызывает
// post-to-facebook.mjs <slug>, и только при успехе (exit code 0) дописывает
// slug в state-файл. Если перевода ещё нет — slug пропускается и будет снова
// проверен на следующем деплое (retry, а не потеря).
//
// Использование: node scripts/auto-post-new-articles.mjs <путь-к-state-файлу>
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const stateFile = process.argv[2];
if (!stateFile) {
  console.error("Usage: node scripts/auto-post-new-articles.mjs <state-file-path>");
  process.exit(1);
}

const ruSource = readFileSync(join(root, "src/i18n/ru.ts"), "utf-8");
const enSource = readFileSync(join(root, "src/i18n/en.ts"), "utf-8");

const slugRegex = /slug:\s*"([^"]+)"/g;
const ruSlugs = [...ruSource.matchAll(slugRegex)].map((m) => m[1]);
const enSlugs = new Set([...enSource.matchAll(slugRegex)].map((m) => m[1]));

if (!existsSync(stateFile)) {
  // Первый запуск на новой машине/после переустановки — без базового файла
  // это разослало бы в соцсети ВСЕ уже существующие статьи разом. Base-файл
  // должен быть создан заранее (см. infra/README.md) со списком уже
  // опубликованных на момент внедрения slug'ов.
  console.error(
    `State file ${stateFile} not found — refusing to run to avoid mass-posting all existing articles. ` +
      "Create it first with the slugs already handled (see infra/README.md)."
  );
  process.exit(1);
}

const posted = new Set(
  readFileSync(stateFile, "utf-8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
);

let postedCount = 0;
for (const slug of ruSlugs) {
  if (posted.has(slug)) continue;
  if (!enSlugs.has(slug)) {
    console.log(`Skipping "${slug}" — not yet translated to English, will retry next deploy.`);
    continue;
  }
  console.log(`New article detected: "${slug}" — posting to Facebook (RU) + LinkedIn (EN)...`);
  const result = spawnSync("node", ["scripts/post-to-facebook.mjs", slug], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status === 0) {
    appendFileSync(stateFile, `${slug}\n`);
    postedCount++;
  } else {
    console.error(`Failed to post "${slug}" (exit ${result.status}) — will retry next deploy.`);
  }
}

if (postedCount === 0) {
  console.log("No new articles to post.");
}

#!/usr/bin/env node
// Очередь публикаций Instagram: положить готовый контент и посмотреть план.
//
//   npm run ig:add -- --carousel robotics-expedition --at "2026-09-25 10:00" \
//     --caption-file data/caption-robotics.txt
//   npm run ig:add -- --reel out/talking-head.mp4 --at "2026-09-26 19:00" --caption "текст"
//   npm run ig:queue
//
// Файлы копируются в instagram/posts/<дата>-<slug>/ и остаются там навсегда:
// по архиву всегда видно, что именно было опубликовано. Ссылки не
// переиспользуются — пересобранная карусель кладётся в новую папку, иначе
// подмена файла ломает картинки в уже вышедшем посте.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const REPO_ROOT = resolve(ROOT, "..");
const IG_DIR = resolve(REPO_ROOT, "instagram");
const QUEUE_FILE = resolve(IG_DIR, "queue.json");
const PUBLISHED_FILE = resolve(IG_DIR, "published.json");

const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, data) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");

/** «2026-09-25 10:00» (московское время) -> ISO с нужным смещением. */
const parseMoscowTime = (input) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(
    String(input).trim(),
  );
  if (!match) {
    fail(
      `Дата «${input}» не разобрана. Формат: --at "2026-09-25 10:00" (московское время).`,
    );
  }
  const [, year, month, day, hour, minute] = match;
  // Москва — UTC+3 круглый год, перехода на летнее время нет.
  return `${year}-${month}-${day}T${hour}:${minute}:00+03:00`;
};

const formatMoscow = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ——— Показ очереди и архива ———

if (args.list || process.argv.length === 2) {
  const queue = readJson(QUEUE_FILE).posts;
  const published = readJson(PUBLISHED_FILE).posts;

  console.log(`\n  В очереди: ${queue.length}`);
  for (const post of queue) {
    const mark =
      post.status === "failed" ? "✖" : post.status === "published" ? "✔" : "·";
    console.log(
      `    ${mark} ${formatMoscow(post.publishAt)}  ${post.type.padEnd(8)}  ${post.slug}` +
        (post.error ? `\n        ошибка: ${post.error}` : ""),
    );
  }

  console.log(`\n  Опубликовано: ${published.length}`);
  for (const post of published.slice(-10)) {
    console.log(
      `    ✔ ${formatMoscow(post.publishedAt)}  ${post.type.padEnd(8)}  ${post.slug}  id: ${post.mediaId}`,
    );
  }
  console.log("");
  process.exit(0);
}

// ——— Добавление в очередь ———

if (!args.at || args.at === true) {
  fail('Укажите время публикации: --at "2026-09-25 10:00" (московское время)');
}

const publishAt = parseMoscowTime(args.at);

const caption =
  typeof args["caption-file"] === "string"
    ? read(resolve(ROOT, args["caption-file"])).trim()
    : typeof args.caption === "string"
      ? args.caption
      : "";

if (!caption) {
  fail(
    "Пост без подписи публиковать нельзя: --caption «текст» или --caption-file <файл>",
  );
}
if (caption.length > 2200) {
  fail(`Подпись длиннее лимита Instagram: ${caption.length} символов из 2200.`);
}

const date = publishAt.slice(0, 10);

/** Собирает папку поста и запись в очереди. */
const addPost = ({ slug, type, files }) => {
  const folder = `${date}-${slug}`;
  const dir = resolve(IG_DIR, "posts", folder);

  if (existsSync(dir) && !args.force) {
    fail(
      `Папка instagram/posts/${folder} уже существует. Перезаписать: --force`,
    );
  }

  mkdirSync(dir, { recursive: true });
  const copied = files.map((file) => {
    const name = basename(file);
    copyFileSync(file, resolve(dir, name));
    return name;
  });

  writeFileSync(resolve(dir, "caption.txt"), `${caption}\n`, "utf8");

  const meta = {
    slug,
    type,
    folder,
    publishAt,
    status: "queued",
    files: copied,
    createdAt: new Date().toISOString(),
  };
  writeJson(resolve(dir, "meta.json"), meta);

  const queue = readJson(QUEUE_FILE);
  queue.posts = queue.posts.filter((post) => post.folder !== folder);
  queue.posts.push(meta);
  // Сортировка по времени: публикующий скрипт берёт посты сверху.
  queue.posts.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  writeJson(QUEUE_FILE, queue);

  console.log(`
  ✔ В очереди: ${folder}
    тип: ${type}, файлов: ${copied.length}
    публикация: ${formatMoscow(publishAt)} (МСК)
    подпись: ${caption.length} символов

  Проверить план:   npm run ig:queue
  Опубликовать сейчас, не дожидаясь расписания:
      npm run publish -- --post ${folder}
`);
};

if (args.carousel && args.carousel !== true) {
  const slidesDir = resolve(ROOT, `out/carousel/${args.carousel}`);
  if (!existsSync(slidesDir)) {
    fail(
      `Слайды не найдены: ${slidesDir}\n    Сначала соберите карусель: npm run carousel -- ...`,
    );
  }

  const slides = readdirSync(slidesDir)
    .filter((file) => /^\d{2}-[a-z]+\.png$/.test(file))
    .sort();

  if (slides.length < 2 || slides.length > 10) {
    fail(`В карусели Instagram от 2 до 10 слайдов, а здесь ${slides.length}.`);
  }

  addPost({
    slug: String(args.carousel),
    type: "carousel",
    files: slides.map((file) => resolve(slidesDir, file)),
  });
  process.exit(0);
}

if (args.reel && args.reel !== true) {
  const file = resolve(ROOT, String(args.reel));
  if (!existsSync(file)) fail(`Видео не найдено: ${file}`);

  addPost({
    slug: typeof args.slug === "string" ? args.slug : basename(file, ".mp4"),
    type: "reel",
    files: [file],
  });
  process.exit(0);
}

fail(
  "Укажите, что ставим в очередь:\n" +
    "      --carousel <имя папки в out/carousel>\n" +
    "      --reel <путь к mp4> [--slug имя]\n" +
    '    Время: --at "2026-09-25 10:00" (МСК)\n' +
    "    Подпись: --caption «текст» или --caption-file <файл>\n" +
    "    Посмотреть очередь: npm run ig:queue",
);

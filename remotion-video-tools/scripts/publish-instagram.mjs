#!/usr/bin/env node
// Публикация в Instagram через официальный Graph API.
//
//   npm run publish -- --due --dry-run          что вышло бы сейчас по расписанию
//   npm run publish -- --due                    опубликовать всё, чему наступило время
//   npm run publish -- --post 2026-09-25-robotics-expedition
//
// Контент берётся из очереди instagram/queue.json, файлы — из
// instagram/posts/<папка>/. Что настроить один раз (аккаунт, приложение Meta,
// токен) — docs/publishing.md.
//
// Instagram НЕ принимает файлы напрямую: он забирает медиа сам по публичной
// HTTPS-ссылке. Файлы уже лежат в репозитории, поэтому в API уходят их
// raw-ссылки — тот же механизм, что работает для картинок Telegram-постов.
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);

// Секреты только из окружения: токен даёт право публиковать от имени
// аккаунта, в репозитории ему не место.
const token = process.env.IG_ACCESS_TOKEN;
const igUserId = process.env.IG_USER_ID;

if (!dryRun && (!token || !igUserId)) {
  fail(
    "Нет доступа к Instagram. Задайте переменные окружения:\n" +
      "      IG_ACCESS_TOKEN — долгоживущий токен Meta\n" +
      "      IG_USER_ID      — id Instagram Business аккаунта\n" +
      "    Как их получить — docs/publishing.md\n" +
      "    Проверить план без публикации: --dry-run",
  );
}

const REPO = process.env.IG_PUBLIC_REPO ?? "Ostap-87/MyFirst";
const BRANCH = process.env.IG_PUBLIC_BRANCH ?? "master";
const REPO_ROOT = resolve(ROOT, "..");
const IG_DIR = resolve(REPO_ROOT, "instagram");
const QUEUE_FILE = resolve(IG_DIR, "queue.json");
const PUBLISHED_FILE = resolve(IG_DIR, "published.json");

const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, data) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const rawUrl = (path) =>
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

const formatMoscow = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const api = async (path, params) => {
  const response = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    const message =
      data.error?.error_user_msg ?? data.error?.message ?? response.statusText;
    throw new Error(`Instagram API: ${message}`);
  }
  return data;
};

/**
 * Ждём, пока Instagram скачает и обработает медиа.
 * Публиковать контейнер раньше нельзя — вернётся ошибка, а пост не появится.
 */
const waitForContainer = async (containerId, attempts = 30) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const url = new URL(`https://graph.facebook.com/v21.0/${containerId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", token);

    const data = await (await fetch(url)).json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(
        `Instagram не смог обработать медиа: ${data.status ?? data.status_code}`,
      );
    }
    await new Promise((done) => setTimeout(done, 4000));
  }
  throw new Error("Instagram не обработал медиа за отведённое время.");
};

/** Переносит пост из очереди в архив: по нему видно, что и когда вышло. */
const archive = (post, mediaId) => {
  const queue = readJson(QUEUE_FILE);
  queue.posts = queue.posts.filter((item) => item.folder !== post.folder);
  writeJson(QUEUE_FILE, queue);

  const published = readJson(PUBLISHED_FILE);
  published.posts.push({
    ...post,
    status: "published",
    mediaId,
    publishedAt: new Date().toISOString(),
  });
  writeJson(PUBLISHED_FILE, published);
};

/** Отмечает неудачу в очереди, чтобы следующий запуск не бился о тот же пост молча. */
const markFailed = (post, message) => {
  const queue = readJson(QUEUE_FILE);
  const item = queue.posts.find((entry) => entry.folder === post.folder);
  if (item) {
    item.status = "failed";
    item.error = message;
    item.failedAt = new Date().toISOString();
  }
  writeJson(QUEUE_FILE, queue);
};

const publishCarousel = async (post) => {
  const paths = post.files.map(
    (file) => `instagram/posts/${post.folder}/${file}`,
  );
  const caption = read(
    resolve(IG_DIR, "posts", post.folder, "caption.txt"),
  ).trim();

  const children = [];
  for (const path of paths) {
    const container = await api(`${igUserId}/media`, {
      image_url: rawUrl(path),
      is_carousel_item: "true",
    });
    await waitForContainer(container.id);
    children.push(container.id);
    console.log(`      ✔ ${path.split("/").pop()}`);
  }

  const carousel = await api(`${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  await waitForContainer(carousel.id);

  const published = await api(`${igUserId}/media_publish`, {
    creation_id: carousel.id,
  });
  return published.id;
};

const publishReel = async (post) => {
  const path = `instagram/posts/${post.folder}/${post.files[0]}`;
  const caption = read(
    resolve(IG_DIR, "posts", post.folder, "caption.txt"),
  ).trim();

  const container = await api(`${igUserId}/media`, {
    media_type: "REELS",
    video_url: rawUrl(path),
    caption,
  });
  // Видео обрабатывается дольше картинок — опрашиваем статус вдвое дольше.
  await waitForContainer(container.id, 60);

  const published = await api(`${igUserId}/media_publish`, {
    creation_id: container.id,
  });
  return published.id;
};

// ——— Какие посты публикуем ———

const queue = readJson(QUEUE_FILE).posts;
const now = Date.now();

const selected = args.post
  ? queue.filter((post) => post.folder === String(args.post))
  : args.due
    ? queue.filter(
        (post) =>
          post.status === "queued" && new Date(post.publishAt).getTime() <= now,
      )
    : null;

if (!selected) {
  fail(
    "Укажите, что публикуем:\n" +
      "      --due                     всё, чему наступило время\n" +
      "      --post <папка>            конкретный пост\n" +
      "    Проверка без публикации: --dry-run\n" +
      "    Посмотреть очередь: npm run ig:queue",
  );
}

if (selected.length === 0) {
  console.log(
    args.post
      ? `\n  Пост «${args.post}» в очереди не найден. Посмотреть очередь: npm run ig:queue\n`
      : "\n  Публиковать нечего: постов с наступившим временем в очереди нет.\n",
  );
  process.exit(0);
}

console.log(`\n  К публикации: ${selected.length}`);
for (const post of selected) {
  const folder = resolve(IG_DIR, "posts", post.folder);
  if (!existsSync(folder))
    fail(`Папка поста пропала: instagram/posts/${post.folder}`);

  const caption = read(resolve(folder, "caption.txt")).trim();
  console.log(
    `    ${post.type.padEnd(8)} ${post.folder}` +
      `\n      время: ${formatMoscow(post.publishAt)} МСК, файлов: ${post.files.length}` +
      `, подпись: ${caption.length} символов`,
  );
  console.log(
    `      первая ссылка: ${rawUrl(`instagram/posts/${post.folder}/${post.files[0]}`)}`,
  );
}

if (dryRun) {
  console.log("\n  --dry-run: ничего не отправлено.\n");
  process.exit(0);
}

// ——— Публикация ———

let ok = 0;
for (const post of selected) {
  console.log(`\n  Публикую ${post.folder}…`);
  try {
    const mediaId =
      post.type === "carousel"
        ? await publishCarousel(post)
        : await publishReel(post);
    archive(post, mediaId);
    ok++;
    console.log(`  ✔ Опубликовано. id: ${mediaId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markFailed(post, message);
    console.error(`  ✖ ${post.folder}: ${message}`);
  }
}

console.log(
  `\n  Готово: ${ok} из ${selected.length}. Архив: instagram/published.json\n`,
);
// Ненулевой код, если что-то не прошло: в расписании это видно как красный прогон.
process.exit(ok === selected.length ? 0 : 1);

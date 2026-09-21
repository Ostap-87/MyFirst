#!/usr/bin/env node
// Публикация готовой карусели или Reels в Instagram через официальный Graph API.
//
//   npm run publish -- --carousel robotics-expedition --dry-run
//   npm run publish -- --carousel robotics-expedition --caption-file data/caption.txt
//   npm run publish -- --reel out/talking-head.mp4 --caption "текст"
//
// Что нужно настроить один раз (аккаунт, приложение Meta, токен) — docs/publishing.md.
//
// Instagram НЕ принимает файлы напрямую: он забирает медиа сам по публичной
// HTTPS-ссылке. Поэтому слайды сначала уезжают в публичную папку репозитория,
// а в Graph API идут их raw-ссылки — тот же механизм, что уже работает для
// картинок Telegram-постов в tg-images.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);

// Секреты берём только из окружения: токен даёт право публиковать от имени
// аккаунта, в репозитории ему не место.
const token = process.env.IG_ACCESS_TOKEN;
const igUserId = process.env.IG_USER_ID;

if (!dryRun && (!token || !igUserId)) {
  fail(
    "Нет доступа к Instagram. Задайте переменные окружения:\n" +
      "      IG_ACCESS_TOKEN — долгоживущий токен Meta\n" +
      "      IG_USER_ID      — id Instagram Business аккаунта\n" +
      "    Как их получить — docs/publishing.md\n" +
      "    Проверить сборку без публикации: --dry-run",
  );
}

/** Репозиторий и ветка, из которых Instagram забирает медиа. */
const REPO = process.env.IG_PUBLIC_REPO ?? "Ostap-87/MyFirst";
const BRANCH = process.env.IG_PUBLIC_BRANCH ?? "master";
const PUBLIC_DIR = "instagram";
const REPO_ROOT = resolve(ROOT, "..");

const rawUrl = (path) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

const api = async (path, params) => {
  const response = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    const message = data.error?.error_user_msg ?? data.error?.message ?? response.statusText;
    fail(`Instagram API: ${message}`);
  }
  return data;
};

/**
 * Ждём, пока Instagram скачает и обработает медиа.
 * Публиковать контейнер раньше нельзя — вернётся ошибка, а картинка так и
 * не появится. Видео обрабатывается заметно дольше картинок.
 */
const waitForContainer = async (containerId, attempts = 30) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const url = new URL(`https://graph.facebook.com/v21.0/${containerId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", token);

    const data = await (await fetch(url)).json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      fail(`Instagram не смог обработать медиа: ${data.status ?? data.status_code}`);
    }
    await new Promise((done) => setTimeout(done, 4000));
  }
  fail("Instagram не обработал медиа за отведённое время.");
};

/** Выкладывает файлы в публичную ветку — без этого ссылки не откроются. */
const pushAssets = (paths, message) => {
  execFileSync("git", ["add", ...paths.map((path) => resolve(REPO_ROOT, path))], {
    cwd: REPO_ROOT,
  });
  execFileSync("git", ["commit", "-m", message], { cwd: REPO_ROOT });
  execFileSync("git", ["push", "origin", `HEAD:${BRANCH}`], { cwd: REPO_ROOT });
};

const caption =
  typeof args["caption-file"] === "string"
    ? read(resolve(ROOT, args["caption-file"])).trim()
    : typeof args.caption === "string"
      ? args.caption
      : "";

if (args.carousel && args.carousel !== true) {
  const slidesDir = resolve(ROOT, `out/carousel/${args.carousel}`);
  if (!existsSync(slidesDir)) {
    fail(`Слайды не найдены: ${slidesDir}\n    Сначала соберите карусель: npm run carousel -- ...`);
  }

  const slides = readdirSync(slidesDir)
    .filter((file) => /^\d{2}-[a-z]+\.png$/.test(file))
    .sort();

  if (slides.length < 2 || slides.length > 10) {
    fail(`В карусели Instagram от 2 до 10 слайдов, а здесь ${slides.length}.`);
  }

  // У каждой публикации свой набор ссылок: так перевыпуск карусели не ломает
  // картинки в уже опубликованных постах.
  const publicDir = resolve(REPO_ROOT, PUBLIC_DIR, args.carousel);
  const paths = slides.map((file) => `${PUBLIC_DIR}/${args.carousel}/${file}`);

  // Копируем только при реальной публикации: проверочный прогон не должен
  // оставлять за собой файлы в репозитории.
  if (!dryRun) {
    mkdirSync(publicDir, { recursive: true });
    slides.forEach((file) => copyFileSync(resolve(slidesDir, file), resolve(publicDir, file)));
  }

  console.log(`\n  Карусель: ${args.carousel}, слайдов: ${slides.length}`);
  console.log(`  Подпись: ${caption ? `${caption.length} символов` : "пусто"}`);
  paths.forEach((path, index) => console.log(`    ${index + 1}. ${rawUrl(path)}`));

  if (dryRun) {
    console.log("\n  --dry-run: ничего не отправлено и не запушено.\n");
    process.exit(0);
  }

  console.log("\n  Выкладываю слайды в репозиторий…");
  pushAssets(paths, `Add Instagram carousel assets: ${args.carousel}`);

  console.log("  Создаю контейнеры слайдов…");
  const children = [];
  for (const path of paths) {
    const container = await api(`${igUserId}/media`, {
      image_url: rawUrl(path),
      is_carousel_item: "true",
    });
    await waitForContainer(container.id);
    children.push(container.id);
    console.log(`    ✔ ${basename(path)}`);
  }

  console.log("  Собираю карусель…");
  const carousel = await api(`${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  await waitForContainer(carousel.id);

  const published = await api(`${igUserId}/media_publish`, { creation_id: carousel.id });
  console.log(`\n  ✔ Опубликовано. id: ${published.id}\n`);
  process.exit(0);
}

if (args.reel && args.reel !== true) {
  const file = resolve(ROOT, String(args.reel));
  if (!existsSync(file)) fail(`Видео не найдено: ${file}`);

  const publicDir = resolve(REPO_ROOT, PUBLIC_DIR, "reels");
  const name = basename(file);
  const path = `${PUBLIC_DIR}/reels/${name}`;

  if (!dryRun) {
    mkdirSync(publicDir, { recursive: true });
    copyFileSync(file, resolve(publicDir, name));
  }

  console.log(`\n  Reels: ${name}`);
  console.log(`  Ссылка: ${rawUrl(path)}`);
  console.log(`  Подпись: ${caption ? `${caption.length} символов` : "пусто"}`);

  if (dryRun) {
    console.log("\n  --dry-run: ничего не отправлено и не запушено.\n");
    process.exit(0);
  }

  console.log("\n  Выкладываю видео в репозиторий…");
  pushAssets([path], `Add Instagram reel asset: ${name}`);

  const container = await api(`${igUserId}/media`, {
    media_type: "REELS",
    video_url: rawUrl(path),
    caption,
  });
  // Видео обрабатывается дольше картинок — опрашиваем статус вдвое дольше.
  await waitForContainer(container.id, 60);

  const published = await api(`${igUserId}/media_publish`, { creation_id: container.id });
  console.log(`\n  ✔ Опубликовано. id: ${published.id}\n`);
  process.exit(0);
}

fail(
  "Укажите, что публикуем:\n" +
    "      --carousel <имя папки в out/carousel>\n" +
    "      --reel <путь к mp4>\n" +
    "    Подпись: --caption «текст» или --caption-file <файл>\n" +
    "    Проверка без публикации: --dry-run",
);

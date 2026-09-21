#!/usr/bin/env node
// Публикация в Instagram через официальный Graph API.
//
//   npm run publish -- --due --dry-run              план по всем трём аккаунтам
//   npm run publish -- --due                        опубликовать всё, чему наступило время
//   npm run publish -- --brand aura --due           только аккаунт Aura
//   npm run publish -- --brand gtt --post 2026-09-25-carousel-robotics-expedition
//
// У каждого бренда свой аккаунт и свой токен: IG_TOKEN_GTT, IG_TOKEN_AURA,
// IG_TOKEN_PERSONAL (и IG_USER_* с id аккаунта). Перепутанный токен означает
// пост не в том аккаунте, поэтому бренд берётся из папки очереди, а не из
// аргумента «по умолчанию».
//
// Instagram НЕ принимает файлы напрямую: он забирает медиа сам по публичной
// HTTPS-ссылке. Файлы уже лежат в репозитории, поэтому в API уходят их
// raw-ссылки — тот же механизм, что работает для картинок Telegram-постов.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  archivePost,
  BRANDS,
  brandList,
  CHANNELS,
  formatMoscow,
  markPostFailed,
  postPath,
  kindDir,
  mediaKind,
  readQueue,
  resolveBrandKey,
} from "./channels.mjs";
import { fail, parseArgs, read } from "./lib.mjs";

const CHANNEL = "instagram";
const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);

const REPO = process.env.IG_PUBLIC_REPO ?? "Ostap-87/MyFirst";
const BRANCH = process.env.IG_PUBLIC_BRANCH ?? "master";

const rawUrl = (path) =>
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

/** Токен и id аккаунта конкретного бренда. Секреты только из окружения. */
const credentials = (brand) => {
  const suffix = BRANDS[brand].envSuffix;
  return {
    token: process.env[`IG_TOKEN_${suffix}`],
    userId: process.env[`IG_USER_${suffix}`],
    names: [`IG_TOKEN_${suffix}`, `IG_USER_${suffix}`],
  };
};

const api = async (token, path, params) => {
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
const waitForContainer = async (token, containerId, attempts = 30) => {
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

/** Вид берём из записи; у постов, созданных до разделения, его нет. */
const kindOf = (post) => post.kind ?? mediaKind(post.type);

const postDir = (brand, post) =>
  resolve(kindDir(CHANNEL, brand, kindOf(post)), post.folder);

const captionOf = (brand, post) =>
  read(resolve(postDir(brand, post), "caption.txt")).trim();

const publishCarousel = async ({ token, userId }, brand, post) => {
  const children = [];

  for (const file of post.files) {
    const container = await api(token, `${userId}/media`, {
      image_url: rawUrl(
        postPath(CHANNEL, brand, kindOf(post), post.folder, file),
      ),
      is_carousel_item: "true",
    });
    await waitForContainer(token, container.id);
    children.push(container.id);
    console.log(`        ✔ ${file}`);
  }

  const carousel = await api(token, `${userId}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption: captionOf(brand, post),
  });
  await waitForContainer(token, carousel.id);

  const published = await api(token, `${userId}/media_publish`, {
    creation_id: carousel.id,
  });
  return published.id;
};

const publishReel = async ({ token, userId }, brand, post) => {
  const container = await api(token, `${userId}/media`, {
    media_type: "REELS",
    video_url: rawUrl(
      postPath(CHANNEL, brand, kindOf(post), post.folder, post.files[0]),
    ),
    caption: captionOf(brand, post),
  });
  // Видео обрабатывается дольше картинок — опрашиваем статус вдвое дольше.
  await waitForContainer(token, container.id, 60);

  const published = await api(token, `${userId}/media_publish`, {
    creation_id: container.id,
  });
  return published.id;
};

// ——— Что публикуем ———

if (!args.due && !args.post) {
  fail(
    "Укажите, что публикуем:\n" +
      "      --due                     всё, чему наступило время\n" +
      "      --post <папка>            конкретный пост (нужен и --brand)\n" +
      `    Бренд (необязателен для --due): --brand <${brandList()}>\n` +
      "    Проверка без публикации: --dry-run\n" +
      "    Посмотреть план: npm run q",
  );
}

const onlyBrand = args.brand ? resolveBrandKey(args.brand) : null;
if (args.brand && !onlyBrand)
  fail(`Неизвестный бренд. Доступны: ${brandList()}`);
if (args.post && !onlyBrand)
  fail("Для --post нужен и --brand: у каждого бренда свой аккаунт.");

const brands = onlyBrand ? [onlyBrand] : Object.keys(BRANDS);
const now = Date.now();

/** Посты к публикации, сгруппированные по бренду. */
const plan = brands
  .map((brand) => {
    const queue = readQueue(CHANNEL, brand).posts;
    const posts = args.post
      ? queue.filter((post) => post.folder === String(args.post))
      : queue.filter(
          (post) =>
            post.status === "queued" &&
            new Date(post.publishAt).getTime() <= now,
        );
    return { brand, posts };
  })
  .filter((entry) => entry.posts.length > 0);

const total = plan.reduce((sum, entry) => sum + entry.posts.length, 0);

if (total === 0) {
  console.log(
    args.post
      ? `\n  Пост «${args.post}» в очереди не найден. Посмотреть план: npm run q\n`
      : "\n  Публиковать нечего: постов с наступившим временем в очереди нет.\n",
  );
  process.exit(0);
}

console.log(`\n  ${CHANNELS[CHANNEL].title} — к публикации: ${total}`);
for (const { brand, posts } of plan) {
  console.log(`\n  ${BRANDS[brand].title}`);
  for (const post of posts) {
    const dir = postDir(brand, post);
    if (!existsSync(dir))
      fail(
        `Папка поста пропала: ${CHANNEL}/${brand}/${kindOf(post)}/${post.folder}`,
      );

    console.log(
      `    ${post.type.padEnd(8)} ${kindOf(post)}/${post.folder}` +
        `\n      ${formatMoscow(post.publishAt)} МСК, файлов: ${post.files.length}` +
        `, подпись: ${captionOf(brand, post).length} символов`,
    );
    console.log(
      `      ${rawUrl(postPath(CHANNEL, brand, kindOf(post), post.folder, post.files[0]))}`,
    );
  }
}

if (dryRun) {
  console.log("\n  --dry-run: ничего не отправлено.\n");
  process.exit(0);
}

// ——— Публикация ———

let ok = 0;
for (const { brand, posts } of plan) {
  const auth = credentials(brand);

  if (!auth.token || !auth.userId) {
    console.error(
      `\n  ✖ ${BRANDS[brand].title}: нет доступа — не заданы ${auth.names.join(" и ")}.` +
        "\n    Как их получить — docs/publishing.md",
    );
    continue;
  }

  for (const post of posts) {
    console.log(`\n  Публикую ${BRANDS[brand].title} · ${post.folder}…`);
    try {
      const mediaId =
        post.type === "carousel"
          ? await publishCarousel(auth, brand, post)
          : await publishReel(auth, brand, post);
      archivePost(CHANNEL, brand, post, mediaId);
      ok++;
      console.log(`  ✔ Опубликовано. id: ${mediaId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markPostFailed(CHANNEL, brand, post, message);
      console.error(`  ✖ ${post.folder}: ${message}`);
    }
  }
}

console.log(`\n  Готово: ${ok} из ${total}.\n`);
// Ненулевой код, если что-то не прошло: в расписании это видно как красный прогон.
process.exit(ok === total ? 0 : 1);

#!/usr/bin/env node
// Очередь публикаций: положить готовый контент и посмотреть план.
//
//   npm run q:add -- --channel instagram --brand gtt --carousel robotics-expedition \
//     --at "2026-09-25 10:00" --caption-file data/captions/robotics-expedition.txt
//   npm run q:add -- --channel tiktok --brand personal --video out/talking-head.mp4 \
//     --at "2026-09-26 19:00" --caption "текст"
//   npm run q                          весь план по всем каналам и брендам
//   npm run q -- --channel instagram   только один канал
//
// Один аккаунт = одна папка = одна очередь. Канал и бренд обязательны:
// пост, ушедший не в тот аккаунт, — это не «неудобно найти файл».
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import {
  BRANDS,
  brandList,
  CHANNELS,
  channelList,
  formatMoscow,
  parseMoscowTime,
  kindDir,
  mediaKind,
  queueFile,
  readPublished,
  readQueue,
  resolveBrandKey,
  resolveChannelKey,
  writeJson,
} from "./channels.mjs";
import { fail, parseArgs, read, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

// ——— Показ плана ———

if (args.list) {
  const channels = args.channel
    ? [resolveChannelKey(args.channel)].filter(Boolean)
    : Object.keys(CHANNELS);

  if (channels.length === 0)
    fail(`Неизвестный канал. Доступны: ${channelList()}`);

  const brands = args.brand
    ? [resolveBrandKey(args.brand)].filter(Boolean)
    : Object.keys(BRANDS);

  for (const channel of channels) {
    const meta = CHANNELS[channel];
    console.log(
      `\n━━ ${meta.title}${meta.ready ? "" : "  (публикация ещё не подключена)"}`,
    );

    for (const brand of brands) {
      const queued = readQueue(channel, brand).posts;
      const published = readPublished(channel, brand).posts;

      if (queued.length === 0 && published.length === 0) {
        console.log(`   ${BRANDS[brand].title}: пусто`);
        continue;
      }

      console.log(
        `   ${BRANDS[brand].title}: в очереди ${queued.length}, вышло ${published.length}`,
      );
      for (const post of queued) {
        const mark = post.status === "failed" ? "✖" : "·";
        console.log(
          `     ${mark} ${formatMoscow(post.publishAt, true)}  ${post.type.padEnd(8)} ${post.slug}` +
            (post.error ? `\n         ошибка: ${post.error}` : ""),
        );
      }
      for (const post of published.slice(-3)) {
        console.log(
          `     ✔ ${formatMoscow(post.publishedAt, true)}  ${post.type.padEnd(8)} ${post.slug}  id: ${post.mediaId}`,
        );
      }
    }
  }
  console.log("");
  process.exit(0);
}

// ——— Добавление в очередь ———

const channel = resolveChannelKey(args.channel);
if (!channel) fail(`Укажите канал: --channel <${channelList()}>`);

const brand = resolveBrandKey(args.brand);
if (!brand) fail(`Укажите бренд: --brand <${brandList()}>`);

const channelMeta = CHANNELS[channel];

if (!args.at || args.at === true) {
  fail('Укажите время публикации: --at "2026-09-25 10:00" (московское время)');
}

const publishAt = parseMoscowTime(args.at);
if (!publishAt) {
  fail(
    `Дата «${args.at}» не разобрана. Формат: --at "2026-09-25 10:00" (МСК).`,
  );
}

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
if (caption.length > channelMeta.limits.caption) {
  fail(
    `Подпись длиннее лимита ${channelMeta.title}: ${caption.length} символов из ${channelMeta.limits.caption}.`,
  );
}

const date = publishAt.slice(0, 10);

const addPost = ({ slug, type, files }) => {
  if (!channelMeta.types.includes(type)) {
    fail(
      `${channelMeta.title} не принимает тип «${type}». Доступны: ${channelMeta.types.join(", ")}`,
    );
  }

  // Вид определяет папку (photo/ или video/), тип — имя внутри неё.
  // Дата первой: архив читается хронологически.
  const kind = mediaKind(type);
  const folder = `${date}-${type}-${slug}`;
  const dir = resolve(kindDir(channel, brand, kind), folder);

  if (existsSync(dir) && !args.force) {
    fail(
      `Папка ${channel}/${brand}/${kind}/${folder} уже существует. Перезаписать: --force`,
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
    channel,
    brand,
    kind,
    slug,
    type,
    folder,
    publishAt,
    status: "queued",
    files: copied,
    createdAt: new Date().toISOString(),
  };
  writeJson(resolve(dir, "meta.json"), meta);

  const queue = readQueue(channel, brand);
  queue.posts = queue.posts.filter((post) => post.folder !== folder);
  queue.posts.push(meta);
  // Сортировка по времени: публикация берёт посты сверху.
  queue.posts.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  writeJson(queueFile(channel, brand), queue);

  console.log(`
  ✔ В очереди ${channelMeta.title} · ${BRANDS[brand].title}
    ${kind}/${folder}
    файлов: ${copied.length}, подпись: ${caption.length} символов
    публикация: ${formatMoscow(publishAt, true)} (МСК)
${
  channelMeta.ready
    ? `
  Опубликовать сейчас:  npm run publish -- --channel ${channel} --brand ${brand} --post ${folder}`
    : `
  ⚠ Публикация в ${channelMeta.title} пока не подключена — пост дождётся её в очереди.`
}
  Весь план:  npm run q
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

  const [min, max] = channelMeta.limits.carouselSlides ?? [2, 10];
  if (slides.length < min || slides.length > max) {
    fail(
      `В карусели ${channelMeta.title} от ${min} до ${max} слайдов, а здесь ${slides.length}.`,
    );
  }

  addPost({
    slug: String(args.carousel),
    type: "carousel",
    files: slides.map((file) => resolve(slidesDir, file)),
  });
  process.exit(0);
}

// Видео: тип зависит от канала — reel в Instagram, short в YouTube, video в TikTok.
const videoArg = args.reel ?? args.video ?? args.short;
if (videoArg && videoArg !== true) {
  const file = resolve(ROOT, String(videoArg));
  if (!existsSync(file)) fail(`Видео не найдено: ${file}`);

  const type =
    channelMeta.types.find((candidate) => candidate !== "carousel") ?? "video";

  addPost({
    slug: typeof args.slug === "string" ? args.slug : basename(file, ".mp4"),
    type,
    files: [file],
  });
  process.exit(0);
}

fail(
  "Укажите, что ставим в очередь:\n" +
    "      --carousel <имя папки в out/carousel>\n" +
    "      --video <путь к mp4> [--slug имя]\n" +
    `    Канал: --channel <${channelList()}>\n` +
    `    Бренд: --brand <${brandList()}>\n` +
    '    Время: --at "2026-09-25 10:00" (МСК)\n' +
    "    Подпись: --caption «текст» или --caption-file <файл>\n" +
    "    Посмотреть план: npm run q",
);

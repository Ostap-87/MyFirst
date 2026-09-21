// Реестр каналов и брендов + общая работа с очередью публикаций.
//
// Каждый канал устроен одинаково: папка канала, внутри папка бренда, внутри
// queue.json, published.json и posts/. Один аккаунт = одна папка = одна
// очередь = один токен. Благодаря этому новый канал подключается описанием
// в CHANNELS, а не копией всей логики.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { read, ROOT } from "./lib.mjs";

export const REPO_ROOT = resolve(ROOT, "..");

/**
 * Бренды. Ключ — имя папки внутри канала, он же значение --brand.
 *
 * У каждого бренда свой аккаунт в каждой соцсети, поэтому имена переменных
 * с токенами тоже разные: перепутанный токен означает пост не в том аккаунте.
 */
export const BRANDS = {
  globaltechtour: {
    title: "GlobalTechTour",
    aliases: ["gtt", "globaltechtour", "тур", "делегация"],
    envSuffix: "GTT",
  },
  aura: {
    title: "Aura Robotics",
    aliases: ["aura", "aura-robotics", "робот", "robotics"],
    envSuffix: "AURA",
  },
  personal: {
    title: "ostapdotcenko",
    aliases: ["personal", "ostapdotcenko", "личный", "блог"],
    envSuffix: "PERSONAL",
  },
};

/**
 * Вид контента по его типу.
 *
 * Файлы разведены по видам (`photo/` и `video/`), потому что это разные
 * производственные процессы: карусель собирается рендером слайдов, ролик —
 * монтажом со звуком и субтитрами. Очередь при этом ОДНА на аккаунт: она
 * описывает расписание ленты, а лента у аккаунта одна. С двумя очередями
 * легко поставить карусель и ролик на одно время и выдать два поста подряд.
 */
export const MEDIA_KINDS = {
  carousel: "photo",
  image: "photo",
  text: "photo",
  reel: "video",
  video: "video",
  short: "video",
};

export const mediaKind = (type) => MEDIA_KINDS[type] ?? "photo";

/**
 * Каналы. `ready: false` означает, что папки и очередь уже есть, а публикация
 * ещё не подключена — контент можно готовить заранее, он дождётся кода.
 */
export const CHANNELS = {
  instagram: {
    title: "Instagram",
    ready: true,
    types: ["carousel", "reel"],
    limits: { carouselSlides: [2, 10], caption: 2200 },
    envPrefix: "IG",
  },
  youtube: {
    title: "YouTube",
    ready: false,
    types: ["short", "video"],
    limits: { caption: 5000 },
    envPrefix: "YT",
  },
  threads: {
    title: "Threads",
    ready: false,
    types: ["carousel", "image", "text"],
    limits: { caption: 500 },
    envPrefix: "TH",
  },
  tiktok: {
    title: "TikTok",
    ready: false,
    types: ["video"],
    limits: { caption: 2200 },
    envPrefix: "TT",
  },
};

/** «gtt», «робот», «personal» -> ключ бренда. */
export const resolveBrandKey = (input) => {
  if (!input || input === true) return null;
  const needle = String(input).toLowerCase().trim();
  for (const [key, brand] of Object.entries(BRANDS)) {
    if (key === needle || brand.aliases.includes(needle)) return key;
  }
  return null;
};

export const resolveChannelKey = (input) => {
  if (!input || input === true) return null;
  const needle = String(input).toLowerCase().trim();
  return needle in CHANNELS ? needle : null;
};

export const brandList = () =>
  Object.entries(BRANDS)
    .map(([key, brand]) => `${key} (${brand.title})`)
    .join(", ");

export const channelList = () =>
  Object.entries(CHANNELS)
    .map(
      ([key, channel]) =>
        `${key}${channel.ready ? "" : " — пока без публикации"}`,
    )
    .join(", ");

// ——— Пути ———

export const channelDir = (channel, brand) =>
  resolve(REPO_ROOT, channel, brand);
export const queueFile = (channel, brand) =>
  resolve(channelDir(channel, brand), "queue.json");
export const publishedFile = (channel, brand) =>
  resolve(channelDir(channel, brand), "published.json");
/** Папка вида контента: photo/ или video/ внутри бренда. */
export const kindDir = (channel, brand, kind) =>
  resolve(channelDir(channel, brand), kind);

/** Путь поста относительно корня репозитория — из него строятся публичные ссылки. */
export const postPath = (channel, brand, kind, folder, file) =>
  `${channel}/${brand}/${kind}/${folder}/${file}`;

// ——— Очередь и архив ———

const emptyQueue = (channel, brand) => ({
  channel,
  brand,
  comment:
    "Очередь публикаций. Посты берутся по publishAt (московское время). " +
    "Пополняется скриптом ig:add, разбирается публикацией.",
  posts: [],
});

const emptyPublished = (channel, brand) => ({
  channel,
  brand,
  comment: "Архив вышедшего: что, когда и под каким id ушло в канал.",
  posts: [],
});

export const readJson = (file) => JSON.parse(read(file));
export const writeJson = (file, data) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");

/** Создаёт папки и пустые файлы канала, если их ещё нет. */
export const ensureChannel = (channel, brand) => {
  // Обе папки создаём сразу: пустая video/ рядом с photo/ показывает, что
  // видео в этот аккаунт тоже планируется, а не забыто.
  mkdirSync(kindDir(channel, brand, "photo"), { recursive: true });
  mkdirSync(kindDir(channel, brand, "video"), { recursive: true });

  const queue = queueFile(channel, brand);
  if (!existsSync(queue)) writeJson(queue, emptyQueue(channel, brand));

  const published = publishedFile(channel, brand);
  if (!existsSync(published))
    writeJson(published, emptyPublished(channel, brand));
};

export const readQueue = (channel, brand) => {
  ensureChannel(channel, brand);
  return readJson(queueFile(channel, brand));
};

export const readPublished = (channel, brand) => {
  ensureChannel(channel, brand);
  return readJson(publishedFile(channel, brand));
};

/** Переносит пост из очереди в архив после успешной публикации. */
export const archivePost = (channel, brand, post, mediaId) => {
  const queue = readQueue(channel, brand);
  queue.posts = queue.posts.filter((item) => item.folder !== post.folder);
  writeJson(queueFile(channel, brand), queue);

  const published = readPublished(channel, brand);
  published.posts.push({
    ...post,
    status: "published",
    mediaId,
    publishedAt: new Date().toISOString(),
  });
  writeJson(publishedFile(channel, brand), published);
};

/** Отмечает неудачу, чтобы следующий прогон не бился о тот же пост молча. */
export const markPostFailed = (channel, brand, post, message) => {
  const queue = readQueue(channel, brand);
  const item = queue.posts.find((entry) => entry.folder === post.folder);
  if (item) {
    item.status = "failed";
    item.error = message;
    item.failedAt = new Date().toISOString();
  }
  writeJson(queueFile(channel, brand), queue);
};

// ——— Время ———

/** «2026-09-25 10:00» (МСК) -> ISO со смещением +03:00. */
export const parseMoscowTime = (input) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(
    String(input).trim(),
  );
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  // Москва — UTC+3 круглый год, перехода на летнее время нет.
  return `${year}-${month}-${day}T${hour}:${minute}:00+03:00`;
};

export const formatMoscow = (iso, withYear = false) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });

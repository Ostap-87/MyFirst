#!/usr/bin/env node
// Пакетный рендер вертикальных роликов по постам из data/posts.json.
//
//   npm run parse-plan                              # сначала собрать данные
//   npm run render-batch -- --brand gtt --limit 3
//   npm run render-batch -- --brand all --platform reels
//   npm run render-batch -- --brand aura --dry-run  # только показать план
//
// Проект бандлится ОДИН раз на весь пакет: `remotion render` в цикле собирал
// бы бандл заново на каждый ролик — на сорока постах это десятки минут впустую.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail, parseArgs, read } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const postsFile = resolve(ROOT, "data/posts.json");

if (!existsSync(postsFile)) {
  fail("Нет data/posts.json — сначала выполните: npm run parse-plan");
}

const BRAND_FILTER = {
  gtt: "globaltechtour",
  globaltechtour: "globaltechtour",
  aura: "aura-robotics",
  "aura-robotics": "aura-robotics",
  personal: "ostapdotcenko",
  all: null,
};

const brandArg =
  typeof args.brand === "string" ? args.brand.toLowerCase() : "all";
if (!(brandArg in BRAND_FILTER)) {
  fail(
    `Неизвестный бренд "${brandArg}". Доступны: ${Object.keys(BRAND_FILTER).join(", ")}`,
  );
}

const platform = typeof args.platform === "string" ? args.platform : "telegram";
if (!["telegram", "reels", "shorts"].includes(platform)) {
  fail(`Неизвестная площадка "${platform}". Доступны: telegram, reels, shorts`);
}

const wanted = BRAND_FILTER[brandArg];
const limit = args.limit ? Number(args.limit) : Infinity;
const outDir = resolve(
  ROOT,
  typeof args.out === "string" ? args.out : "out/batch",
);

// CRF: чем больше, тем сильнее сжатие. 18 — визуально без потерь и ~18 МБ на
// восьмисекундный вертикальный ролик, 23 — примерно вчетверо легче при почти
// неотличимой картинке. Telegram всё равно пережимает, тащить туда 18 МБ незачем.
const crf = args.crf ? Number(args.crf) : 23;

const allPosts = JSON.parse(read(postsFile));
const posts = allPosts
  .filter((post) => (wanted ? post.brand === wanted : true))
  .filter((post) => {
    if (post.image) return true;
    console.warn(`  ⚠ ${post.slug}: нет картинки в tg-images, пропускаю`);
    return false;
  })
  .slice(0, limit);

if (posts.length === 0) {
  fail("Под фильтр не попал ни один пост.");
}

console.log(
  `\n  Роликов к рендеру: ${posts.length}  (площадка: ${platform}, CRF ${crf})`,
);
for (const post of posts) {
  console.log(`    ${post.date}  ${post.composition.padEnd(14)}  ${post.slug}`);
}

if (args["dry-run"]) {
  console.log("\n  --dry-run: файлы не рендерятся.\n");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

console.log("\n  Собираю бандл (один раз на весь пакет)…");
const serveUrl = await bundle({
  entryPoint: resolve(ROOT, "src/index.ts"),
  onProgress: () => undefined,
});

let done = 0;
const started = Date.now();

for (const post of posts) {
  const inputProps = {
    company: post.company,
    date: post.date,
    title: post.title,
    lead: post.lead,
    cta: post.cta,
    image: `tg-images/${post.image}`,
    platform,
  };

  const composition = await selectComposition({
    serveUrl,
    id: post.composition,
    inputProps,
  });

  const outputLocation = resolve(outDir, `${post.date}-${post.slug}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf,
    outputLocation,
    inputProps,
  });

  done++;
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(
    `  ✔ [${done}/${posts.length}] ${post.slug}  (${elapsed} с от старта)`,
  );
}

console.log(`
  Готово: ${done} роликов в ${outDir}
  Время: ${Math.round((Date.now() - started) / 1000)} с
`);

#!/usr/bin/env node
// Рендерит карусель Instagram в набор PNG — по файлу слайдов или прямо из поста.
//
//   npm run carousel -- --input data/carousel.example.json
//   npm run carousel -- --slug nio-battery-swap          # из контент-плана
//   npm run carousel -- --slug borunte-industrial-arms --points 4
//   npm run carousel -- --input ... --square             # 1:1 вместо 4:5
//
// Каждый слайд — отдельная картинка 1080×1350 (или 1080×1080): Instagram
// принимает карусель именно набором файлов, а не одним длинным полотном.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail, parseArgs, read, resolveBrand } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

const COMPOSITIONS = {
  globaltechtour: "GTT-Carousel",
  "aura-robotics": "Aura-Carousel",
  ostapdotcenko: "Personal-Carousel",
};

/**
 * Собирает карусель из поста контент-плана: обложка с картинкой, пункты из
 * предложений, цифра из первого найденного числа и призыв. Это черновик —
 * заголовки почти всегда стоит переписать руками, зато структура уже есть.
 */
const carouselFromPost = (post, maxPoints) => {
  const sentences = post.text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);

  const slides = [
    {
      type: "cover",
      kicker: post.company,
      title: post.title,
      subtitle: post.lead.slice(0, 120),
      image: post.image ? `tg-images/${post.image}` : "",
    },
  ];

  // Первое осмысленное число поста — на отдельный слайд: цифра держит
  // внимание лучше абзаца. Годы отбрасываем: «работает с 2008 года» — это
  // не метрика, а в слайде «2 008» выглядит как ошибка.
  const isYear = (value) => value >= 1900 && value <= 2100;

  const bigNumber = (post.numbers ?? [])
    .map((raw) => ({ raw, value: Number(String(raw).replace(/[^\d]/g, "")) }))
    .find(
      (candidate) =>
        candidate.value >= 100 &&
        String(candidate.value).length <= 12 &&
        !isYear(candidate.value),
    );

  if (bigNumber) {
    // Подпись берём из предложения, где это число встретилось: заголовок
    // поста уже стоит на обложке, дублировать его незачем.
    const digits = String(bigNumber.value);
    const context = sentences.find((sentence) =>
      sentence.replace(/[^\d]/g, "").includes(digits),
    );

    slides.push({
      type: "metric",
      value: bigNumber.value,
      prefix: "",
      suffix: /%/.test(bigNumber.raw) ? "%" : "",
      compact: bigNumber.value >= 1_000_000,
      label: context ? context.slice(0, 110) : post.title,
      source: post.company,
    });
  }

  // Пункты: заголовок оставляем пустым — автоматика не умеет его придумать,
  // а «1» и в кружке, и заголовком выглядит как недоделка. Номер в кружке
  // уже нумерует слайд.
  sentences
    .filter((sentence) => sentence !== slides[1]?.label)
    .slice(0, maxPoints)
    .forEach((sentence, index) => {
      slides.push({
        type: "point",
        index: index + 1,
        title: "",
        text: sentence,
      });
    });

  // CTA из строки поста вида «https://site.ru/ — что сделать»: ссылка идёт
  // подписью, а призыв — текстом.
  const [ctaUrl, ctaText] = (post.cta || "")
    .split("—")
    .map((part) => part.trim());
  const domain = (ctaUrl || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  slides.push({
    type: "cta",
    title: ctaText || "Разбираем такие кейсы каждую неделю",
    text: post.company ? `Разбор ${post.company} — один из серии.` : "",
    keyword: "",
    handle: domain,
  });

  return { name: post.slug, brand: post.brand, slides };
};

let carousel;

if (args.slug && args.slug !== true) {
  const postsFile = resolve(ROOT, "data/posts.json");
  if (!existsSync(postsFile)) {
    fail("Нет data/posts.json — сначала выполните: npm run parse-plan");
  }
  const posts = JSON.parse(read(postsFile));
  const post = posts.find((candidate) => candidate.slug === args.slug);
  if (!post) {
    fail(`Пост со slug «${args.slug}» не найден в data/posts.json`);
  }
  carousel = carouselFromPost(post, Number(args.points ?? 3));
} else {
  const input = resolve(
    ROOT,
    typeof args.input === "string" ? args.input : "data/carousel.example.json",
  );
  if (!existsSync(input)) {
    fail(
      `Файл слайдов не найден: ${input}\n    Укажите его: --input <путь> или соберите из поста: --slug <slug>`,
    );
  }
  carousel = JSON.parse(read(input));
}

const brand = resolveBrand(args.brand ?? carousel.brand);
if (!brand) {
  fail(
    'Укажите бренд: --brand gtt | aura | personal (или поле "brand" в файле слайдов)',
  );
}

const compositionId = COMPOSITIONS[brand.key];
const outDir = resolve(
  ROOT,
  typeof args.out === "string"
    ? args.out
    : `out/carousel/${carousel.name ?? "slides"}`,
);
mkdirSync(outDir, { recursive: true });

/**
 * Чистим прошлые слайды перед рендером.
 *
 * Иначе короткая карусель оставляет «хвост» от длинной: слайды нумеруются
 * по порядку, файл 05 от прошлого прогона никто не перезапишет, и он уедет
 * в публикацию вместе с новыми. Удаляем только пронумерованные PNG, которые
 * кладёт сюда этот же скрипт.
 */
const stale = readdirSync(outDir).filter((file) =>
  /^\d{2}-[a-z]+\.png$/.test(file),
);
if (stale.length && !args.keep) {
  for (const file of stale) unlinkSync(resolve(outDir, file));
}

console.log(`
  Карусель: ${carousel.name ?? "без имени"}
  Бренд: ${brand.title} (${compositionId})
  Слайдов: ${carousel.slides.length}
  Формат: ${args.square ? "1080×1080" : "1080×1350"}${
    stale.length && !args.keep
      ? `\n  Удалено прошлых слайдов: ${stale.length}`
      : ""
  }
`);

if (args["dry-run"]) {
  carousel.slides.forEach((slide, index) => {
    console.log(`    ${String(index + 1).padStart(2, "0")}  ${slide.type}`);
  });
  console.log("\n  --dry-run: файлы не рендерятся.\n");
  process.exit(0);
}

console.log("  Собираю бандл…");
const serveUrl = await bundle({
  entryPoint: resolve(ROOT, "src/index.ts"),
  onProgress: () => undefined,
});

const started = Date.now();

for (let index = 0; index < carousel.slides.length; index++) {
  const inputProps = {
    slides: carousel.slides,
    index,
    showCounter: args["no-counter"] ? false : true,
    showSwipeHint: args["no-hint"] ? false : true,
    // Подпись берём из файла слайдов или из аргумента: карусели репостят,
    // и без неё картинка теряет автора.
    footer:
      typeof args.footer === "string" ? args.footer : (carousel.footer ?? ""),
  };

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  await renderStill({
    composition: args.square ? { ...composition, height: 1080 } : composition,
    serveUrl,
    output: resolve(
      outDir,
      `${String(index + 1).padStart(2, "0")}-${carousel.slides[index].type}.png`,
    ),
    inputProps,
  });

  console.log(
    `  ✔ ${index + 1}/${carousel.slides.length}  ${carousel.slides[index].type}`,
  );
}

console.log(`
  Готово за ${Math.round((Date.now() - started) / 1000)} с  ->  ${outDir}
  Файлы пронумерованы по порядку — загружать в Instagram в том же порядке.
`);

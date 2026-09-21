#!/usr/bin/env node
// Рендерит карусель как набор коротких видео-петель вместо PNG — тест идеи
// "слайды карусели анимированы" (переливаются/дышат), не только обложка.
//
//   npm run carousel:animated -- --input data/carousel-tea-coffee-retail.json --effect shimmer
//   npm run carousel:animated -- --input data/carousel-tea-coffee-retail.json --effect zoom
//
// Каждый слайд — отдельный .mp4 (Instagram принимает видео-элементы прямо
// внутри свайп-карусели). Использует те же данные слайдов, что и обычный
// npm run carousel, просто рендерит через тестовые GTT-CarouselAnimated /
// GTT-CarouselZoomTest вместо GTT-Carousel.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail, parseArgs, read } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

const EFFECT_COMPOSITIONS = {
  shimmer: "GTT-CarouselAnimated",
  zoom: "GTT-CarouselZoomTest",
};

const effect = typeof args.effect === "string" ? args.effect : "shimmer";
const compositionId = EFFECT_COMPOSITIONS[effect];
if (!compositionId) {
  fail(`Неизвестный --effect «${effect}» — доступны: ${Object.keys(EFFECT_COMPOSITIONS).join(", ")}`);
}

const input = resolve(
  ROOT,
  typeof args.input === "string" ? args.input : "data/carousel.example.json",
);
if (!existsSync(input)) {
  fail(`Файл слайдов не найден: ${input}`);
}
const carousel = JSON.parse(read(input));

const outDir = resolve(
  ROOT,
  typeof args.out === "string" ? args.out : `out/carousel-animated/${carousel.name ?? "slides"}-${effect}`,
);
mkdirSync(outDir, { recursive: true });

console.log(`
  Карусель: ${carousel.name ?? "без имени"}
  Эффект: ${effect} (${compositionId})
  Слайдов: ${carousel.slides.length}
`);

console.log("  Собираю бандл…");
const serveUrl = await bundle({
  entryPoint: resolve(ROOT, "src/index.ts"),
  onProgress: () => undefined,
});

const started = Date.now();

for (let index = 0; index < carousel.slides.length; index++) {
  const inputProps = {
    slide: carousel.slides[index],
    footer: carousel.footer ?? "",
  };

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  const output = resolve(
    outDir,
    `${String(index + 1).padStart(2, "0")}-${carousel.slides[index].type}.mp4`,
  );

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    output,
    inputProps,
  });

  console.log(`  ✔ ${index + 1}/${carousel.slides.length}  ${carousel.slides[index].type}`);
}

console.log(`
  Готово за ${Math.round((Date.now() - started) / 1000)} с  ->  ${outDir}
`);

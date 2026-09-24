#!/usr/bin/env node
// Готовит точки контура страны для эффекта с летающими тетраэдрами.
//
//   npm run make-outline -- --in <файл с данными провинций> --points 220
//
// Исходник — данные границ провинций с сайта. Из них берётся подвыборка
// точек, приводится к долям кадра и кладётся в src/shared/data.
//
// Зачем подвыборка: точек в данных больше двух с половиной тысяч, и
// столько тетраэдров кадр не вытянет. Две сотни уже читаются как форма.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.in || args.in === true) {
  fail(
    "Укажите данные: npm run make-outline -- --in <файл>\n" +
      "    --points <n>  сколько точек оставить (по умолчанию 220)\n" +
      "    --out <файл>  куда писать (по умолчанию src/shared/data/china-outline.ts)",
  );
}

const inPath = resolve(ROOT, String(args.in));
if (!existsSync(inPath)) fail(`Файл не найден: ${inPath}`);

const want = Number(args.points ?? 220);
const outPath = resolve(ROOT, String(args.out ?? "src/shared/data/china-outline.ts"));

const src = readFileSync(inPath, "utf8");
const m = /JSON\.parse\(`([\s\S]*?)`\)/.exec(src);
if (!m) fail("В файле нет данных в ожидаемом виде");
const provinces = JSON.parse(m[1]);

const all = [];
for (const p of provinces)
  for (const poly of p.polygons)
    for (const ring of poly) for (const pt of ring) all.push(pt);

const lons = all.map((p) => p[0]);
const lats = all.map((p) => p[1]);
const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
const latMin = Math.min(...lats), latMax = Math.max(...lats);

/**
 * Поправка на широту.
 *
 * Градус долготы на широте 35° короче градуса широты примерно на пятую
 * часть. Без поправки Китай выходит растянутым вширь и перестаёт узнаваться.
 */
const midLat = ((latMin + latMax) / 2) * (Math.PI / 180);
const kx = Math.cos(midLat);

const spanX = (lonMax - lonMin) * kx;
const spanY = latMax - latMin;
const span = Math.max(spanX, spanY);

/**
 * Прореживание по расстоянию, а не по номеру в списке.
 *
 * Брать каждую N-ю точку нельзя: у восточных провинций контуры детальнее,
 * и при такой выборке в правой половине страны оказалось 70% точек, а
 * западная половина осталась пустой. Здесь точка берётся только если она
 * дальше порога от всех уже взятых — контур выходит равномерным.
 *
 * Порог подбирается автоматически: он растёт, пока точек не станет столько,
 * сколько просили.
 */
const dist2 = (a, b) => {
  const dx = (a[0] - b[0]) * kx;
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

let picked = [];
let minGap = span / 40;
for (let attempt = 0; attempt < 40; attempt += 1) {
  picked = [];
  const gap2 = minGap * minGap;
  for (const pt of all) {
    if (picked.every((q) => dist2(pt, q) > gap2)) picked.push(pt);
  }
  if (picked.length <= want) break;
  minGap *= 1.08;
}

const points = picked.map(([lon, lat]) => {
  const x = ((lon - lonMin) * kx - spanX / 2) / span;
  const y = -((lat - latMin) - spanY / 2) / span;
  return [Number(x.toFixed(4)), Number(y.toFixed(4))];
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `/**
 * Точки контура Китая для эффекта сборки из тетраэдров.
 *
 * Сгенерировано: npm run make-outline
 * Источник — границы провинций, ${provinces.length} штук, ${all.length} точек в исходнике.
 *
 * Координаты приведены к долям от центра: 0,0 — середина фигуры, а размах
 * по большей стороне равен единице. Компонент сам решает, во сколько
 * пикселей её развернуть.
 *
 * Поправка на широту уже внесена: градус долготы на широте ${((latMin + latMax) / 2).toFixed(0)}°
 * короче градуса широты, и без неё страна выходит растянутой вширь.
 */
export const chinaOutline: readonly (readonly [number, number])[] = ${JSON.stringify(points)};
`,
  "utf8",
);

console.log(`\n  Провинций: ${provinces.length}, точек в исходнике: ${all.length}`);
console.log(`  Взято: ${points.length}, минимальный зазор ${minGap.toFixed(2)}°`);
console.log(`  Размах: ${spanX.toFixed(1)} на ${spanY.toFixed(1)} градуса после поправки`);
console.log(`\n  ✔ ${outPath.replace(ROOT + "/", "")}\n`);

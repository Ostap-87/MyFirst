#!/usr/bin/env node
// Превращает контент-план Telegram-постов в data/posts.json для пакетного рендера.
//
//   npm run parse-plan
//   npm run parse-plan -- --input ../tg-images/20-day-batch.md
//
// Из каждого поста достаются: дата, бренд, компания, slug, заголовок, текст,
// CTA-строка и путь к готовой картинке в tg-images (с учётом версий -v2, -v3).
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail, parseArgs, read, write } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const input = resolve(
  ROOT,
  typeof args.input === "string" ? args.input : "../tg-images/20-day-batch.md",
);
const imagesRoot = resolve(
  ROOT,
  typeof args.images === "string" ? args.images : "../tg-images",
);
const output = resolve(ROOT, "data/posts.json");

if (!existsSync(input)) {
  fail(
    `Контент-план не найден: ${input}\n    Укажите путь: npm run parse-plan -- --input <путь к .md>`,
  );
}

/** Бренд из заголовка поста -> папка проекта и ключ бренда в Remotion. */
const BRANDS = {
  GlobalTechTour: {
    key: "globaltechtour",
    dir: "globaltechtour",
    composition: "GTT-PostReel",
  },
  "Aura Robotics": {
    key: "aura-robotics",
    dir: "aura",
    composition: "Aura-PostReel",
  },
};

const stripHtml = (html) =>
  html
    .replace(/<a [^>]*>(.*?)<\/a>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ищет картинку поста, выбирая самую свежую версию.
 * Telegram кэширует фото по URL, поэтому новые версии в tg-images лежат
 * с суффиксом -v2, -v3 — для видео нужна последняя.
 */
const findImage = (dir, date, slug) => {
  const folder = resolve(imagesRoot, dir);
  if (!existsSync(folder)) return null;

  const prefix = `${date}-${slug}`;
  const matches = readdirSync(folder).filter(
    (file) => file.startsWith(prefix) && /\.(png|jpe?g|webp)$/i.test(file),
  );
  if (matches.length === 0) return null;

  const version = (file) => {
    const found = /-v(\d+)\.[a-z]+$/i.exec(file);
    return found ? Number(found[1]) : 1;
  };

  matches.sort((a, b) => version(b) - version(a));
  return `${dir}/${matches[0]}`;
};

/** Числа из текста — подсказка для сцены со счётчиком, выбирать вручную. */
const extractNumbers = (text) => {
  const found =
    text.match(/\d[\d\s ]*(?:[.,]\d+)?\s?(?:млн|млрд|тыс\.?|%)?/g) ?? [];
  return found
    .map((value) => value.trim())
    .filter((value) => value.length > 1)
    .slice(0, 6);
};

const source = read(input);
// Посты разделены заголовками "## <дата> — <бренд> — <компания>".
const chunks = source.split(/\n## /).slice(1);

const posts = [];
const skipped = [];

for (const chunk of chunks) {
  const body = `## ${chunk}`;
  const header = /^## (\d{4}-\d{2}-\d{2}) — ([^—]+) — (.+)$/m.exec(body);
  if (!header) continue;

  const [, date, brandNameRaw, company] = header;
  const brandName = brandNameRaw.trim();
  const brand = BRANDS[brandName];
  if (!brand) {
    skipped.push(`${date} — ${brandName} (неизвестный бренд)`);
    continue;
  }

  const slug = /\*\*Slug:\*\*\s*(\S+)/.exec(body)?.[1];
  const title = /<b>(.*?)<\/b>/s.exec(body)?.[1];
  const cta = /^🔗\s*(.+)$/m.exec(body)?.[1];
  if (!slug || !title) {
    skipped.push(`${date} — ${company} (нет slug или заголовка)`);
    continue;
  }

  // Текст поста: всё между заголовком <b> и строкой CTA.
  const afterTitle = body.slice(body.indexOf("</b>") + 4);
  const text = stripHtml(afterTitle.split("🔗")[0]);

  posts.push({
    date,
    brand: brand.key,
    composition: brand.composition,
    company: company.trim(),
    slug,
    title: stripHtml(title),
    text,
    // Первое предложение — то, что влезает в вертикальный кадр под заголовком.
    lead: text.split(/(?<=[.!?])\s/)[0] ?? "",
    cta: cta ? cta.trim() : "",
    image: findImage(brand.dir, date, slug),
    numbers: extractNumbers(text),
  });
}

mkdirSync(resolve(ROOT, "data"), { recursive: true });
write(output, `${JSON.stringify(posts, null, 2)}\n`);

const withImage = posts.filter((post) => post.image).length;
const byBrand = {};
for (const post of posts) byBrand[post.brand] = (byBrand[post.brand] ?? 0) + 1;

console.log(`
  ✔ Разобрано постов: ${posts.length}  ->  data/posts.json
    с картинкой: ${withImage}, без картинки: ${posts.length - withImage}
    по брендам: ${Object.entries(byBrand)
      .map(([k, v]) => `${k} — ${v}`)
      .join(", ")}
${skipped.length ? `    пропущено: ${skipped.length}\n      ${skipped.join("\n      ")}` : ""}
  Дальше: npm run render-batch -- --brand gtt --limit 3
`);

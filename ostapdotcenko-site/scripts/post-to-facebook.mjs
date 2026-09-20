// Публикует пост про новую статью блога ostapdotcenko через общий Make.com
// сценарий (см. claude-control/data/fb-config/webhooks.json —
// scenarios.ostapdotcenko), который внутри разводит один вебхук роутером на
// две ветки: Facebook (Create a Post with Photos, на русском) и LinkedIn
// (Create a User Image Post, на английском). Текст поста — заголовок +
// примерно первая половина текста статьи (по числу слов, без картинок,
// markdown-разметки и раздела с источниками), дальше ссылка "читать полностью"
// на статью в блоге — так у поста есть самостоятельная ценность, а не только
// заголовок с призывом перейти по ссылке.
// Обе картинки — одна инлайн-картинка на канал (image_ru/image_en, первая
// инлайн-картинка соответствующего языка — та же, что og:image, см.
// generate-blog-html.mjs firstImage()). Попытка отправлять в Facebook галерею
// из всех картинок статьи (images_ru) не прижилась — модуль Make ждёт массив
// фото-объектов, а не строк, отваливался с ошибкой маппинга — откачено
// 15.09.2026.
// LinkedIn криво отображает (обрезает) длинные посты, поэтому текст для
// LinkedIn (text_en) дополнительно ограничен 2500 символами по границе
// параграфа — см. buildLimitedPost(). Facebook (text_ru) такого ограничения
// не имеет, там используется обычная "половина текста".
// Запускать вручную после публикации новой статьи (во всех языках) в
// src/i18n/{ru,en}.ts: `node scripts/post-to-facebook.mjs <slug>`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const WEBHOOK_URL = process.env.FB_WEBHOOK_URL || "https://hook.eu1.make.com/xpfcfi1iogwvcr43qcufyhtw36ecimne";
const BASE = "https://ostapdotcenko.ru";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/post-to-facebook.mjs <slug>");
  process.exit(1);
}

const articleRegex =
  /slug:\s*"([^"]+)",\s*\n\s*date:\s*"[^"]*",\s*\n\s*tag:\s*"[^"]*",\s*\n\s*time:\s*"[^"]*",\s*\n\s*title:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*excerpt:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*body:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*link:\s*"[^"]*",\s*\n\s*sideImages:\s*([\s\S]*?)\n\s*},/g;

// Строка захвачена регулярным выражением из исходников как есть, между кавычек —
// то есть это валидное содержимое JS/JSON-строкового литерала (с \n, \", \\ и т.д.),
// поэтому корректно раскрыть эскейпы можно через JSON.parse, обернув в кавычки.
function unescapeJs(str) {
  try {
    return JSON.parse(`"${str}"`);
  } catch {
    return str.replace(/\\(.)/g, "$1");
  }
}

// Совпадает с firstImage() из generate-blog-html.mjs.
function firstImage(body, sideImagesRaw) {
  const bodyMatch = body.match(/!\[[^\]]*\]\((\/img\/[^)]+)\)/);
  if (bodyMatch) return bodyMatch[1];
  const sideMatch = sideImagesRaw.match(/"(\/img\/[^"]+)"/);
  if (sideMatch) return sideMatch[1];
  return "/img/blog-portrait.jpg";
}

function findArticle(source, slug) {
  const article = [...source.matchAll(articleRegex)]
    .map((m) => ({
      slug: m[1],
      title: unescapeJs(m[2]),
      excerpt: unescapeJs(m[3]),
      body: unescapeJs(m[4]),
      image: firstImage(m[4], m[5]),
    }))
    .find((a) => a.slug === slug);
  return article;
}

// Разбивает body на параграфы, пригодные для поста в соцсети: без картинок,
// без markdown-ссылок/заголовков-решёток, без раздела с источниками в конце.
function contentParagraphsOf(body) {
  const sourcesHeadingRegex = /^## +(Источники|Sources|参考资料)\s*$/;
  const paragraphs = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const contentParagraphs = [];
  for (const p of paragraphs) {
    if (sourcesHeadingRegex.test(p)) break;
    if (/^!\[/.test(p)) continue; // картинка на отдельной строке
    contentParagraphs.push(
      p
        .replace(/^##\s+/, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    );
  }
  return contentParagraphs;
}

// Берёт примерно первую половину текста статьи (по словам).
function halfArticleText(body) {
  const contentParagraphs = contentParagraphsOf(body);

  const totalWords = contentParagraphs.reduce((sum, p) => sum + p.split(/\s+/).filter(Boolean).length, 0);
  const targetWords = Math.ceil(totalWords / 2);

  let wordCount = 0;
  const kept = [];
  for (const p of contentParagraphs) {
    kept.push(p);
    wordCount += p.split(/\s+/).filter(Boolean).length;
    if (wordCount >= targetWords) break;
  }

  return kept.join("\n\n");
}

// LinkedIn обрезает и криво показывает посты длиннее ~3900 символов, поэтому
// для него собираем текст так, чтобы (заголовок + тело + ссылка) укладывались
// в лимит, отступая от конца по границе параграфа, а не разрывая слово.
function buildLimitedPost(title, body, suffix, maxLen) {
  const contentParagraphs = contentParagraphsOf(body);

  const totalWords = contentParagraphs.reduce((sum, p) => sum + p.split(/\s+/).filter(Boolean).length, 0);
  const targetWords = Math.ceil(totalWords / 2);

  const fixedLen = title.length + "\n\n".length * 2 + suffix.length;
  let wordCount = 0;
  const kept = [];
  for (const p of contentParagraphs) {
    const candidate = [...kept, p].join("\n\n");
    if (fixedLen + candidate.length > maxLen) break;
    kept.push(p);
    wordCount += p.split(/\s+/).filter(Boolean).length;
    if (wordCount >= targetWords) break;
  }

  // Первый параграф не влез целиком (заголовок сам по себе длинный) — обрежем его по словам.
  if (kept.length === 0 && contentParagraphs.length > 0) {
    const budget = maxLen - fixedLen;
    const words = contentParagraphs[0].split(/\s+/);
    let text = "";
    for (const w of words) {
      if ((text + " " + w).trim().length > budget - 1) break;
      text = (text + " " + w).trim();
    }
    kept.push(text + "…");
  }

  return `${title}\n\n${kept.join("\n\n")}\n\n${suffix}`;
}

const ruSource = readFileSync(join(root, "src/i18n/ru.ts"), "utf-8");
const enSource = readFileSync(join(root, "src/i18n/en.ts"), "utf-8");

const ruArticle = findArticle(ruSource, slug);
if (!ruArticle) {
  console.error(`Article with slug "${slug}" not found in src/i18n/ru.ts`);
  process.exit(1);
}
const enArticle = findArticle(enSource, slug);
if (!enArticle) {
  console.error(`Article with slug "${slug}" not found in src/i18n/en.ts`);
  process.exit(1);
}

const LINKEDIN_MAX_LEN = 2500;

const url = `${BASE}/blog/${slug}`;
const text_ru = `${ruArticle.title}\n\n${halfArticleText(ruArticle.body)}\n\nЧитать полностью: ${url}`;
const text_en = buildLimitedPost(enArticle.title, enArticle.body, `Read the full article: ${url}`, LINKEDIN_MAX_LEN);
const image_ru = `${BASE}${ruArticle.image}`;
const image_en = `${BASE}${enArticle.image}`;

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text_ru, image_ru, text_en, image_en }),
});

if (!res.ok) {
  console.error(`Webhook request failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`Posted "${ruArticle.title}" to Facebook (RU) and LinkedIn (EN).`);

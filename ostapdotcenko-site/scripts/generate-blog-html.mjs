// Генерирует dist/blog/<slug>/index.html с уникальными <title>/<meta description>/OG-тегами
// для каждой статьи блога. Сам сайт — Vite SPA без SSR, поэтому "сырой" HTML, который видят
// краулеры и соцсети (Telegram/VK при репосте), без этого шага у всех страниц был бы
// одинаковым — общее описание с главной. React подхватывает управление после гидратации,
// так что для живых пользователей ничего не меняется.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ruSource = readFileSync(join(root, "src/i18n/ru.ts"), "utf-8");

const articleRegex =
  /slug:\s*"([^"]+)",\s*\n\s*date:\s*"[^"]*",\s*\n\s*tag:\s*"[^"]*",\s*\n\s*time:\s*"[^"]*",\s*\n\s*title:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*excerpt:\s*"((?:[^"\\]|\\.)*)"/g;

function unescapeJs(str) {
  return str.replace(/\\(.)/g, "$1");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const articles = [...ruSource.matchAll(articleRegex)].map((m) => ({
  slug: m[1],
  title: unescapeJs(m[2]),
  excerpt: unescapeJs(m[3]),
}));

const BASE = "https://ostapdotcenko.ru";
const distDir = join(root, "dist");
const templatePath = join(distDir, "index.html");

if (!existsSync(templatePath)) {
  console.error("dist/index.html not found — run vite build first");
  process.exit(1);
}

const template = readFileSync(templatePath, "utf-8");

// Базовые OG/Twitter-теги на главной, если их ещё нет в шаблоне.
let baseHtml = template;
if (!baseHtml.includes('property="og:title"')) {
  const homeTitle = (template.match(/<title>([^<]*)<\/title>/) ?? [, ""])[1];
  const homeDesc = (template.match(/<meta\s+name="description"\s+content="([^"]*)"/s) ?? [, ""])[1];
  const ogBlock = `    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(homeTitle)}" />
    <meta property="og:title" content="${escapeHtml(homeTitle)}" />
    <meta property="og:description" content="${escapeHtml(homeDesc)}" />
    <meta property="og:url" content="${BASE}/" />
    <meta name="twitter:card" content="summary" />
  </head>`;
  baseHtml = baseHtml.replace(/\s*<\/head>/, `\n${ogBlock}`);
  writeFileSync(templatePath, baseHtml);
}

// dist/blog/ существует как реальная директория (в ней лежат подпапки статей ниже),
// поэтому nginx (try_files $uri $uri/ /index.html) находит саму директорию раньше,
// чем успевает откатиться на SPA-фолбэк — и без index.html внутри отдаёт 403
// (autoindex выключен). Кладём сюда копию базового шаблона, чтобы страница листинга
// блога продолжала открываться напрямую.
writeFileSync(
  (() => {
    const dir = join(distDir, "blog");
    mkdirSync(dir, { recursive: true });
    return join(dir, "index.html");
  })(),
  baseHtml.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${BASE}/blog" />`)
);

let written = 0;
for (const { slug, title, excerpt } of articles) {
  const fullTitle = `${title} — Остап Доценко`;
  const url = `${BASE}/blog/${slug}`;

  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/s,
      `<meta name="description" content="${escapeHtml(excerpt)}" />`
    )
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="article" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(excerpt)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);

  const outDir = join(distDir, "blog", slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  written++;
}

console.log(`generate-blog-html: wrote ${written} per-article HTML files with unique title/description/OG tags`);

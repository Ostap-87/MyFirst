// Публикует пост в Facebook-страницу ostapdotcenko через общий Make.com вебхук
// (см. claude-control/data/fb-config/webhooks.json) при выходе новой статьи блога.
// Текст поста = excerpt статьи + ссылка на неё. Запускать вручную после публикации
// новой RU-статьи в src/i18n/ru.ts: `node scripts/post-to-facebook.mjs <slug>`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const WEBHOOK_URL = process.env.FB_WEBHOOK_URL || "https://hook.eu1.make.com/gxpzqodbic6f1xmvfahdvwgeh6li1q0p";
const PAGE_ID = process.env.FB_PAGE_ID_OSTAP || "1209545262252175";
const BASE = "https://ostapdotcenko.ru";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/post-to-facebook.mjs <slug>");
  process.exit(1);
}

const ruSource = readFileSync(join(root, "src/i18n/ru.ts"), "utf-8");

const articleRegex =
  /slug:\s*"([^"]+)",\s*\n\s*date:\s*"[^"]*",\s*\n\s*tag:\s*"[^"]*",\s*\n\s*time:\s*"[^"]*",\s*\n\s*title:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*excerpt:\s*"((?:[^"\\]|\\.)*)"/g;

function unescapeJs(str) {
  return str.replace(/\\(.)/g, "$1");
}

const article = [...ruSource.matchAll(articleRegex)]
  .map((m) => ({ slug: m[1], title: unescapeJs(m[2]), excerpt: unescapeJs(m[3]) }))
  .find((a) => a.slug === slug);

if (!article) {
  console.error(`Article with slug "${slug}" not found in src/i18n/ru.ts`);
  process.exit(1);
}

const url = `${BASE}/blog/${article.slug}`;
const text = `${article.title}\n\n${article.excerpt}\n\n${url}`;

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ page_id: PAGE_ID, text }),
});

if (!res.ok) {
  console.error(`Webhook request failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`Posted "${article.title}" to Facebook (ostapdotcenko).`);

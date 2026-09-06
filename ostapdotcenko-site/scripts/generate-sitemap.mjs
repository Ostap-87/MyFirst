// Генерирует public/sitemap.xml: главная + все статьи блога (slug берётся из src/i18n/ru.ts)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ruSource = readFileSync(join(root, "src/i18n/ru.ts"), "utf-8");
const slugs = [...ruSource.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const categoriesBlock = ruSource.match(/categories:\s*\[([\s\S]*?)\n\s*\],\s*\n\s*articles:/);
const categoryIds = categoriesBlock ? [...categoriesBlock[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]) : [];

const SITE_PAGES = ["about", "career", "projects", "consulting"];

const BASE = "https://ostapdotcenko.ru";
const urls = [
  { loc: `${BASE}/`, changefreq: "monthly", priority: "1.0" },
  ...SITE_PAGES.map((path) => ({ loc: `${BASE}/${path}`, changefreq: "monthly", priority: "0.8" })),
  { loc: `${BASE}/blog`, changefreq: "weekly", priority: "0.8" },
  ...categoryIds.map((id) => ({ loc: `${BASE}/blog/category/${id}`, changefreq: "weekly", priority: "0.7" })),
  ...slugs.map((slug) => ({ loc: `${BASE}/blog/${slug}`, changefreq: "yearly", priority: "0.6" })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join("\n")}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`sitemap.xml written with ${urls.length} URLs (${slugs.length} blog posts, ${categoryIds.length} categories)`);

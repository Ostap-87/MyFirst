#!/usr/bin/env node
// Гифки и стикеры Giphy для роликов.
//
//   npm run giphy -- --channel Ostap87          всё с канала
//   npm run giphy -- --url https://giphy.com/stickers/…-AbCdEf123
//   npm run giphy -- --url <ссылка> --sticker   прозрачный фон, если по ссылке не видно
//   npm run giphy                               что уже скачано
//
// Результат: public/local/giphy/<id>.webm (стикер, прозрачный VP9) или
// <id>.mp4 (гифка на весь прямоугольник) и строка в data/giphy.json —
// id, название, размер, стикер ли, путь для пропсов. В ролик кладётся
// эффектом GiphySticker.
//
// ——— Почему не API ———
//
// Страницы giphy.com отвечают 403 на запросы без браузера, а API просит
// ключ. Файлы же лежат на media.giphy.com и отдаются свободно — по id.
// Поэтому id канала собираются из страницы, открытой настоящим браузером
// (как при записи сайта), а скачивание идёт напрямую с медиасервера.
//
// ——— Права ———
//
// Своё с канала Ostap87 — можно в любые ролики. Чужие гифки по условиям
// Giphy встраиваются через их плеер; в коммерческий ролик скачанный чужой
// файл — только если автор это разрешает. Скрипт пишет автора в каталог.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fail, parseArgs, ROOT } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const DIR = resolve(ROOT, "public/local/giphy");
const CATALOG = resolve(ROOT, "data/giphy.json");
mkdirSync(DIR, { recursive: true });
const catalog = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, "utf8")) : [];

const idOf = (url) => (String(url).match(/(?:media\/(?:v1\.[^/]+\/)?|[-/])([A-Za-z0-9]{10,})(?:\/|$|\?|\.)/) || [])[1];

const fetchTo = (url, out) => {
  execFileSync("curl", ["-sSfL", "-o", out, url]);
  return out;
};

const add = ({ id, sticker, title = "", author = "" }) => {
  if (catalog.find((c) => c.id === id)) { console.log(`  уже есть: ${id}`); return; }
  const gif = resolve(DIR, `${id}.gif`);
  fetchTo(`https://media.giphy.com/media/${id}/giphy.gif`, gif);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", gif]).toString());
  const { width, height } = probe.streams[0];
  let file;
  if (sticker) {
    // Прозрачный фон сохраняется только в VP9 с альфой.
    file = `${id}.webm`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", gif, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "30", resolve(DIR, file)]);
  } else {
    file = `${id}.mp4`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", gif, "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", resolve(DIR, file)]);
  }
  rmSync(gif);
  const entry = { id, title, author, sticker: !!sticker, width, height, seconds: +Number(probe.format.duration || 0).toFixed(2), src: `local/giphy/${file}` };
  catalog.push(entry);
  console.log(`  ✔ ${id} ${sticker ? "стикер" : "гифка"} ${width}×${height} → ${entry.src}`);
};

// Список со страницы канала — через настоящий браузер (как site-record).
const fromChannel = async (name) => {
  const require = createRequire(import.meta.url);
  const puppeteer = require("/root/.npm/_npx/702923228c2ce1e6/node_modules/puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"], headless: true, defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();
  await page.goto(`https://giphy.com/channel/${name}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));
  for (let i = 0; i < 10; i++) { await page.evaluate(() => window.scrollBy(0, 1500)); await new Promise((r) => setTimeout(r, 1000)); }
  const items = await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => /giphy\.com\/(gifs|stickers)\//.test(h)));
  const empty = await page.evaluate(() => /hasn't created any content/i.test(document.body.innerText));
  await browser.close();
  if (empty) console.log(`  Канал ${name} пока пустой — Giphy пишет «hasn't created any content yet».`);
  return [...new Set(items)].map((h) => ({ id: idOf(h), sticker: /\/stickers\//.test(h), author: name, title: decodeURIComponent(h.split("/").pop().replace(/-[A-Za-z0-9]{10,}$/, "").replace(/-/g, " ")) }));
};

if (args.channel) {
  const list = await fromChannel(String(args.channel));
  console.log(`\n  ${args.channel}: найдено ${list.length}`);
  for (const it of list) if (it.id) add(it);
} else if (args.url) {
  const url = String(args.url);
  const id = idOf(url);
  if (!id) fail(`Не вижу id гифки в ссылке: ${url}`);
  add({ id, sticker: Boolean(args.sticker) || /\/stickers\//.test(url), title: url.split("/").pop().replace(/-?[A-Za-z0-9]{10,}$/, "").replace(/-/g, " ") });
} else {
  console.log(`\n  В каталоге ${catalog.length}:`);
  for (const c of catalog) console.log(`  ${c.id}  ${c.sticker ? "стикер" : "гифка "} ${c.width}×${c.height}  ${c.src}  ${c.title}`);
  console.log("\n  Добавить: npm run giphy -- --channel Ostap87 | --url <ссылка>\n");
  process.exit(0);
}
writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
console.log(`\n  ✔ data/giphy.json — ${catalog.length} шт.\n`);

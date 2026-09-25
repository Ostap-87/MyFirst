#!/usr/bin/env node
// Собирает композиции HyperFrames для роликов Head-Recut.
//
//   npm run recut                     собрать все ролики из clips.json
//   npm run recut -- --only st15-campus,st4-invite
//   npm run recut -- --config data/other-clips.json
//
// Дальше в папке ролика:
//   npx hyperframes check     проверка: линт, разметка, контраст
//   npx hyperframes render --sdr    рендер в MP4 (без --sdr уходит в HDR)
//
// ——— Почему генератор, а не шестнадцать файлов ———
//
// Вёрстка одна на все ролики, меняются только исходник, длительность и
// тексты. При копировании HTML правка геометрии расходится по файлам, и
// вскрывается это уже на публикации. Здесь правка шаблона доходит до всех.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(HERE, "batch");
const VENDOR = resolve(HERE, "vendor");

const args = process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc[a.slice(2)] = all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true;
  return acc;
}, {});

const fail = (m) => {
  console.error(`\n  ✖ ${m}\n`);
  process.exit(1);
};

const configPath = resolve(HERE, String(args.config ?? "clips.json"));
if (!existsSync(configPath)) fail(`Нет файла ${configPath}`);
const config = JSON.parse(readFileSync(configPath, "utf8"));

const only = args.only && args.only !== true ? String(args.only).split(",") : null;
const clips = only ? config.clips.filter((c) => only.includes(c.name)) : config.clips;
if (!clips.length) fail("Под фильтр --only ничего не подошло");

/**
 * Библиотеки не лежат в репозитории.
 *
 * gsap приходит вместе с навыком HyperFrames, three качается один раз и
 * кладётся в vendor — папка в .gitignore. Так в истории проекта нет чужого
 * кода, а сборка всё равно повторяема: версия three закреплена здесь.
 *
 * three берётся локальным файлом, а не с CDN, ещё и потому, что браузер
 * рендера не всегда доверяет сертификату прокси, а рендер не должен
 * зависеть от сети.
 */
const THREE_VERSION = "0.181.2";
const ensureVendor = () => {
  mkdirSync(VENDOR, { recursive: true });

  for (const file of ["three.module.js", "three.core.js"]) {
    const dest = resolve(VENDOR, file);
    if (existsSync(dest)) continue;
    console.log(`  Качаю ${file}…`);
    execFileSync("curl", [
      "-sSfL", "-o", dest,
      `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/${file}`,
    ]);
  }

  const gsap = resolve(VENDOR, "gsap.min.js");
  if (!existsSync(gsap)) {
    const fromSkill = resolve(
      ROOT, "..", ".agents/skills/talking-head-recut/assets/vendor/gsap.min.js",
    );
    if (existsSync(fromSkill)) {
      cpSync(fromSkill, gsap);
    } else {
      console.log("  Качаю gsap.min.js…");
      execFileSync("curl", [
        "-sSfL", "-o", gsap,
        "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js",
      ]);
    }
  }
};

/**
 * Экранирование текста плашек.
 *
 * Тексты пишутся людьми и содержат кавычки, тире и амперсанды. Без
 * экранирования первая же угловая скобка развалит разметку молча: ролик
 * отрендерится с обрезанной плашкой, и это заметят уже на публикации.
 */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Нижняя однострочная плашка: утверждение под речью. */
const card = (c, i) => {
  const num = c.num ? `<span class="num">${esc(c.num)}</span>` : "";
  const second = c.second ? ` <span class="second">${esc(c.second)}</span>` : "";
  return `      <div id="c${i}" class="card clip" data-start="${c.at}" data-duration="${(c.out - c.at + 0.3).toFixed(2)}" data-track-index="1">
        <div class="panel">
          ${num}
          <span class="lines">${esc(c.text)}${second}</span>
        </div>
      </div>`;
};

/**
 * Плашка накопительного списка.
 *
 * until не задан — плашка стоит до конца ролика. Так оформляется последняя
 * в перечислении: она остаётся выводом, а не гаснет вместе с остальными.
 */
const plate = (pl, i, total) => {
  const cls = ["plate", pl.kind === "accent" ? "accent" : "", pl.kind === "struck" ? "struck" : ""]
    .filter(Boolean)
    .join(" ");
  const until = pl.until ?? total;
  const strike = pl.kind === "struck" ? '<span class="strike"></span>' : "";
  return `        <div id="p${i}" class="${cls} clip" data-start="${pl.at}" data-duration="${(until - pl.at).toFixed(2)}" data-track-index="${2 + i}">${esc(pl.text)}${strike}</div>`;
};

const PKG = (name) => JSON.stringify({
  name,
  private: true,
  type: "module",
  scripts: {
    dev: "npx --yes hyperframes preview",
    check: "npx --yes hyperframes check",
    // --sdr обязателен: айфон пишет HLG, и без флага рендер уходит в HDR —
    // 12 ГБ промежуточных кадров на 30 с ролика и отказ при нехватке диска.
    render: "npx --yes hyperframes render --sdr",
  },
}, null, 2) + "\n";

const HF_JSON = JSON.stringify({
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
  media: { autoProxy: true },
  authoringSkill: "talking-head-recut",
}, null, 2) + "\n";

ensureVendor();
const TEMPLATE = readFileSync(resolve(HERE, "template.html"), "utf8");

for (const clip of clips) {
  const source = resolve(ROOT, "public/local", `${clip.src}.mp4`);
  if (!existsSync(source)) fail(`Нет исходника: ${source}\n    Тяжёлые съёмки лежат в public/local и в репозиторий не коммитятся.`);

  const dir = resolve(OUT, clip.name);
  mkdirSync(resolve(dir, "media"), { recursive: true });

  // Ресурсы копируются, а не линкуются: рендер открывает файлы из папки
  // проекта и симлинк за её пределы не разворачивает.
  cpSync(VENDOR, resolve(dir, "vendor"), { recursive: true });
  mkdirSync(resolve(dir, "fonts"), { recursive: true });
  cpSync(resolve(ROOT, "public/fonts/Inter.ttf"), resolve(dir, "fonts/Inter.ttf"));
  cpSync(source, resolve(dir, "media/head.mp4"));
  writeFileSync(resolve(dir, "package.json"), PKG(clip.name), "utf8");
  writeFileSync(resolve(dir, "hyperframes.json"), HF_JSON, "utf8");

  const cards = (clip.cards ?? []).map(card).join("\n\n");
  const timeline = (clip.cards ?? [])
    .map((c, i) => `        { id: "c${i}", at: ${c.at}, out: ${c.out} },`)
    .join("\n");
  const plates = (clip.plates ?? []).map((pl, i) => plate(pl, i, clip.seconds)).join("\n");
  const plateTl = (clip.plates ?? [])
    .map((pl, i) => {
      const until = pl.until ?? null;
      return `        { id: "p${i}", at: ${pl.at}, out: ${until === null ? "null" : (until - 0.3).toFixed(2)}, strike: ${pl.kind === "struck"} },`;
    })
    .join("\n");

  const html = TEMPLATE.replaceAll("__DURATION__", String(clip.seconds))
    .replace("__CARDS__", cards)
    .replace("__PLATES__", plates)
    .replace("__PLATE_TL__", plateTl)
    .replace("__TIMELINE__", timeline);

  writeFileSync(resolve(dir, "index.html"), html, "utf8");
  console.log(
    `  ✔ ${clip.name.padEnd(20)} ${String(clip.seconds).padStart(6)} с   ` +
      `снизу ${(clip.cards ?? []).length}, в списке ${(clip.plates ?? []).length}`,
  );
}

console.log(`\n  Собрано ${clips.length} в ${OUT.replace(ROOT + "/", "")}`);
console.log(`  Дальше: cd ${OUT.replace(ROOT + "/", "")}/<ролик> && npx hyperframes check && npx hyperframes render\n`);

// Общие хелперы для скриптов new-effect / new-composition / set-theme.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = resolve(ROOT, "src");
export const EFFECTS_DIR = resolve(SRC, "shared/components/effects");
export const ROOT_TSX = resolve(SRC, "Root.tsx");

/** Бренды проекта: папка, префикс композиций в Root.tsx, как звать тему. */
export const BRANDS = {
  globaltechtour: {
    dir: "globaltechtour",
    prefix: "GTT",
    themeExport: "globaltechtourTheme",
    title: "GlobalTechTour",
    aliases: ["gtt", "globaltechtour", "тур", "tour", "делегация"],
  },
  "aura-robotics": {
    dir: "aura-robotics",
    prefix: "Aura",
    themeExport: "auraRoboticsTheme",
    title: "Aura Robotics",
    aliases: ["aura", "aura-robotics", "робот", "robotics"],
  },
  ostapdotcenko: {
    dir: "ostapdotcenko",
    prefix: "Personal",
    themeExport: "ostapdotcenkoTheme",
    title: "ostapdotcenko",
    aliases: ["personal", "ostapdotcenko", "блог", "blog", "личный"],
  },
};

/** Разбирает `--key value` и `--flag`. */
export const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
};

/** "aura" / "робот" / "aura-robotics" -> ключ бренда. */
export const resolveBrand = (input) => {
  if (!input || input === true) return null;
  const needle = String(input).toLowerCase().trim();
  for (const [key, brand] of Object.entries(BRANDS)) {
    if (key === needle || brand.aliases.includes(needle))
      return { key, ...brand };
  }
  return null;
};

export const pascalCase = (input) =>
  String(input)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

export const camelCase = (input) => {
  const pascal = pascalCase(input);
  // Ведущую аббревиатуру опускаем целиком: GTTIntro -> gttIntro, а не gTTIntro.
  const abbreviation = /^([A-Z]+)(?=[A-Z][a-z]|\d|$)/.exec(pascal);
  if (abbreviation) {
    return abbreviation[1].toLowerCase() + pascal.slice(abbreviation[1].length);
  }
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

export const read = (path) => readFileSync(path, "utf8");
export const write = (path, content) => writeFileSync(path, content, "utf8");

/**
 * Вставляет строку перед закрывающим маркером (строчный `// <marker>:end`
 * или JSX-вариант того же маркера),
 * если её там ещё нет. Возвращает true, если файл изменился.
 */
export const insertBeforeMarker = (path, marker, snippet) => {
  const content = read(path);
  const endMarker = content.includes(`// ${marker}:end`)
    ? `// ${marker}:end`
    : `{/* ${marker}:end */}`;
  const index = content.indexOf(endMarker);
  if (index === -1) {
    throw new Error(
      `В ${path} не найден маркер "${marker}:end" — скрипт не может вставить код автоматически.`,
    );
  }
  if (content.includes(snippet.trim())) return false;

  const lineStart = content.lastIndexOf("\n", index) + 1;
  const indent = content.slice(lineStart, index);
  write(
    path,
    content.slice(0, lineStart) +
      indent +
      snippet +
      indent +
      content.slice(index),
  );
  return true;
};

export const fail = (message) => {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
};

export const brandList = () =>
  Object.values(BRANDS)
    .map((b) => `${b.aliases[0]} (${b.title})`)
    .join(", ");

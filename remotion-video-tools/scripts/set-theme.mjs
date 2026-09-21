#!/usr/bin/env node
// Меняет одно значение в theme.ts нужного бренда, не трогая остальной файл.
//
//   npm run set-theme -- --brand aura --key colors.accent --value "#40e0d0"
//   npm run set-theme -- --brand gtt --key fonts.heading --value "Unbounded"
//   npm run set-theme -- --brand personal --key spacing.xl --value 160
//
// Без --value скрипт просто показывает текущее значение.
import { resolve } from "node:path";
import {
  SRC,
  brandList,
  fail,
  parseArgs,
  read,
  resolveBrand,
  write,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const brand = resolveBrand(args.brand);

if (!brand) {
  fail(`Укажите бренд: --brand <${brandList()}>`);
}
if (!args.key || args.key === true) {
  fail(
    "Укажите ключ: --key colors.accent (группы: colors, fonts, spacing; или верхний уровень: --key name)",
  );
}

const file = resolve(SRC, brand.dir, "theme.ts");
const source = read(file);

const path = String(args.key).split(".");
if (path.length > 2) {
  fail(
    `Ключ "${args.key}" слишком вложенный: поддерживается "группа.ключ" или "ключ".`,
  );
}

const [group, leaf] = path.length === 2 ? path : [null, path[0]];

// Сужаем поиск до нужной группы, чтобы не поймать одноимённый ключ соседней.
let scopeStart = 0;
let scopeEnd = source.length;

if (group) {
  const groupMatch = new RegExp(`\\n  ${group}: \\{`).exec(source);
  if (!groupMatch) {
    fail(
      `В ${brand.dir}/theme.ts нет группы "${group}". Есть: colors, fonts, spacing.`,
    );
  }
  scopeStart = groupMatch.index + groupMatch[0].length;
  const closing = source.indexOf("\n  },", scopeStart);
  scopeEnd = closing === -1 ? source.length : closing;
}

const scope = source.slice(scopeStart, scopeEnd);
const leafRe = new RegExp(`(\\n\\s+"?${leaf}"?: )([^,\\n]+)(,)`);
const leafMatch = leafRe.exec(scope);

if (!leafMatch) {
  fail(`Ключ "${args.key}" не найден в ${brand.dir}/theme.ts.`);
}

const current = leafMatch[2];
const currentIsString = current.startsWith('"');

if (args.value === undefined || args.value === true) {
  console.log(`\n  ${brand.title} -> ${args.key} = ${current}\n`);
  process.exit(0);
}

const value = String(args.value);

// Проверяем формат, чтобы не записать в тему заведомый мусор.
if (
  group === "colors" &&
  !/^#[0-9a-fA-F]{3,8}$/.test(value) &&
  !/^(rgb|hsl)a?\(/.test(value)
) {
  fail(
    `"${value}" не похоже на цвет. Ожидается HEX (#2563eb) или rgb()/hsl().`,
  );
}
if (!currentIsString && !/^-?\d+(\.\d+)?$/.test(value)) {
  fail(`Ключ "${args.key}" числовой, а "${value}" — не число.`);
}

const next = currentIsString ? `"${value}"` : value;
const updatedScope = scope.replace(leafRe, `$1${next}$3`);
write(
  file,
  source.slice(0, scopeStart) + updatedScope + source.slice(scopeEnd),
);

console.log(`
  ✔ ${brand.title}: ${args.key}  ${current}  ->  ${next}
    файл: src/${brand.dir}/theme.ts
`);

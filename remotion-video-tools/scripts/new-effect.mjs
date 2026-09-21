#!/usr/bin/env node
// Создаёт новый переиспользуемый эффект в src/shared/components/effects.
//
//   npm run new-effect -- --name GlitchTransition
//
// См. CLAUDE.md, правило 4: любая новая анимация живёт здесь, а не inline
// внутри композиции конкретного бренда.
import { existsSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EFFECTS_DIR,
  camelCase,
  fail,
  insertBeforeMarker,
  parseArgs,
  pascalCase,
  read,
  write,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.name || args.name === true) {
  fail(
    'Укажите имя: npm run new-effect -- --name SlideInSpring [--what "что делает эффект"]',
  );
}

const Name = pascalCase(args.name);
const name = camelCase(args.name);
const what =
  typeof args.what === "string" ? args.what : `TODO: что делает эффект ${Name}`;
const file = resolve(EFFECTS_DIR, `${Name}.tsx`);

if (existsSync(file) && !args.force) {
  fail(`${Name}.tsx уже существует. Перезаписать: добавьте --force.`);
}

const template = `import { interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * ${Name} — ${what}
 *
 * Параметры описаны Zod-схемой, поэтому эффект можно выставить прямо
 * в правой панели Remotion Studio, если прокинуть схему в <Composition schema={...} />.
 */
export const ${name}Schema = z.object({
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров после начала сцены эффект стартует"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длительность эффекта в кадрах"),
});

export type ${Name}Params = z.infer<typeof ${name}Schema>;

/** Любой параметр можно опустить — возьмётся значение из ${name}Defaults. */
export type ${Name}Props = Partial<${Name}Params> & {
  readonly children: React.ReactNode;
};

export const ${name}Defaults: ${Name}Params = {
  delayInFrames: 0,
  durationInFrames: 20,
};

export const ${Name}: React.FC<${Name}Props> = ({ children, ...params }) => {
  const { delayInFrames, durationInFrames } = { ...${name}Defaults, ...params };
  const frame = useCurrentFrame();

  // progress: 0 -> 1 за durationInFrames кадров, начиная с delayInFrames.
  const progress = interpolate(frame - delayInFrames, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // TODO: превратите progress в само движение (transform / opacity / filter).
  return <div style={{ opacity: progress }}>{children}</div>;
};
`;

write(file, template);

// Барель-экспорт, чтобы эффект импортировался одной строкой.
const indexFile = resolve(EFFECTS_DIR, "index.ts");
if (existsSync(indexFile)) {
  insertBeforeMarker(
    indexFile,
    "new-effect:exports",
    `export * from "./${Name}";\n`,
  );
}

// Строка-заготовка в таблице README эффектов.
const readmeFile = resolve(EFFECTS_DIR, "README.md");
if (existsSync(readmeFile)) {
  const readme = read(readmeFile);
  if (!readme.includes(`| \`${Name}\` |`)) {
    appendFileSync(
      readmeFile,
      `| \`${Name}\` | ${what} | \`delayInFrames\`, \`durationInFrames\` |\n`,
      "utf8",
    );
  }
}

console.log(`
  ✔ Создан эффект: src/shared/components/effects/${Name}.tsx
  ✔ Экспорт добавлен в effects/index.ts, строка — в effects/README.md

  Как использовать в композиции:

    import { ${Name}, ${name}Defaults } from "../../shared/components/effects";

    <${Name} {...${name}Defaults}>
      <YourContent />
    </${Name}>

  Посмотреть на нейтральных данных:  npx remotion studio  ->  Shared-EffectsLab
`);

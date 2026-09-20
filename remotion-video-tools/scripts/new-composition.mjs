#!/usr/bin/env node
// Создаёт новую композицию бренда и регистрирует её в src/Root.tsx.
//
//   npm run new-composition -- --brand aura --name CaseStudy
//   npm run new-composition -- --brand personal --name Reel --format vertical
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROOT_TSX,
  SRC,
  camelCase,
  brandList,
  fail,
  insertBeforeMarker,
  parseArgs,
  pascalCase,
  resolveBrand,
  write,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const brand = resolveBrand(args.brand);

if (!brand) {
  fail(`Укажите бренд: --brand <${brandList()}>`);
}
if (!args.name || args.name === true) {
  fail("Укажите имя композиции: --name CaseStudy");
}

const FORMATS = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

const formatKey = typeof args.format === "string" ? args.format : "landscape";
const format = FORMATS[formatKey];
if (!format) {
  fail(
    `Неизвестный формат "${formatKey}". Доступны: ${Object.keys(FORMATS).join(", ")}`,
  );
}

const fps = Number(args.fps ?? 30);
const durationInFrames = Number(args.duration ?? 150);
const Name = pascalCase(args.name);
const Component = `${brand.prefix}${Name}`;
const local = camelCase(Component);
const compositionId = `${brand.prefix}-${Name}`;

const dir = resolve(SRC, brand.dir, "compositions");
mkdirSync(dir, { recursive: true });
const file = resolve(dir, `${Name}.tsx`);

if (existsSync(file) && !args.force) {
  fail(
    `${brand.dir}/compositions/${Name}.tsx уже существует. Перезаписать: --force.`,
  );
}

const template = `import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FadeIn, SlideInSpring } from "../../shared/components/effects";
import { fontFamily } from "../../shared/fonts";
import { ${brand.themeExport} as theme } from "../theme";

/**
 * ${compositionId} — TODO: о чём эта сцена.
 *
 * Бренд ${brand.title}: цвета и шрифты берём только из ../theme (CLAUDE.md, правило 1).
 */
export const ${local}Schema = z.object({
  title: z.string().describe("Заголовок сцены"),
  subtitle: z.string().describe("Подзаголовок под заголовком"),
});

export type ${Component}Props = z.infer<typeof ${local}Schema>;

export const ${local}Defaults: ${Component}Props = {
  title: "${brand.title}",
  subtitle: "TODO: подзаголовок",
};

export const ${Component}: React.FC<${Component}Props> = ({ title, subtitle }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <SlideInSpring direction="up" distance={80} delayInFrames={0} damping={14}>
        <h1
          style={{
            margin: 0,
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: 96,
            lineHeight: 1.05,
            color: theme.colors.text,
          }}
        >
          {title}
        </h1>
      </SlideInSpring>

      <FadeIn delayInFrames={12} durationInFrames={18} translateY={24}>
        <p
          style={{
            margin: 0,
            fontFamily: fontFamily(theme.fonts.body),
            fontWeight: theme.fonts.bodyWeight,
            fontSize: 40,
            color: theme.colors.muted,
          }}
        >
          {subtitle}
        </p>
      </FadeIn>
    </AbsoluteFill>
  );
};
`;

write(file, template);

insertBeforeMarker(
  ROOT_TSX,
  "new-composition:imports",
  `import { ${Component}, ${local}Defaults, ${local}Schema } from "./${brand.dir}/compositions/${Name}";\n`,
);

insertBeforeMarker(
  ROOT_TSX,
  "new-composition",
  `<Composition
        id="${compositionId}"
        component={${Component}}
        schema={${local}Schema}
        defaultProps={${local}Defaults}
        durationInFrames={${durationInFrames}}
        fps={${fps}}
        width={${format.width}}
        height={${format.height}}
      />
      `,
);

console.log(`
  ✔ Создана композиция: src/${brand.dir}/compositions/${Name}.tsx
  ✔ Зарегистрирована в src/Root.tsx как "${compositionId}" (${format.width}×${format.height}, ${fps} fps, ${durationInFrames} кадров)

  Открыть:   npx remotion studio       ->  ${compositionId}
  Отрендерить: npx remotion render ${compositionId} out/${compositionId}.mp4
`);

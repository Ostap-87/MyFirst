import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * FilmGrain — плёночное зерно и виньетка поверх кадра.
 *
 * Плоские заливки и градиенты выглядят «цифрово-стерильными»; тонкий слой
 * шума возвращает кадру текстуру и заодно маскирует бандинг на градиентах.
 * Зерно должно шевелиться каждый кадр — статичный шум читается как грязь
 * на объективе, поэтому позиция паттерна смещается по random(кадр).
 *
 * Кладётся последним слоем сцены, поверх всего остального.
 */
export const filmGrainSchema = z.object({
  opacity: z
    .number()
    .min(0)
    .max(1)
    .describe("Плотность зерна: 0.04–0.12 — рабочий диапазон"),
  grainSize: z.number().min(1).describe("Размер зерна в пикселях"),
  vignette: z
    .number()
    .min(0)
    .max(1)
    .describe("Сила затемнения по краям кадра, 0 — выключить"),
  animate: z.boolean().describe("Шевелить ли зерно от кадра к кадру"),
  blendMode: z
    .enum(["overlay", "soft-light", "screen"])
    .describe(
      "Режим наложения: overlay — для светлых сцен, screen или soft-light — для тёмных, где overlay почти не виден",
    ),
});

export type FilmGrainParams = z.infer<typeof filmGrainSchema>;

/** Любой параметр можно опустить — возьмётся значение из filmGrainDefaults. */
export type FilmGrainProps = Partial<FilmGrainParams>;

export const filmGrainDefaults: FilmGrainParams = {
  opacity: 0.07,
  grainSize: 2,
  vignette: 0.35,
  animate: true,
  blendMode: "overlay",
};

export const FilmGrain: React.FC<FilmGrainProps> = (params) => {
  const { opacity, grainSize, vignette, animate, blendMode } = {
    ...filmGrainDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  // Шум рисуем inline-фильтром feTurbulence, а не background-image: картинку
  // из background Remotion не дожидается и кадр может уйти без зерна
  // (правило @remotion/no-background-image), а SVG-фильтр считается синхронно.
  //
  // seed меняем каждый кадр — статичное зерно читается как грязь на объективе.
  // Значение детерминированное: random(seed) от номера кадра, а не Math.random.
  const seed = animate ? Math.floor(random(`grain-${frame}`) * 1000) : 1;

  // baseFrequency обратна размеру зерна: чем выше частота, тем мельче точки.
  const baseFrequency = 0.9 / grainSize;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignette}) 100%)`,
          }}
        />
      ) : null}

      <AbsoluteFill style={{ opacity, mixBlendMode: blendMode }}>
        <svg width="100%" height="100%">
          <filter id={`film-grain-${seed}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFrequency}
              numOctaves={3}
              seed={seed}
            />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter={`url(#film-grain-${seed})`}
          />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

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
});

export type FilmGrainParams = z.infer<typeof filmGrainSchema>;

/** Любой параметр можно опустить — возьмётся значение из filmGrainDefaults. */
export type FilmGrainProps = Partial<FilmGrainParams>;

export const filmGrainDefaults: FilmGrainParams = {
  opacity: 0.07,
  grainSize: 2,
  vignette: 0.35,
  animate: true,
};

export const FilmGrain: React.FC<FilmGrainProps> = (params) => {
  const { opacity, grainSize, vignette, animate } = {
    ...filmGrainDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  // Сдвиг паттерна: детерминированный (random с сидом от кадра), иначе
  // рендер не воспроизводится между прогонами.
  const shiftX = animate ? random(`grain-x-${frame}`) * 100 : 0;
  const shiftY = animate ? random(`grain-y-${frame}`) * 100 : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignette}) 100%)`,
          }}
        />
      ) : null}

      <AbsoluteFill
        style={{
          opacity,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: `${120 * grainSize}px ${120 * grainSize}px`,
          backgroundPosition: `${shiftX}px ${shiftY}px`,
        }}
      />
    </AbsoluteFill>
  );
};

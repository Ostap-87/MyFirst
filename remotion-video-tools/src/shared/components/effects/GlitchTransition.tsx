import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * GlitchTransition — глитч-переход между двумя сценами.
 *
 * До transitionAtFrame виден слой before, после — after, а в окне перехода
 * кадр разрезается на горизонтальные полосы: каждая едет по X на свою величину,
 * плюс поверх идёт RGB-сдвиг (красный и голубой слои расходятся). Смещения
 * берутся из random(seed) — значение детерминированное, поэтому рендер
 * воспроизводится кадр в кадр и не «кипит» между прогонами.
 */
export const glitchTransitionSchema = z.object({
  transitionAtFrame: z
    .number()
    .int()
    .min(0)
    .describe("Кадр, на котором происходит смена сцен"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длина глитча в кадрах (обычно 6–14)"),
  sliceCount: z
    .number()
    .int()
    .min(1)
    .describe("На сколько горизонтальных полос режется кадр"),
  intensity: z
    .number()
    .min(0)
    .describe("Максимальный сдвиг полосы в пикселях на пике глитча"),
  rgbSplit: z
    .number()
    .min(0)
    .describe("Расхождение красного и голубого каналов в пикселях"),
  seed: z
    .string()
    .describe("Сид случайных смещений: одинаковый сид — одинаковый глитч"),
});

export type GlitchTransitionParams = z.infer<typeof glitchTransitionSchema>;

/** Параметры глитча необязательны — недостающие берутся из glitchTransitionDefaults. */
export type GlitchTransitionProps = Partial<GlitchTransitionParams> & {
  /** Сцена до перехода. */
  readonly before: React.ReactNode;
  /** Сцена после перехода. */
  readonly after: React.ReactNode;
};

export const glitchTransitionDefaults: GlitchTransitionParams = {
  transitionAtFrame: 60,
  durationInFrames: 10,
  sliceCount: 12,
  intensity: 90,
  rgbSplit: 14,
  seed: "glitch",
};

export const GlitchTransition: React.FC<GlitchTransitionProps> = ({
  before,
  after,
  ...params
}) => {
  const {
    transitionAtFrame,
    durationInFrames,
    sliceCount,
    intensity,
    rgbSplit,
    seed,
  } = {
    ...glitchTransitionDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  const start = transitionAtFrame - Math.floor(durationInFrames / 2);
  const local = frame - start;
  const isGlitching = local >= 0 && local <= durationInFrames;

  if (!isGlitching) {
    return (
      <AbsoluteFill>{frame < transitionAtFrame ? before : after}</AbsoluteFill>
    );
  }

  // Сила глитча: 0 -> 1 -> 0, пик приходится ровно на момент смены сцен.
  const strength = interpolate(
    local,
    [0, durationInFrames / 2, durationInFrames],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const content = frame < transitionAtFrame ? before : after;
  const sliceHeight = 100 / sliceCount;

  const slices = Array.from({ length: sliceCount }, (_, index) => {
    // Смещение полосы зависит и от индекса, и от кадра — иначе полосы
    // застынут на месте и глитч будет выглядеть как статичная картинка.
    const offset =
      (random(`${seed}-${index}-${Math.floor(local)}`) - 0.5) *
      2 *
      intensity *
      strength;
    const top = index * sliceHeight;

    return (
      <AbsoluteFill
        key={index}
        style={{
          clipPath: `inset(${top}% 0% ${100 - top - sliceHeight}% 0%)`,
          transform: `translateX(${offset}px)`,
        }}
      >
        {content}
      </AbsoluteFill>
    );
  });

  const split = rgbSplit * strength;

  // RGB-сдвиг: два дубля кадра, разведённые по X, у одного оставлен только
  // красный канал, у другого — зелёный с синим (голубой). Каналы выделяем
  // feColorMatrix, а не CSS hue-rotate: hue-rotate заметно «уводит» оттенок
  // и вместо красного даёт зелень. Поверх — screen, как на плохом сигнале.
  const filterId = `glitch-${seed.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const channel = (offset: number, id: string): React.CSSProperties => ({
    transform: `translateX(${offset}px)`,
    opacity: 0.6 * strength,
    mixBlendMode: "screen",
    filter: `url(#${id})`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={`${filterId}-r`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />
          </filter>
          <filter id={`${filterId}-c`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {slices}
      <AbsoluteFill style={channel(split, `${filterId}-r`)}>
        {content}
      </AbsoluteFill>
      <AbsoluteFill style={channel(-split, `${filterId}-c`)}>
        {content}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

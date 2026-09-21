import { Easing, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * FadeIn — плавное появление с опциональным подъёмом снизу.
 *
 * Базовый приём: прозрачность 0 -> 1 плюс небольшой сдвиг по Y, чтобы блок
 * не «проявлялся» на месте, а как будто всплывал. Кривая — Easing.out(cubic):
 * быстрый старт, мягкая остановка, без пружинного перелёта.
 */
export const fadeInSchema = z.object({
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров после начала сцены эффект стартует"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длительность появления в кадрах"),
  translateY: z
    .number()
    .describe("На сколько пикселей блок поднимается снизу (0 — без сдвига)"),
});

export type FadeInParams = z.infer<typeof fadeInSchema>;

/** Любой параметр можно опустить — возьмётся значение из fadeInDefaults. */
export type FadeInProps = Partial<FadeInParams> & {
  readonly children: React.ReactNode;
};

export const fadeInDefaults: FadeInParams = {
  delayInFrames: 0,
  durationInFrames: 18,
  translateY: 24,
};

export const FadeIn: React.FC<FadeInProps> = ({ children, ...params }) => {
  const { delayInFrames, durationInFrames, translateY } = {
    ...fadeInDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame - delayInFrames,
    [0, durationInFrames],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * translateY}px)`,
      }}
    >
      {children}
    </div>
  );
};

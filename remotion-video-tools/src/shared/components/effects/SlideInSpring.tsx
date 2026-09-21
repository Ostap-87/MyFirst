import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";

/**
 * SlideInSpring — текст или объект выезжает с пружинным эффектом.
 *
 * Отличие от FadeIn: движение считает spring(), поэтому у блока есть инерция
 * и лёгкий перелёт за конечную точку. Мягкость настраивается damping:
 * 8–12 — заметная пружина, 14–20 — сдержанный деловой выезд,
 * 100 — практически без перелёта.
 */
export const slideInSpringSchema = z.object({
  direction: z
    .enum(["up", "down", "left", "right"])
    .describe("Откуда выезжает блок: up — снизу вверх, left — слева направо"),
  distance: z.number().min(0).describe("Дистанция выезда в пикселях"),
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров после начала сцены блок стартует"),
  damping: z
    .number()
    .min(1)
    .describe("Затухание пружины: меньше — заметнее перелёт"),
  mass: z
    .number()
    .min(0.1)
    .describe("Масса: больше — тяжелее и медленнее движение"),
  stiffness: z
    .number()
    .min(1)
    .describe("Жёсткость пружины: больше — резче старт"),
  fade: z.boolean().describe("Гасить ли прозрачность вместе с выездом"),
});

export type SlideInSpringParams = z.infer<typeof slideInSpringSchema>;

/** Любой параметр можно опустить — возьмётся значение из slideInSpringDefaults. */
export type SlideInSpringProps = Partial<SlideInSpringParams> & {
  readonly children: React.ReactNode;
};

export const slideInSpringDefaults: SlideInSpringParams = {
  direction: "up",
  distance: 80,
  delayInFrames: 0,
  damping: 14,
  mass: 1,
  stiffness: 100,
  fade: true,
};

const AXIS = {
  up: { axis: "Y", sign: 1 },
  down: { axis: "Y", sign: -1 },
  left: { axis: "X", sign: 1 },
  right: { axis: "X", sign: -1 },
} as const;

export const SlideInSpring: React.FC<SlideInSpringProps> = ({
  children,
  ...params
}) => {
  const { direction, distance, delayInFrames, damping, mass, stiffness, fade } =
    {
      ...slideInSpringDefaults,
      ...params,
    };
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delayInFrames,
    fps,
    config: { damping, mass, stiffness },
  });

  const { axis, sign } = AXIS[direction];
  const offset = interpolate(progress, [0, 1], [distance * sign, 0]);

  // Прозрачность догоняет движение быстрее самого выезда: к середине пружины
  // блок уже читается, а «доезжает» он уже видимым.
  const opacity = fade
    ? interpolate(progress, [0, 0.6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div
      style={{
        opacity,
        transform: `translate${axis}(${offset}px)`,
      }}
    >
      {children}
    </div>
  );
};

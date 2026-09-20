import { Trail } from "@remotion/motion-blur";
import { z } from "zod";

/**
 * MotionTrail — шлейф за быстро движущимся объектом.
 *
 * Тонкая разница между «анимацией на CSS» и моушн-дизайном: реальная камера
 * размазывает быстрое движение, а резкий выезд без смаза читается как дёрганый.
 * Обёртка над <Trail> из @remotion/motion-blur: он дорисовывает копии
 * содержимого с предыдущих кадров и гасит их прозрачность.
 *
 * Внутрь кладётся уже анимированный блок — например, SlideInSpring.
 */
export const motionTrailSchema = z.object({
  layers: z
    .number()
    .int()
    .min(1)
    .max(30)
    .describe(
      "Сколько копий с прошлых кадров дорисовывать: 5–12 обычно достаточно",
    ),
  lagInFrames: z
    .number()
    .min(0.1)
    .describe("Насколько кадров отстаёт каждая следующая копия"),
  trailOpacity: z
    .number()
    .min(0)
    .max(1)
    .describe("Прозрачность самой яркой копии"),
});

export type MotionTrailParams = z.infer<typeof motionTrailSchema>;

/** Любой параметр можно опустить — возьмётся значение из motionTrailDefaults. */
export type MotionTrailProps = Partial<MotionTrailParams> & {
  readonly children: React.ReactNode;
};

export const motionTrailDefaults: MotionTrailParams = {
  layers: 8,
  lagInFrames: 1,
  trailOpacity: 0.5,
};

export const MotionTrail: React.FC<MotionTrailProps> = ({
  children,
  ...params
}) => {
  const { layers, lagInFrames, trailOpacity } = {
    ...motionTrailDefaults,
    ...params,
  };

  return (
    <Trail
      layers={layers}
      lagInFrames={lagInFrames}
      trailOpacity={trailOpacity}
    >
      {children}
    </Trail>
  );
};

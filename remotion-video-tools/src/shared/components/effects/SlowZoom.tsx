import { useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * SlowZoom — Плавный бесконечный наезд-выезд (дыхание) на весь кадр, туда-обратно по синусоиде
 *
 * Параметры описаны Zod-схемой, поэтому эффект можно выставить прямо
 * в правой панели Remotion Studio, если прокинуть схему в <Composition schema={...} />.
 */
export const slowZoomSchema = z.object({
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Фазовый сдвиг цикла в кадрах"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длина одного полного цикла наезд-выезд в кадрах — эффект зациклен"),
  scaleFrom: z.number().min(0.5).describe("Минимальный масштаб (в начале и в конце цикла)"),
  scaleTo: z.number().min(0.5).describe("Максимальный масштаб (в середине цикла)"),
});

export type SlowZoomParams = z.infer<typeof slowZoomSchema>;

/** Любой параметр можно опустить — возьмётся значение из slowZoomDefaults. */
export type SlowZoomProps = Partial<SlowZoomParams> & {
  readonly children: React.ReactNode;
};

export const slowZoomDefaults: SlowZoomParams = {
  delayInFrames: 0,
  durationInFrames: 150,
  scaleFrom: 1,
  scaleTo: 1.06,
};

/**
 * "Дыхание" кадра: масштаб плавно идёт scaleFrom -> scaleTo -> scaleFrom по
 * синусоиде, бесконечно зациклено — имитация лёгкого Ken Burns без резкого
 * скачка на стыке цикла (в отличие от линейного 0->1->0 синус не даёт излом).
 */
export const SlowZoom: React.FC<SlowZoomProps> = ({ children, ...params }) => {
  const { delayInFrames, durationInFrames, scaleFrom, scaleTo } = {
    ...slowZoomDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  const cycle = ((frame + delayInFrames) % durationInFrames) / durationInFrames;
  const wave = (1 - Math.cos(cycle * Math.PI * 2)) / 2; // 0 -> 1 -> 0, плавно
  const scale = scaleFrom + (scaleTo - scaleFrom) * wave;

  return (
    <div style={{ width: "100%", height: "100%", transform: `scale(${scale})` }}>
      {children}
    </div>
  );
};

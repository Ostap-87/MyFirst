import { interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * Shimmer — Диагональный блик света пробегает по кадру, переливаясь по тексту и лого
 *
 * Параметры описаны Zod-схемой, поэтому эффект можно выставить прямо
 * в правой панели Remotion Studio, если прокинуть схему в <Composition schema={...} />.
 */
export const shimmerSchema = z.object({
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Фазовый сдвиг цикла в кадрах — сдвигает, где блик находится в момент 0"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длина одного прохода блика в кадрах — эффект зациклен, повторяется каждые N кадров"),
  angleDeg: z.number().describe("Угол диагонали блика в градусах"),
  intensity: z.number().min(0).max(1).describe("Насколько яркий блик (0 — не виден, 1 — максимум)"),
});

export type ShimmerParams = z.infer<typeof shimmerSchema>;

/** Любой параметр можно опустить — возьмётся значение из shimmerDefaults. */
export type ShimmerProps = Partial<ShimmerParams> & {
  readonly children: React.ReactNode;
};

export const shimmerDefaults: ShimmerParams = {
  delayInFrames: 0,
  durationInFrames: 60,
  angleDeg: 100,
  intensity: 0.85,
};

/**
 * Диагональная полоса света бесконечно пробегает по кадру (mix-blend-mode:
 * overlay), зацикленная через остаток от деления — подходит для видео-петли
 * карусели, а не для одноразового появления.
 */
export const Shimmer: React.FC<ShimmerProps> = ({ children, ...params }) => {
  const { delayInFrames, durationInFrames, angleDeg, intensity } = {
    ...shimmerDefaults,
    ...params,
  };
  const frame = useCurrentFrame();

  const cycle = ((frame + delayInFrames) % durationInFrames) / durationInFrames;
  // Полоса едет от -180% до 180% фона, чтобы полностью пройти по диагонали
  // даже в углах кадра.
  const sweep = interpolate(cycle, [0, 1], [-180, 180]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "overlay",
          backgroundImage: `linear-gradient(${angleDeg}deg, transparent 42%, rgba(255,255,255,${intensity}) 50%, transparent 58%)`,
          backgroundSize: "300% 300%",
          backgroundPosition: `${sweep}% 50%`,
        }}
      />
    </div>
  );
};

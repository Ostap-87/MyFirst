import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * AuroraBackdrop — мягкие цветные полосы, плывущие по тёмному фону.
 *
 * Идея из React Bits (компонент Aurora), переписана под кадр: там полосы
 * живут по часам браузера, здесь каждая волна считается от номера кадра,
 * поэтому рендер детерминирован. Без шейдеров: три-четыре размытых
 * эллипса на радиальных градиентах, у каждого свой период и фаза.
 * Подкладывается за кольцо, карточки или вырезанного спикера.
 */
export const auroraBackdropSchema = z.object({
  colors: z.array(z.string()).describe("Цвета полос, 2–5"),
  background: z.string().describe("Цвет фона"),
  speed: z.number().min(0.1).max(3).describe("Скорость дрейфа"),
  blur: z.number().min(0).max(200).describe("Размытие полос, пиксели"),
  intensity: z.number().min(0).max(1).describe("Яркость полос"),
  seed: z.number().describe("Сдвиг фаз, чтобы два фона не совпадали"),
});

export type AuroraBackdropParams = z.infer<typeof auroraBackdropSchema>;
export type AuroraBackdropProps = Partial<AuroraBackdropParams>;

export const auroraBackdropDefaults: AuroraBackdropParams = {
  colors: ["#2563eb", "#0ea5a4", "#7c3aed", "#f59e0b"],
  background: "#070b16",
  speed: 1,
  blur: 90,
  intensity: 0.75,
  seed: 0,
};

export const AuroraBackdrop: React.FC<AuroraBackdropProps> = (params) => {
  const p = withDefaults(auroraBackdropDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (frame / fps) * p.speed + p.seed;
  return (
    <AbsoluteFill style={{ background: p.background, overflow: "hidden" }}>
      {p.colors.map((c, i) => {
        const n = p.colors.length;
        const x = 0.5 + 0.38 * Math.sin(t * 0.37 + i * 1.9);
        const y = 0.35 + 0.3 * Math.cos(t * 0.29 + i * 1.3) + (i / n) * 0.25;
        const w = width * (0.9 + 0.3 * Math.sin(t * 0.21 + i));
        const h = height * (0.22 + 0.08 * Math.cos(t * 0.33 + i * 0.7));
        const rot = 18 * Math.sin(t * 0.17 + i * 2.1) - 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width * x - w / 2,
              top: height * y - h / 2,
              width: w,
              height: h,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, ${c} 0%, ${c}00 70%)`,
              opacity: p.intensity,
              filter: `blur(${p.blur}px)`,
              transform: `rotate(${rot}deg)`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

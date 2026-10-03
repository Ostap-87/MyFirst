import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * BeamsBackdrop — косые лучи света на тёмном фоне.
 *
 * Идея из React Bits (Beams): несколько полупрозрачных полос идут по
 * диагонали и медленно дышат. Здесь каждая полоса считается от номера
 * кадра: сдвиг, ширина и яркость — синусы с разными периодами, так что
 * картинка не повторяется заметно и рендер детерминирован.
 */
export const beamsBackdropSchema = z.object({
  color: z.string().describe("Цвет лучей"),
  background: z.string().describe("Цвет фона"),
  count: z.number().int().min(1).max(12).describe("Сколько лучей"),
  angle: z.number().describe("Наклон лучей, градусы"),
  speed: z.number().min(0.1).max(3),
  intensity: z.number().min(0).max(1),
  blur: z.number().min(0).max(120),
  seed: z.number(),
});

export type BeamsBackdropParams = z.infer<typeof beamsBackdropSchema>;
export type BeamsBackdropProps = Partial<BeamsBackdropParams>;

export const beamsBackdropDefaults: BeamsBackdropParams = {
  color: "#60a5fa",
  background: "#070b16",
  count: 6,
  angle: -24,
  speed: 1,
  intensity: 0.55,
  blur: 30,
  seed: 0,
};

export const BeamsBackdrop: React.FC<BeamsBackdropProps> = (params) => {
  const p = withDefaults(beamsBackdropDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (frame / fps) * p.speed + p.seed;
  const diag = Math.hypot(width, height);
  return (
    <AbsoluteFill style={{ background: p.background, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: width / 2 - diag, top: height / 2 - diag, width: diag * 2, height: diag * 2, transform: `rotate(${p.angle}deg)` }}>
        {Array.from({ length: p.count }, (_, i) => {
          const base = ((i + 0.5) / p.count) * diag * 2;
          const drift = Math.sin(t * 0.25 + i * 1.7) * diag * 0.08;
          const w = diag * (0.05 + 0.04 * (1 + Math.sin(t * 0.4 + i)));
          const a = p.intensity * (0.55 + 0.45 * Math.sin(t * 0.6 + i * 0.9));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: base + drift - w / 2,
                width: w,
                background: `linear-gradient(90deg, ${p.color}00 0%, ${p.color} 50%, ${p.color}00 100%)`,
                opacity: a,
                filter: `blur(${p.blur}px)`,
                mixBlendMode: "screen",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

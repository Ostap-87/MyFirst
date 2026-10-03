import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * DotGrid — поле точек, по которому идёт волна.
 *
 * Идея из React Bits (Dot Field): сетка точек, у которых размер и
 * яркость меняются волной от центра. Волна считается от номера кадра.
 * Лёгкий технологичный фон под цифры, графики и карточки; рисуется
 * одним SVG, поэтому дёшев в рендере.
 */
export const dotGridSchema = z.object({
  color: z.string(),
  background: z.string(),
  spacing: z.number().min(20).max(200).describe("Шаг сетки, пиксели"),
  dot: z.number().min(1).max(20).describe("Базовый радиус точки"),
  waveSpeed: z.number().min(0.1).max(3),
  waveLength: z.number().min(100).max(2000).describe("Длина волны, пиксели"),
  originX: z.number().min(0).max(1),
  originY: z.number().min(0).max(1),
  intensity: z.number().min(0).max(1),
});

export type DotGridParams = z.infer<typeof dotGridSchema>;
export type DotGridProps = Partial<DotGridParams>;

export const dotGridDefaults: DotGridParams = {
  color: "#60a5fa",
  background: "#070b16",
  spacing: 54,
  dot: 3,
  waveSpeed: 1,
  waveLength: 700,
  originX: 0.5,
  originY: 0.45,
  intensity: 0.8,
};

export const DotGrid: React.FC<DotGridProps> = (params) => {
  const p = withDefaults(dotGridDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (frame / fps) * p.waveSpeed;
  const ox = width * p.originX;
  const oy = height * p.originY;
  const cols = Math.ceil(width / p.spacing) + 1;
  const rows = Math.ceil(height / p.spacing) + 1;
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * p.spacing;
      const y = r * p.spacing;
      const d = Math.hypot(x - ox, y - oy);
      const w = 0.5 + 0.5 * Math.sin((d / p.waveLength) * Math.PI * 2 - t * Math.PI * 2);
      const rr = p.dot * (0.6 + 1.4 * w);
      dots.push(<circle key={`${r}-${c}`} cx={x} cy={y} r={rr} fill={p.color} opacity={0.15 + 0.85 * w * p.intensity} />);
    }
  }
  return (
    <AbsoluteFill style={{ background: p.background }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>{dots}</svg>
    </AbsoluteFill>
  );
};

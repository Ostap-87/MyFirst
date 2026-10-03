import { useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * ShinyText — блик, пробегающий по тексту.
 *
 * Идея из React Bits (Shiny Text): по надписи слева направо идёт узкая
 * светлая полоса, как отражение на металле. Здесь полоса движется от
 * номера кадра. Текст передаётся в `children`, цвет и кегль задаёт
 * родитель; эффект только добавляет блик через градиентную заливку.
 */
export const shinyTextSchema = z.object({
  color: z.string().describe("Основной цвет текста"),
  shine: z.string().describe("Цвет блика"),
  periodSeconds: z.number().min(0.5).describe("Период пробега блика"),
  bandWidth: z.number().min(0.05).max(0.8).describe("Ширина полосы, доля ширины текста"),
  angle: z.number().describe("Угол полосы, градусы"),
});

export type ShinyTextParams = z.infer<typeof shinyTextSchema>;
export type ShinyTextProps = Partial<ShinyTextParams> & { readonly children: React.ReactNode };

export const shinyTextDefaults: ShinyTextParams = {
  color: "#ffffff",
  shine: "#bfe3ff",
  periodSeconds: 2.4,
  bandWidth: 0.25,
  angle: 110,
};

export const ShinyText: React.FC<ShinyTextProps> = ({ children, ...params }) => {
  const p = withDefaults(shinyTextDefaults, params);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = ((frame / fps) % p.periodSeconds) / p.periodSeconds; // 0..1
  const center = -p.bandWidth + pos * (1 + 2 * p.bandWidth);
  const a = Math.max(0, (center - p.bandWidth / 2) * 100);
  const b = Math.min(100, (center + p.bandWidth / 2) * 100);
  const m = ((a + b) / 2).toFixed(1);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${p.angle}deg, ${p.color} ${a.toFixed(1)}%, ${p.shine} ${m}%, ${p.color} ${b.toFixed(1)}%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
};

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { ArrowChart } from "./components/effects";

/**
 * Shared-ChartClip — «график роста» на весь кадр, рендерится в файл и
 * подкладывается фоном за вырезанного спикера (stages в ChinaStories берут
 * видео так же, как фото). Тёмный фон с лёгкой сеткой, крупная карточка
 * графика посередине, стрелка ползёт вверх все три секунды:
 *   npx remotion render <bundle> Shared-ChartClip out.mp4 --props='{"label":"Доля китайских брендов"}'
 */
export const chartClipSchema = z.object({
  label: z.string().describe("Подпись сверху карточки"),
  color: z.string().describe("Цвет линии"),
  drawSeconds: z.number().describe("За сколько секунд стрелка доходит до верха"),
  widthFraction: z.number().describe("Ширина карточки, доля ширины кадра"),
  y: z.number().describe("Центр карточки по высоте, доля кадра"),
});

export const chartClipDefaults: z.infer<typeof chartClipSchema> = {
  label: "Доля китайских брендов",
  color: "#4da3ff",
  drawSeconds: 2.2,
  widthFraction: 0.92,
  y: 0.42,
};

export const ChartClip: React.FC<z.infer<typeof chartClipSchema>> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // Медленный дрейф фона — чтобы задник не стоял мёртвой картинкой.
  const drift = (frame / fps) * 18;
  const glow = interpolate(frame, [0, fps * 3], [0.35, 0.6], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #070b16 0%, #0e1730 55%, #0a1226 100%)", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: `${width * 0.1}px ${width * 0.1}px`,
          backgroundPosition: `${-drift}px ${drift * 0.6}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: width * 0.5 - width * 0.7,
          top: height * p.y - width * 0.7,
          width: width * 1.4,
          height: width * 1.4,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${p.color} 0%, rgba(77,163,255,0) 60%)`,
          opacity: glow * 0.35,
        }}
      />
      <ArrowChart x={0.5} y={p.y} widthFraction={p.widthFraction} label={p.label} color={p.color} drawSeconds={p.drawSeconds} bars={8} />
    </AbsoluteFill>
  );
};

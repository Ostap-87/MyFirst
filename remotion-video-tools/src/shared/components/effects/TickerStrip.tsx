import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { measureText } from "@remotion/layout-utils";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * TickerStrip — бегущая строка заводов, как на сайте aura-robotics.ru:
 * тёмная полоса, названия капслоком, город серым, между ними точка
 * акцентного цвета. Скорость — пиксели в секунду, от номера кадра;
 * лента замкнута, поэтому любой длины ролик проходит без шва.
 */
export const tickerStripSchema = z.object({
  items: z.array(z.object({ name: z.string(), city: z.string() })),
  y: z.number().min(0).max(1).describe("Верх полосы, доля высоты"),
  heightFraction: z.number().min(0.03).max(0.2),
  speed: z.number().min(10).max(1000).describe("Пиксели в секунду"),
  background: z.string(),
  color: z.string(),
  muted: z.string(),
  accent: z.string(),
  font: z.string(),
  inFrames: z.number().int().min(0),
  durationInFrames: z.number().int().min(1),
});
export type TickerStripParams = z.infer<typeof tickerStripSchema>;
export type TickerStripProps = Partial<TickerStripParams>;

export const tickerStripDefaults: TickerStripParams = {
  items: [
    { name: "AgiBot", city: "Шанхай" },
    { name: "UBTech", city: "Шэньчжэнь" },
    { name: "Fourier", city: "Шанхай" },
    { name: "Kepler", city: "Шанхай" },
  ],
  y: 0.62,
  heightFraction: 0.052,
  speed: 140,
  background: "#262626",
  color: "#ffffff",
  muted: "#a6a4a1",
  accent: "#fff65d",
  font: "Inter",
  inFrames: 8,
  durationInFrames: 150,
};

export const TickerStrip: React.FC<TickerStripProps> = (params) => {
  const p = withDefaults(tickerStripDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const h = height * p.heightFraction;
  const fontSize = Math.round(h * 0.42);
  const family = fontFamily(p.font);
  const gap = fontSize * 1.6;
  const measured = p.items.map((it) => {
    const name = measureText({ text: it.name.toUpperCase(), fontFamily: family, fontSize, fontWeight: "700" }).width;
    const city = it.city ? measureText({ text: ` — ${it.city}`, fontFamily: family, fontSize, fontWeight: "400" }).width : 0;
    return name + city + gap;
  });
  const total = measured.reduce((a, b) => a + b, 0) || 1;
  const shift = ((frame / fps) * p.speed) % total;
  const reveal = interpolate(frame, [0, p.inFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fade = interpolate(frame, [p.durationInFrames - 8, p.durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const copies = Math.ceil(width / total) + 2;
  return (
    <div style={{ position: "absolute", left: 0, top: height * p.y, width, height: h, background: p.background, overflow: "hidden", transform: `scaleY(${reveal})`, transformOrigin: "center", opacity: fade }}>
      <div style={{ position: "absolute", left: -shift, top: 0, height: h, display: "flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: family, fontSize }}>
        {Array.from({ length: copies }, (_, c) =>
          p.items.map((it, i) => (
            <span key={`${c}-${i}`} style={{ display: "inline-flex", alignItems: "center", width: measured[i] }}>
              <span style={{ color: p.color, fontWeight: 700, letterSpacing: "0.04em" }}>{it.name.toUpperCase()}</span>
              {it.city ? <span style={{ color: p.muted }}>{` — ${it.city}`}</span> : null}
              <span style={{ color: p.accent, margin: `0 ${gap / 2 - fontSize * 0.2}px`, fontSize: fontSize * 0.9 }}>·</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
};

import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { CountUp } from "./CountUp";

/**
 * Наложения для промо сайта поверх записи экрана.
 *
 * StatBadge — крупная цифра с подписью в углу, отсчёт до значения.
 * TickerTape — бегущая строка названий понизу, как лента на бирже.
 * RouteChips — города маршрута, загораются по очереди в такт курсору.
 * CtaCard — финальный призыв: адрес сайта и цифра, которую надо запомнить.
 *
 * Все четыре живут внутри Sequence своего блока: кадр 0 — начало блока.
 */
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

export const statBadgeSchema = z.object({
  value: z.number(),
  suffix: z.string(),
  label: z.string(),
  accent: z.string(),
});
export const StatBadge: React.FC<z.infer<typeof statBadgeSchema>> = ({ value, suffix, label, accent }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const k = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: ease }) *
    interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        right: width * 0.06,
        top: 0,
        opacity: k,
        transform: `translateY(${(1 - k) * -20}px)`,
        padding: `${width * 0.025}px ${width * 0.04}px`,
        borderRadius: width * 0.035,
        background: "rgba(10,14,22,0.82)",
        boxShadow: `0 20px 50px rgba(0,0,0,0.45), inset 0 0 0 2px ${accent}66`,
        textAlign: "right",
      }}
    >
      <div style={{ fontFamily: fontFamily("Unbounded"), fontWeight: 700, fontSize: width * 0.1, color: "#fff", lineHeight: 1 }}>
        {/* Отсчёт с плавным концом не доходит до ровного числа — «899+».
            После отсчёта стоит точное значение. */}
        {frame < 26 ? <CountUp from={0} to={value} durationInFrames={24} suffix={suffix} /> : `${value}${suffix}`}
      </div>
      <div style={{ fontFamily: fontFamily("Inter"), fontWeight: 600, fontSize: width * 0.034, color: "#9cc2ff", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
};

export const tickerTapeSchema = z.object({ items: z.array(z.string()), accent: z.string() });
export const TickerTape: React.FC<z.infer<typeof tickerTapeSchema>> = ({ items, accent }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const k = interpolate(frame, [0, 10, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], clamp);
  const text = [...items, ...items, ...items];
  // Скорость — полширины кадра в секунду: читается и не стоит на месте.
  const x = -frame * (width / 60);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: width * 0.1,
        overflow: "hidden",
        opacity: k,
        background: "rgba(10,14,22,0.85)",
        borderTop: `3px solid ${accent}`,
        borderBottom: `3px solid ${accent}`,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", whiteSpace: "nowrap", transform: `translateX(${x}px)` }}>
        {text.map((t, i) => (
          <span
            key={i}
            style={{ fontFamily: fontFamily("Inter"), fontWeight: 700, fontSize: width * 0.04, color: "#fff", padding: `0 ${width * 0.03}px` }}
          >
            <span style={{ color: accent, marginRight: width * 0.03 }}>●</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

export const routeChipsSchema = z.object({
  cities: z.array(z.string()),
  at: z.array(z.number().int().nullable()).describe("Кадр, когда город загорается"),
  accent: z.string(),
});
export const RouteChips: React.FC<z.infer<typeof routeChipsSchema>> = ({ cities, at, accent }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const k = interpolate(frame, [0, 10, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: width * 0.02, opacity: k }}>
      {cities.map((c, i) => {
        const on = interpolate(frame, [(at[i] ?? 9999) - 2, (at[i] ?? 9999) + 8], [0, 1], clamp);
        return (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: width * 0.02 }}>
            {i > 0 ? (
              <div style={{ width: width * 0.06, height: 4, borderRadius: 2, background: on > 0.5 ? accent : "rgba(255,255,255,0.25)" }} />
            ) : null}
            <div
              style={{
                fontFamily: fontFamily("Inter"),
                fontWeight: 700,
                fontSize: width * 0.042,
                color: "#fff",
                padding: `${width * 0.015}px ${width * 0.032}px`,
                borderRadius: 999,
                background: on > 0.5 ? accent : "rgba(10,14,22,0.8)",
                boxShadow: on > 0.5 ? `0 0 ${30 * on}px ${accent}` : "none",
                transform: `scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, on))})`,
              }}
            >
              {c}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ctaCardSchema = z.object({
  site: z.string(),
  days: z.number(),
  daysLabel: z.string(),
  daysAt: z.number().int().describe("Кадр, когда появляется цифра"),
  accent: z.string(),
});
export const CtaCard: React.FC<z.infer<typeof ctaCardSchema>> = ({ site, days, daysLabel, daysAt, accent }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const a = interpolate(frame, [6, 20], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(frame, [daysAt, daysAt + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: width * 0.03 }}>
      <div
        style={{
          opacity: a,
          transform: `translateY(${(1 - a) * 30}px)`,
          fontFamily: fontFamily("Inter"),
          fontWeight: 800,
          fontSize: width * 0.06,
          color: "#fff",
          background: accent,
          borderRadius: 999,
          padding: `${width * 0.02}px ${width * 0.06}px`,
          boxShadow: `0 16px 50px ${accent}88`,
        }}
      >
        {site}
      </div>
      <div
        style={{
          opacity: b,
          transform: `scale(${0.7 + 0.3 * b})`,
          display: "flex",
          alignItems: "baseline",
          gap: width * 0.025,
          background: "rgba(10,14,22,0.82)",
          borderRadius: width * 0.04,
          padding: `${width * 0.02}px ${width * 0.05}px`,
        }}
      >
        <span style={{ fontFamily: fontFamily("Unbounded"), fontWeight: 700, fontSize: width * 0.16, color: "#fff", lineHeight: 1 }}>{days}</span>
        <span style={{ fontFamily: fontFamily("Inter"), fontWeight: 700, fontSize: width * 0.038, color: "#9cc2ff", maxWidth: width * 0.4, lineHeight: 1.2 }}>
          {daysLabel}
        </span>
      </div>
    </div>
  );
};

export const blockFadeSchema = z.object({ frames: z.number().int().min(1) });
/** Наплыв блока на входе и выходе: смена сцен без склейки встык. */
export const BlockFade: React.FC<z.infer<typeof blockFadeSchema> & { readonly children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, frames, durationInFrames - frames, durationInFrames], [0, 1, 1, 0], clamp);
  const s = interpolate(frame, [0, frames], [1.04, 1], { ...clamp, easing: ease });
  return <div style={{ position: "absolute", inset: 0, opacity: o, transform: `scale(${s})` }}>{children}</div>;
};

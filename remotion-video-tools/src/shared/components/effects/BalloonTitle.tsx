import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { measureText } from "@remotion/layout-utils";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * BalloonTitle — объёмные буквы-шарики за спиной спикера.
 *
 * Надпись стоит на настоящем фоне съёмки, между кадром и вырезанным
 * спикером (`children`). Буквы «надуваются» по одной, как при печати:
 * каждая выскакивает с перелётом и щелчком; собранная надпись висит
 * заданное время и чуть покачивается, как от лёгкого ветра — у каждой
 * буквы свой фазовый сдвиг, поэтому они качаются не хором; потом буквы
 * сдуваются в обратном порядке. Объём — градиент по букве, блик сверху
 * и мягкая тень под ней.
 */
export const balloonTitleSchema = z.object({
  lines: z.array(z.string()).describe("Строки надписи; строка с * в начале — акцентным цветом"),
  delayInFrames: z.number().int().min(0).describe("Кадр начала набора"),
  charsPerSecond: z.number().min(1).describe("Скорость надувания букв"),
  holdFrames: z.number().int().min(0).describe("Сколько кадров надпись висит целиком"),
  deflate: z.boolean().describe("Сдувать буквы в конце в обратном порядке"),
  fontSize: z.number().min(0.03).max(0.3).describe("Кегль, доля ширины"),
  centerY: z.number().min(0).max(1).describe("Центр надписи по высоте"),
  color: z.string().describe("Основной цвет шариков"),
  accentColor: z.string().describe("Цвет акцентных строк"),
  swayDeg: z.number().min(0).max(15).describe("Амплитуда покачивания, градусы"),
  swayPx: z.number().min(0).max(60).describe("Амплитуда подъёма-опускания, пиксели"),
  sound: z.string().describe("Звук на букву внутри public; пусто — без звука"),
  font: z.string().describe("Гарнитура из public/fonts"),
});

export type BalloonTitleParams = z.infer<typeof balloonTitleSchema>;
export type BalloonTitleProps = Partial<BalloonTitleParams> & { readonly children?: React.ReactNode };

export const balloonTitleDefaults: BalloonTitleParams = {
  lines: ["БЫСТРОЕ", "*СОГЛАСОВАНИЕ"],
  delayInFrames: 0,
  charsPerSecond: 12,
  holdFrames: 60,
  deflate: true,
  fontSize: 0.16,
  centerY: 0.3,
  color: "#dfe6f2",
  accentColor: "#3b82f6",
  swayDeg: 4,
  swayPx: 14,
  sound: "audio/sfx/pop.wav",
  font: "Unbounded",
};

// Светлый и тёмный оттенки цвета для градиента шарика.
const mix = (hex: string, to: string, k: number): string => {
  const a = hex.replace("#", "");
  const b = to.replace("#", "");
  const c = [0, 2, 4].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16);
    const y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * k)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${c.join("")}`;
};

export const BalloonTitle: React.FC<BalloonTitleProps> = ({ children, ...params }) => {
  const p = withDefaults(balloonTitleDefaults, params);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const family = fontFamily(p.font);

  const clean = p.lines.map((l) => l.replace(/^\*/, ""));
  const total = clean.reduce((n, l) => n + l.replace(/\s/g, "").length, 0);
  const perChar = fps / p.charsPerSecond;
  const inflateEnd = p.delayInFrames + total * perChar + 12;
  const deflateStart = inflateEnd + p.holdFrames;

  // Кегль по самой длинной строке, с запасом: шарики шире обычных букв.
  const base = width * p.fontSize;
  const widest = Math.max(
    1,
    ...clean.map((t) => Math.max(measureText({ text: t, fontFamily: family, fontSize: base, fontWeight: 800 }).width, t.length * base * 0.78)),
  );
  const size = base * Math.min(1, (width * 0.9) / widest);

  let index = 0;
  const lineEls = p.lines.map((raw, li) => {
    const accent = raw.startsWith("*");
    const text = clean[li];
    const color = accent ? p.accentColor : p.color;
    const light = mix(color, "#ffffff", 0.35);
    const dark = mix(color, "#000000", 0.45);
    const chars = Array.from(text).map((ch, ci) => {
      if (/\s/.test(ch)) return <span key={`sp${li}-${ci}`} style={{ display: "inline-block", width: size * 0.35 }} />;
      const k = index++;
      const start = p.delayInFrames + k * perChar;
      const inflate = interpolate(frame - start, [0, 10], [0, 1], {
        easing: Easing.out(Easing.back(2.2)),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      // Сдуваются с конца: последняя буква первой.
      const dStart = deflateStart + (total - 1 - k) * (perChar * 0.6);
      const deflate = p.deflate
        ? interpolate(frame - dStart, [0, 8], [1, 0], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : 1;
      const sc = inflate * deflate;
      // Лёгкий ветер: у каждой буквы свой сдвиг фазы.
      const t = frame / fps;
      const sway = Math.sin(t * 1.6 + k * 0.9) * p.swayDeg;
      const lift = Math.sin(t * 1.1 + k * 0.7) * p.swayPx;
      return (
        <span
          key={`c${li}-${ci}`}
          style={{
            display: "inline-block",
            transform: `translateY(${lift}px) rotate(${sway}deg) scale(${sc})`,
            transformOrigin: "50% 60%",
            opacity: sc > 0.02 ? 1 : 0,
            backgroundImage: `radial-gradient(ellipse 70% 45% at 35% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%), linear-gradient(170deg, ${light} 0%, ${color} 40%, ${dark} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            // Объём: блик и тень через слои text-shadow у прозрачного текста
            // не работают, поэтому тень кладём фильтром на сам элемент.
            filter: `drop-shadow(0 ${size * 0.05}px ${size * 0.02}px rgba(0,0,0,0.35)) drop-shadow(0 ${size * 0.16}px ${size * 0.12}px rgba(0,0,0,0.35))`,
            padding: `0 ${size * 0.02}px`,
          }}
        >
          {ch}
        </span>
      );
    });
    return (
      <div key={`l${li}`} style={{ whiteSpace: "nowrap", lineHeight: 1.12 }}>
        {chars}
      </div>
    );
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          width,
          top: 0,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${(p.centerY - 0.5) * height}px)`,
          fontFamily: family,
          fontWeight: 800,
          fontSize: size,
          textTransform: "uppercase",
          letterSpacing: "0.01em",
        }}
      >
        {lineEls}
      </div>
      {/* Блик на шариках: мягкая светлая полоса сверху, маской по тексту не
          режем — блик читается и так за счёт градиента. */}
      <AbsoluteFill>{children}</AbsoluteFill>
      {p.sound
        ? Array.from({ length: total }, (_, k) => Math.round(p.delayInFrames + k * perChar)).map((f, k) => (
            <Sequence key={`s${k}`} from={f} durationInFrames={8} layout="none">
              <Audio src={staticFile(p.sound)} volume={0.3} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};

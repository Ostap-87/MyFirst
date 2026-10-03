import { Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * IconOrbit — иконки на орбите вокруг центрального слова.
 *
 * Идея из React Bits (Orbit Images): элементы стоят по кругу и медленно
 * вращаются. Здесь по кругу идут иконки (SVG из Phosphor Icons, MIT), в
 * центре — слово в кружке. Иконки появляются по одной с хлопком, затем
 * орбита крутится от номера кадра; каждая иконка при этом остаётся
 * вертикальной. Для перечислений вроде «кому подходит тур».
 */
export const iconOrbitSchema = z.object({
  center: z.string().describe("Слово в центре"),
  icons: z.array(z.string()).describe("SVG-иконки внутри public"),
  delayInFrames: z.number().int().min(0),
  stepFrames: z.number().int().min(1).describe("Интервал появления иконок"),
  spinSecondsPerTurn: z.number().min(2),
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  radiusFraction: z.number().min(0.1).max(0.5).describe("Радиус орбиты, доля ширины"),
  iconFraction: z.number().min(0.04).max(0.3).describe("Размер иконки, доля ширины"),
  accent: z.string().describe("Цвет кружков под иконками"),
  centerColor: z.string(),
  sound: z.string().describe("Звук на появление иконки; пусто — без звука"),
  font: z.string(),
});

export type IconOrbitParams = z.infer<typeof iconOrbitSchema>;
export type IconOrbitProps = Partial<IconOrbitParams>;

export const iconOrbitDefaults: IconOrbitParams = {
  center: "ТУР",
  icons: ["icons/phosphor/factory-bold.svg", "icons/phosphor/handshake-bold.svg", "icons/phosphor/airplane-tilt-bold.svg", "icons/phosphor/storefront-bold.svg", "icons/phosphor/robot-bold.svg", "icons/phosphor/chart-line-up-bold.svg"],
  delayInFrames: 0,
  stepFrames: 8,
  spinSecondsPerTurn: 16,
  cx: 0.5,
  cy: 0.4,
  radiusFraction: 0.32,
  iconFraction: 0.13,
  accent: "#2563eb",
  centerColor: "#ffffff",
  sound: "audio/sfx/pop.wav",
  font: "Unbounded",
};

export const IconOrbit: React.FC<IconOrbitProps> = (params) => {
  const p = withDefaults(iconOrbitDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cx = width * p.cx;
  const cy = height * p.cy;
  const r = width * p.radiusFraction;
  const size = width * p.iconFraction;
  const n = Math.max(1, p.icons.length);
  const allIn = p.delayInFrames + n * p.stepFrames + 12;
  const spin = frame > allIn ? ((frame - allIn) / (fps * p.spinSecondsPerTurn)) * 360 : 0;
  const centerR = size * 0.9;
  const centerIn = interpolate(frame - p.delayInFrames, [0, 14], [0, 1], { easing: Easing.out(Easing.back(1.6)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: fontFamily(p.font) }}>
      <div
        style={{
          position: "absolute",
          left: cx - centerR,
          top: cy - centerR,
          width: centerR * 2,
          height: centerR * 2,
          borderRadius: "50%",
          background: p.centerColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: centerR * 0.5,
          color: "#0b1220",
          transform: `scale(${centerIn})`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
        }}
      >
        {p.center}
      </div>
      {p.icons.map((src, i) => {
        const start = p.delayInFrames + 6 + i * p.stepFrames;
        const s = interpolate(frame - start, [0, 12], [0, 1], { easing: Easing.out(Easing.back(1.8)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const ang = ((i / n) * 360 + spin - 90) * (Math.PI / 180);
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang);
        return (
          <div key={`${i}-${src}`}>
            <div
              style={{
                position: "absolute",
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                borderRadius: "50%",
                background: p.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${s})`,
                opacity: s,
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              }}
            >
              <Img src={staticFile(src)} style={{ width: size * 0.58, height: size * 0.58, filter: "invert(1)" }} />
            </div>
            {p.sound ? (
              <Sequence from={start} durationInFrames={10} layout="none">
                <Audio src={staticFile(p.sound)} volume={0.35} />
              </Sequence>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { measureText } from "@remotion/layout-utils";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * BackTitle — крупная надпись за спикером.
 *
 * Два режима:
 * - `behind` — строки стоят за вырезанным человеком (между фоном и
 *   фигурой), как титры на телеэкране позади ведущего;
 * - `side` — фигура отъезжает влево и уменьшается, надпись встаёт
 *   столбиком справа, в свободной части кадра.
 *
 * В `children` кладётся слой с вырезанным спикером (прозрачный WebM),
 * фон рендерится снаружи, под эффектом. Строки входят по одной снизу
 * с задержкой `staggerFrames`, у каждой лёгкий перелёт за счёт
 * `Easing.out(back)`.
 */
export const backTitleSchema = z.object({
  lines: z.array(z.string()).describe("Строки надписи, каждая со своей задержкой"),
  mode: z.enum(["behind", "side"]).describe("За спикером или сбоку от сдвинутого спикера"),
  delayInFrames: z.number().int().min(0).describe("Кадр начала появления"),
  enterFrames: z.number().int().min(1).describe("Кадры на вход одной строки"),
  staggerFrames: z.number().int().min(0).describe("Задержка между строками"),
  fontSize: z.number().min(0.03).max(0.3).describe("Кегль, доля ширины кадра"),
  color: z.string().describe("Цвет текста"),
  accentColor: z.string().describe("Цвет выделенных строк (строка, начинающаяся с *)"),
  centerY: z.number().min(0).max(1).describe("Центр надписи по высоте в режиме behind"),
  speakerShift: z.number().min(0).max(0.5).describe("На сколько сдвинуть спикера влево в режиме side, доля ширины"),
  speakerScale: z.number().min(0.4).max(1).describe("Масштаб спикера в режиме side"),
  font: z.string().describe("Гарнитура из public/fonts"),
});

export type BackTitleParams = z.infer<typeof backTitleSchema>;
export type BackTitleProps = Partial<BackTitleParams> & { readonly children?: React.ReactNode };

export const backTitleDefaults: BackTitleParams = {
  lines: ["БОЛЕЕ", "*1000", "КОМПАНИЙ"],
  mode: "behind",
  delayInFrames: 0,
  enterFrames: 14,
  staggerFrames: 5,
  fontSize: 0.17,
  color: "#ffffff",
  accentColor: "#2563eb",
  centerY: 0.34,
  speakerShift: 0.24,
  speakerScale: 0.88,
  font: "Unbounded",
};

export const BackTitle: React.FC<BackTitleProps> = ({ children, ...params }) => {
  const p = withDefaults(backTitleDefaults, params);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const side = p.mode === "side";

  // Спикер уезжает тем же движением, что входит первая строка.
  const shift = interpolate(frame - p.delayInFrames, [0, p.enterFrames + 6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Кегль подгоняется под самую длинную строку: надпись не вылезает за
  // кадр ни в полном, ни в боковом столбике.
  const maxWidth = side ? width * 0.42 : width * 0.94;
  const base = width * p.fontSize * (side ? 0.62 : 1);
  const family = fontFamily(p.font);
  // Берём большее из измеренной и оценочной ширины: если шрифт ещё не
  // подгрузился в измеритель, оценка по числу знаков не даст вылезти за край.
  const widest = Math.max(
    1,
    ...p.lines.map((raw) => {
      const text = raw.replace(/^\*/, "");
      const measured = measureText({ text, fontFamily: family, fontSize: base, fontWeight: 800, letterSpacing: "-0.01em" }).width;
      return Math.max(measured, text.length * base * 0.74);
    }),
  );
  const size = base * Math.min(1, maxWidth / widest);

  const text = (
    <div
      style={{
        position: "absolute",
        left: side ? width * 0.53 : 0,
        width: side ? width * 0.46 : width,
        top: 0,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: side ? "flex-start" : "center",
        transform: side ? "none" : `translateY(${(p.centerY - 0.5) * height}px)`,
        fontFamily: fontFamily(p.font),
        fontWeight: 800,
        lineHeight: 1.02,
        letterSpacing: "-0.01em",
        textTransform: "uppercase",
      }}
    >
      {p.lines.map((raw, i) => {
        const accent = raw.startsWith("*");
        const line = accent ? raw.slice(1) : raw;
        const t = interpolate(
          frame - p.delayInFrames - i * p.staggerFrames,
          [0, p.enterFrames],
          [0, 1],
          { easing: Easing.out(Easing.back(1.4)), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const op = interpolate(frame - p.delayInFrames - i * p.staggerFrames, [0, p.enterFrames * 0.6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${i}-${line}`}
            style={{
              fontSize: size,
              color: accent ? p.accentColor : p.color,
              opacity: op,
              transform: `translateY(${(1 - t) * size * 0.6}px)`,
              textShadow: "0 12px 40px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill>
      {text}
      <AbsoluteFill
        style={{
          transform: side
            ? `translateX(${-p.speakerShift * width * shift}px) scale(${1 - (1 - p.speakerScale) * shift})`
            : "none",
          transformOrigin: "50% 100%",
          filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

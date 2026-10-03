import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { measureText } from "@remotion/layout-utils";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * TypingPush — титры печатаются сбоку, съёмка отъезжает.
 *
 * Фон не меняется и не дублируется: в `children` кладётся обычная
 * съёмка целиком, и по мере набора букв весь кадр сдвигается в сторону
 * (`side`), чуть увеличиваясь от дальнего края, чтобы не открывать
 * пустую полосу. В освободившейся части крупно печатается текст: буква
 * за буквой, с мигающим курсором и щелчком на символ, если задан
 * `sound`. Сдвиг идёт вслед за набором — спикера «отодвигают буквы».
 */
export const typingPushSchema = z.object({
  lines: z.array(z.string()).describe("Строки титров; строка с * в начале — акцентным цветом"),
  side: z.enum(["left", "right"]).describe("С какой стороны печатается текст; съёмка уезжает в другую"),
  delayInFrames: z.number().int().min(0).describe("Кадр начала набора"),
  charsPerSecond: z.number().min(1).describe("Скорость набора"),
  pushFraction: z.number().min(0).max(0.6).describe("На сколько сдвинуть съёмку, доля ширины"),
  columnFraction: z.number().min(0.2).max(0.8).describe("Ширина колонки текста, доля ширины"),
  fontSize: z.number().min(0.03).max(0.2).describe("Кегль, доля ширины"),
  centerY: z.number().min(0).max(1).describe("Центр блока текста по высоте"),
  color: z.string(),
  accentColor: z.string(),
  caret: z.boolean().describe("Показывать мигающий курсор"),
  sound: z.string().describe("Щелчок на символ внутри public; пусто — без звука"),
  font: z.string().describe("Гарнитура из public/fonts"),
});

export type TypingPushParams = z.infer<typeof typingPushSchema>;
export type TypingPushProps = Partial<TypingPushParams> & { readonly children?: React.ReactNode };

export const typingPushDefaults: TypingPushParams = {
  lines: ["Более", "*1000", "компаний", "в базе"],
  side: "right",
  delayInFrames: 0,
  charsPerSecond: 14,
  pushFraction: 0.26,
  columnFraction: 0.5,
  fontSize: 0.1,
  centerY: 0.42,
  color: "#ffffff",
  accentColor: "#2563eb",
  caret: true,
  sound: "audio/sfx/click.wav",
  font: "Unbounded",
};

export const TypingPush: React.FC<TypingPushProps> = ({ children, ...params }) => {
  const p = withDefaults(typingPushDefaults, params);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const family = fontFamily(p.font);

  const clean = p.lines.map((l) => l.replace(/^\*/, ""));
  const total = clean.reduce((n, l) => n + l.length, 0);
  const typed = Math.min(total, Math.max(0, Math.floor(((frame - p.delayInFrames) / fps) * p.charsPerSecond)));

  // Кегль — по самой длинной строке, чтобы колонка не вылезала за кадр.
  const base = width * p.fontSize;
  const colW = width * p.columnFraction - width * 0.04;
  const widest = Math.max(1, ...clean.map((t) => Math.max(measureText({ text: t, fontFamily: family, fontSize: base, fontWeight: 800 }).width, t.length * base * 0.74)));
  const size = base * Math.min(1, colW / widest);

  // Съёмка отъезжает вслед за набором: сдвиг растёт с долей набранного,
  // с мягким стартом — первая буква уже двигает кадр.
  const progress = total > 0 ? typed / total : 1;
  const push = interpolate(progress, [0, 0.35, 1], [0, 0.8, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dx = p.pushFraction * width * push * (p.side === "right" ? -1 : 1);
  // Увеличение от дальнего края: сдвинутый кадр не открывает пустую полосу.
  const scale = 1 + (Math.abs(dx) / width) * 1.05;
  const origin = p.side === "right" ? "0% 50%" : "100% 50%";

  // Распределяем набранные символы по строкам.
  let left = typed;
  const shown = clean.map((t) => {
    const n = Math.min(t.length, left);
    left -= n;
    return t.slice(0, n);
  });
  const activeLine = shown.findIndex((s, i) => s.length < clean[i].length);
  const caretOn = p.caret && typed < total && Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${dx}px) scale(${scale})`, transformOrigin: origin }}>{children}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 0,
          height,
          left: p.side === "right" ? width * (1 - p.columnFraction) : width * 0.02,
          width: width * p.columnFraction,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          transform: `translateY(${(p.centerY - 0.5) * height}px)`,
          fontFamily: family,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.08,
          textTransform: "uppercase",
          textShadow: "0 10px 34px rgba(0,0,0,0.55)",
          opacity: typed > 0 ? 1 : 0,
        }}
      >
        {shown.map((s, i) => {
          const accent = p.lines[i].startsWith("*");
          const isActive = i === activeLine || (activeLine === -1 && i === shown.length - 1);
          return (
            <div key={`${i}-${clean[i]}`} style={{ color: accent ? p.accentColor : p.color, whiteSpace: "nowrap", minHeight: size * 1.08 }}>
              {s}
              {isActive && caretOn ? <span style={{ color: p.color, opacity: 0.9 }}>|</span> : null}
            </div>
          );
        })}
      </div>
      {p.sound
        ? Array.from({ length: total }, (_, i) => Math.round(p.delayInFrames + (i / p.charsPerSecond) * fps)).map((f, i) => (
            <Sequence key={`k${i}`} from={f} durationInFrames={6} layout="none">
              <Audio src={staticFile(p.sound)} volume={0.25} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};

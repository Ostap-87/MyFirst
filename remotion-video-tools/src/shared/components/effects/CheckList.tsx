import { Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * CheckList — перечисление по пунктам с галочками.
 *
 * Пункты появляются по одному (выезд слева с пружиной), через
 * `tickDelayFrames` в окошке рисуется галочка — штрих проводится
 * линией, окошко заливается акцентом. Под каждый пункт — короткий
 * звук, если задан `sound`. Для перечисления преимуществ: один пункт
 * на одну фразу речи, `at` каждого пункта в кадрах сцены.
 */
export const checkItemSchema = z.object({
  text: z.string(),
  at: z.number().int().min(0).describe("Кадр сцены, когда пункт появляется"),
});

export const checkListSchema = z.object({
  items: z.array(checkItemSchema),
  title: z.string().describe("Заголовок над списком; пусто — без него"),
  x: z.number().min(0).max(1).describe("Левый край списка, доля ширины"),
  y: z.number().min(0).max(1).describe("Верх списка, доля высоты"),
  widthFraction: z.number().min(0.2).max(1).describe("Ширина списка, доля ширины"),
  fontSize: z.number().min(0.02).max(0.12).describe("Кегль пункта, доля ширины"),
  tickDelayFrames: z.number().int().min(0).describe("Через сколько кадров после появления ставится галочка"),
  accent: z.string().describe("Цвет галочки и заливки окошка"),
  color: z.string().describe("Цвет текста"),
  sound: z.string().describe("Звук на галочку внутри public; пусто — без звука"),
  font: z.string().describe("Гарнитура из public/fonts"),
});

export type CheckListParams = z.infer<typeof checkListSchema>;
export type CheckListProps = Partial<CheckListParams>;

export const checkListDefaults: CheckListParams = {
  items: [
    { text: "Более 1000 компаний в базе", at: 0 },
    { text: "Быстрое согласование", at: 30 },
    { text: "Переговоры с руководством", at: 60 },
    { text: "Поддержка после тура", at: 90 },
  ],
  title: "",
  x: 0.5,
  y: 0.3,
  widthFraction: 0.46,
  fontSize: 0.042,
  tickDelayFrames: 10,
  accent: "#2563eb",
  color: "#ffffff",
  sound: "audio/sfx/pop.wav",
  font: "Inter",
};

export const CheckList: React.FC<CheckListProps> = (params) => {
  const p = withDefaults(checkListDefaults, params);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = width * p.fontSize;
  const box = fs * 1.35;

  return (
    <div
      style={{
        position: "absolute",
        left: width * p.x,
        top: height * p.y,
        width: width * p.widthFraction,
        fontFamily: fontFamily(p.font),
        color: p.color,
      }}
    >
      {p.title ? (
        <div style={{ fontSize: fs * 0.8, fontWeight: 600, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: fs * 0.8 }}>
          {p.title}
        </div>
      ) : null}
      {p.items.map((it, i) => {
        const local = frame - it.at;
        const enter = interpolate(local, [0, 14], [0, 1], {
          easing: Easing.out(Easing.back(1.6)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const op = interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const tick = interpolate(local - p.tickDelayFrames, [0, 9], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const pop = interpolate(local - p.tickDelayFrames, [0, 5, 10], [1, 1.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        // Галочка: две линии, длина штриха растёт от 0 до полной.
        const len = 60;
        return (
          <div
            key={`${i}-${it.text}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: fs * 0.6,
              marginBottom: fs * 0.75,
              opacity: op,
              transform: `translateX(${(1 - enter) * -width * 0.12}px)`,
            }}
          >
            <div
              style={{
                width: box,
                height: box,
                flex: "none",
                borderRadius: box * 0.24,
                border: `${Math.max(3, box * 0.08)}px solid ${tick > 0 ? p.accent : "rgba(255,255,255,0.75)"}`,
                background: tick > 0 ? p.accent : "rgba(255,255,255,0.08)",
                transform: `scale(${pop})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: tick > 0 ? `0 8px 24px ${p.accent}66` : "none",
              }}
            >
              <svg viewBox="0 0 40 40" width={box * 0.7} height={box * 0.7}>
                <polyline
                  points="8,21 17,30 33,11"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - tick)}
                />
              </svg>
            </div>
            <div style={{ fontSize: fs, fontWeight: 700, lineHeight: 1.15, textShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>{it.text}</div>
            {p.sound && local === 0 ? null : null}
            {p.sound ? (
              <Sequence from={it.at + p.tickDelayFrames} durationInFrames={20} layout="none">
                <Audio src={staticFile(p.sound)} volume={0.45} />
              </Sequence>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

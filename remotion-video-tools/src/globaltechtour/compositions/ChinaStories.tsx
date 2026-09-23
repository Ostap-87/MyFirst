import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import { SpinningTetra } from "../../shared/components/effects";
import { useCaptions } from "../../shared/useCaptions";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * ChinaStories — шаблон формата Head под сторис.
 *
 * Композиция одна на все выпуски: съёмка, субтитры и плашки приходят
 * пропами, поэтому новый ролик — это запись в Root.tsx, а не новый файл.
 *
 * Чем сторис отличаются от Reels и почему это отдельный шаблон:
 *
 * 1. Другие безопасные зоны. Снизу строка ответа — она выше, чем подпись
 *    в Reels, поэтому субтитры поднимаются. Справа кнопок нет.
 * 2. Сторис пролистывают быстрее ленты, поэтому крючок формулируется
 *    утверждением, а не вопросом: на раздумье времени нет.
 *
 * ——— Плашки ———
 *
 * Три вида, и выбор между ними — смысловой, а не декоративный:
 *
 *   term   — термин или факт. Копится: следующая встаёт под предыдущей,
 *            и к концу перечисления список виден целиком.
 *   struck — то, что отрицается. Приглушённая, перечёркивание
 *            прочерчивается на глазах — видно, что это действие.
 *   accent — то, что утверждается взамен. Белая, с фирменной чертой.
 *
 * Секунды берутся из расшифровки, никогда на глаз: сдвиг на полсекунды
 * читается как брак.
 */

const plateSchema = z.object({
  text: z.string().describe("Текст плашки"),
  at: z.number().describe("Секунда появления — из расшифровки"),
  until: z
    .number()
    .optional()
    .describe("Секунда исчезновения; без неё держится до конца"),
  kind: z
    .enum(["term", "struck", "accent"])
    .describe("term — копится, struck — зачёркнутая, accent — утверждение"),
});

export const chinaStoriesSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  captionsSrc: z.string().describe("Путь к расшифровке внутри public"),
  durationSeconds: z.number().describe("Длительность съёмки в секундах"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  brandMark: z.string().describe("Подпись рядом с логотипом сверху"),
  logoScale: z.number().min(0.5).max(3).describe("Размер логотипа сверху"),
  logoSpin: z
    .number()
    .min(0)
    .max(360)
    .describe("Скорость вращения тетраэдра, градусов в секунду"),
  plates: z.array(plateSchema).describe("Плашки по ходу речи"),
});

export type ChinaStoriesProps = z.infer<typeof chinaStoriesSchema>;
type Plate = z.infer<typeof plateSchema>;

const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

const PlateView: React.FC<{
  readonly plate: Plate;
  readonly appearAt: number;
  readonly fs: (fraction: number) => number;
}> = ({ plate, appearAt, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const since = frame - appearAt;
  const struck = plate.kind === "struck";

  const enter = spring({
    frame: since,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 18,
  });
  const opacity = interpolate(since, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strikeWidth = interpolate(since, [14, 32], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * fs(0.028)}px)`,
        alignSelf: "flex-start",
        position: "relative",
        backgroundColor: struck
          ? "rgba(12,16,24,0.62)"
          : "rgba(255,255,255,0.96)",
        borderLeft:
          plate.kind === "accent"
            ? `${fs(0.008)}px solid ${theme.colors.accent}`
            : "none",
        borderRadius: fs(0.014),
        padding: `${fs(0.016)}px ${fs(0.028)}px`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.38)",
        backdropFilter: struck ? "blur(10px)" : "none",
        WebkitBackdropFilter: struck ? "blur(10px)" : "none",
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: 700,
        fontSize: fs(0.044),
        letterSpacing: fs(-0.0008),
        color: struck ? "rgba(255,255,255,0.74)" : theme.colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {plate.text}
      {struck ? (
        <span
          style={{
            position: "absolute",
            left: fs(0.028),
            right: `${100 - strikeWidth}%`,
            top: "52%",
            height: fs(0.005),
            backgroundColor: "#FF6B6B",
            borderRadius: fs(0.003),
          }}
        />
      ) : null}
    </div>
  );
};

export const ChinaStories: React.FC<ChinaStoriesProps> = ({
  footage,
  captionsSrc,
  durationSeconds,
  hookTop,
  hookBottom,
  brandMark,
  logoScale,
  logoSpin,
  plates,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { fs } = useFormat();
  const captions = useCaptions(captionsSrc || null);

  const footageFrames = Math.round(durationSeconds * fps);
  const second = frame / fps;

  const hookIn = interpolate(frame, [0, AT(0.4, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [AT(2.2, fps), AT(2.7, fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const visible = plates.filter(
    (p) => second >= p.at && (p.until === undefined || second < p.until),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {/* Позиционируем обёртку: свои стили position OffthreadVideo
              до элемента не доносит. */}
          <div style={{ position: "absolute", inset: 0 }}>
            <OffthreadVideo
              src={staticFile(footage)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.22) 16%, rgba(0,0,0,0) 32%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.28) 12%, rgba(0,0,0,0) 26%)",
        }}
      />

      {/* ——— Шапка ——— */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          paddingTop: Math.round(height * 0.06),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: fs(0.02 * logoScale),
            justifyContent: "center",
          }}
        >
          <SpinningTetra
            size={fs(0.105 * logoScale)}
            degreesPerSecond={logoSpin}
          />
          <span
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.036 * logoScale),
              letterSpacing: fs(0.004),
              color: "#fff",
              textShadow: "0 2px 14px rgba(0,0,0,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            {brandMark}
          </span>
        </div>
      </AbsoluteFill>

      {/* ——— Крючок ——— */}
      <Sequence durationInFrames={AT(2.8, fps)}>
        <AbsoluteFill
          style={{
            opacity: hookIn * hookOut,
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.155),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(7,10,17,0.74)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderRadius: fs(0.022),
              padding: `${fs(0.034)}px ${fs(0.038)}px`,
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.062),
              lineHeight: 1.16,
              letterSpacing: fs(-0.0016),
              color: "#fff",
            }}
          >
            {hookTop}
            <span style={{ display: "block", color: "#8FD4FF" }}>
              {hookBottom}
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ——— Плашки: term копятся, struck и accent сменяют ——— */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          paddingTop: Math.round(height * 0.155),
          paddingLeft: fs(0.08),
          paddingRight: fs(0.08),
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: fs(0.016),
        }}
      >
        {visible.map((plate) => (
          <PlateView
            key={`${plate.text}-${plate.at}`}
            plate={plate}
            appearAt={AT(plate.at, fps)}
            fs={fs}
          />
        ))}
      </AbsoluteFill>

      {/* ——— Субтитры: выше, чем в Reels — снизу строка ответа ——— */}
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            paddingBottom: Math.round(height * 0.16),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
          }}
        >
          <KaraokeCaptions
            theme={theme}
            captions={captions}
            mode="page"
            highlight="color"
            captionStyle="shadow"
            font="Onest"
            fontSizeFraction={0.05}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export default ChinaStories;

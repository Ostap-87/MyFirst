import type { Caption } from "@remotion/captions";
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
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";
import captionsData from "../../../data/captions-stories.json";

/**
 * ChinaStories — формат Head под сторис.
 *
 * Отличия от Reels, из-за которых это отдельная композиция:
 *
 * 1. Другие безопасные зоны. У сторис снизу строка ответа — она выше, чем
 *    подпись в Reels, поэтому субтитры поднимаются. Справа кнопок нет.
 * 2. Сторис смотрят залпом и пролистывают быстрее ленты, поэтому крючок
 *    должен быть утверждением, а не вопросом: на раздумье времени нет.
 *
 * ——— Содержание ———
 *
 * Речь построена на противопоставлении: «бизнес-туры на рынок в Гуанчжоу —
 * не ко мне, у меня встречи с крупными корпорациями». Поэтому плашка здесь
 * не перечисляет, а спорит: первая (зачёркнутая) — то, чем он НЕ занимается,
 * вторая — то, чем занимается. Перечисление, как в ChinaReel, тут дало бы
 * ровно противоположный смысл.
 *
 * Секунды из data/captions-stories.json:
 *   «Гуанчжоу» 6.45, «крупными корпорациями» 15.66.
 */

export const chinaStoriesSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  brandMark: z.string().describe("Подпись рядом с логотипом сверху"),
  logoScale: z.number().min(0.5).max(3).describe("Размер логотипа сверху"),
  logoSpin: z
    .number()
    .min(0)
    .max(360)
    .describe("Скорость вращения тетраэдра, градусов в секунду"),
  notThis: z.string().describe("Плашка «чем НЕ занимаемся», зачёркнутая"),
  butThis: z.string().describe("Плашка «чем занимаемся», акцентом"),
});

export type ChinaStoriesProps = z.infer<typeof chinaStoriesSchema>;

const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

const FOOTAGE_SECONDS = 19.2;
/** Секунды произнесения — из расшифровки, не на глаз. */
const NOT_THIS_AT = 6.45;
const BUT_THIS_AT = 15.66;

/**
 * Плашка противопоставления.
 *
 * `struck` — то, что отрицается: приглушённая, с перечёркиванием.
 * Обычная — то, что утверждается: белая, с фирменной чертой слева.
 */
const ContrastPlate: React.FC<{
  readonly text: string;
  readonly struck: boolean;
  readonly fs: (fraction: number) => number;
}> = ({ text, struck, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 18,
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Перечёркивание прочерчивается само — так видно, что это действие,
  // а не просто стиль текста.
  const strikeWidth = interpolate(frame, [14, 30], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * fs(0.03)}px)`,
        alignSelf: "flex-start",
        position: "relative",
        backgroundColor: struck
          ? "rgba(12,16,24,0.62)"
          : "rgba(255,255,255,0.96)",
        borderLeft: struck
          ? "none"
          : `${fs(0.008)}px solid ${theme.colors.accent}`,
        borderRadius: fs(0.014),
        padding: `${fs(0.018)}px ${fs(0.03)}px`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.38)",
        backdropFilter: struck ? "blur(10px)" : "none",
        WebkitBackdropFilter: struck ? "blur(10px)" : "none",
      }}
    >
      <span
        style={{
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: 700,
          fontSize: fs(0.046),
          letterSpacing: fs(-0.0008),
          color: struck ? "rgba(255,255,255,0.72)" : theme.colors.text,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
      {struck ? (
        <span
          style={{
            position: "absolute",
            left: fs(0.03),
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
  hookTop,
  hookBottom,
  brandMark,
  logoScale,
  logoSpin,
  notThis,
  butThis,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { fs } = useFormat();

  const footageFrames = Math.round(FOOTAGE_SECONDS * fps);

  const hookIn = interpolate(frame, [0, AT(0.4, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [AT(2.0, fps), AT(2.5, fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {/* Позиционируем обёртку, а не сам OffthreadVideo: свои стили
              position он до элемента не доносит. */}
          <div
            style={{ position: "absolute", inset: 0 }}
          >
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

      {/* Затемнения: сверху под логотип и плашки, снизу под субтитры. */}
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

      {/* ——— Крючок: утверждение, а не вопрос ——— */}
      <Sequence durationInFrames={AT(2.6, fps)}>
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
              fontSize: fs(0.064),
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

      {/* ——— Плашки противопоставления ——— */}
      <Sequence
        from={AT(NOT_THIS_AT, fps)}
        durationInFrames={AT(BUT_THIS_AT - NOT_THIS_AT, fps)}
      >
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.155),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
          }}
        >
          <ContrastPlate text={notThis} struck fs={fs} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={AT(BUT_THIS_AT, fps)}>
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.155),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
          }}
        >
          <ContrastPlate text={butThis} struck={false} fs={fs} />
        </AbsoluteFill>
      </Sequence>

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
            captions={captionsData as Caption[]}
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

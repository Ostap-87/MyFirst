import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";
import { TypingLine } from "./TypingLine";

/**
 * StickyCTA — нижняя плашка с призывом, которая висит до конца ролика.
 *
 * В разговорных Reels призыв не показывают один раз в финале: он появляется
 * в середине и остаётся в кадре, потому что досматривают не все. Ключевое
 * слово подсвечено плашкой акцента — это то, что зритель должен запомнить
 * и отправить в ответ.
 *
 * Тема приходит пропом (CLAUDE.md, правило 1).
 */
export type StickyCTAProps = {
  readonly theme: BrandTheme;
  /** Первое слово, на плашке акцента: «ЕСЛИ», «ХОЧЕШЬ». */
  readonly highlight: string;
  /** Продолжение фразы в две строки. */
  readonly headline: string;
  /** Мелкая строка-пояснение под заголовком. */
  readonly note?: string;
  /** Кодовое слово, которое «набирается» в поле ниже; без него поля нет. */
  readonly keyword?: string;
  readonly delayInFrames?: number;
};

export const StickyCTA: React.FC<StickyCTAProps> = ({
  theme,
  highlight,
  headline,
  note,
  keyword,
  delayInFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fs, sp } = useFormat();

  const progress = spring({
    frame: frame - delayInFrames,
    fps,
    config: { damping: 16, stiffness: 140 },
  });

  if (frame < delayInFrames) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(0.018),
        opacity: progress,
        transform: `translateY(${(1 - progress) * 40}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: sp(0.018) }}>
        <span
          style={{
            backgroundColor: theme.colors.accent,
            color: theme.colors.primary,
            padding: `${sp(0.004)}px ${sp(0.016)}px`,
            borderRadius: sp(0.012),
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: fs(0.072),
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        >
          {highlight}
        </span>

        <span
          style={{
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: fs(0.058),
            lineHeight: 1.05,
            color: "#ffffff",
            textShadow: "0 3px 16px rgba(0,0,0,0.6)",
          }}
        >
          {headline}
        </span>
      </div>

      {note ? (
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.body),
            fontSize: fs(0.03),
            color: "rgba(255,255,255,0.78)",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {note}
        </div>
      ) : null}

      {keyword ? (
        <TypingLine
          theme={theme}
          text={keyword}
          startFrame={delayInFrames + 14}
          framesPerChar={4}
        />
      ) : null}
    </div>
  );
};

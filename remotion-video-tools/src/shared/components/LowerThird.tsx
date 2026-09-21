import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * LowerThird — подпись спикера в нижней трети кадра.
 *
 * Появляется один раз в начале и уходит: держать имя весь ролик незачем,
 * а первые секунды зритель как раз решает, слушать ли этого человека.
 * Уезжает тем же движением, каким пришёл, — так подпись не «моргает».
 */
export type LowerThirdProps = {
  readonly theme: BrandTheme;
  readonly name: string;
  readonly role: string;
  readonly delayInFrames?: number;
  /** Сколько кадров держать подпись в кадре до ухода. */
  readonly holdInFrames?: number;
};

export const LowerThird: React.FC<LowerThirdProps> = ({
  theme,
  name,
  role,
  delayInFrames = 20,
  holdInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fs, sp } = useFormat();

  const enter = spring({
    frame: frame - delayInFrames,
    fps,
    config: { damping: 17, stiffness: 130 },
  });

  const exit = spring({
    frame: frame - delayInFrames - holdInFrames,
    fps,
    config: { damping: 20, stiffness: 130 },
  });

  const progress = enter - exit;
  if (progress <= 0.001) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: sp(0.02),
        opacity: interpolate(progress, [0, 0.5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        transform: `translateX(${(1 - progress) * -80}px)`,
      }}
    >
      <div style={{ width: sp(0.012), backgroundColor: theme.colors.accent }} />

      <div style={{ display: "flex", flexDirection: "column", gap: sp(0.006) }}>
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: fs(0.05),
            lineHeight: 1.1,
            color: "#ffffff",
            textShadow: "0 3px 14px rgba(0,0,0,0.6)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.024),
            letterSpacing: fs(0.002),
            color: theme.colors.accent,
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          {role}
        </div>
      </div>
    </div>
  );
};

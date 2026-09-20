import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * EndCard — финальная карточка: кадр затемняется, остаются ник и призыв.
 *
 * В референсе финал сделан так же: картинка уходит в темноту, логотип
 * проявляется белым и перекрашивается в фирменный цвет. Перекраска —
 * последнее движение в ролике, на нём глаз и останавливается.
 */
export type EndCardProps = {
  readonly theme: BrandTheme;
  readonly handle: string;
  readonly caption?: string;
  /** Кадр, на котором начинается затемнение. */
  readonly startFrame: number;
  /** За сколько кадров кадр уходит в темноту. */
  readonly fadeInFrames?: number;
};

export const EndCard: React.FC<EndCardProps> = ({
  theme,
  handle,
  caption,
  startFrame,
  fadeInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fs, sp } = useFormat();

  if (frame < startFrame) return null;

  const local = frame - startFrame;

  // 0.94, а не 0.88: под более светлой заливкой сквозь финал просвечивают
  // заголовки предыдущей сцены и спорят с ником.
  const dim = interpolate(local, [0, fadeInFrames], [0, 0.94], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logo = spring({
    frame: local - 6,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  // Перекраска из белого в акцент — с задержкой, уже после появления.
  const tint = interpolate(
    local,
    [fadeInFrames + 8, fadeInFrames + 22],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const size = fs(0.16);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(8, 8, 12, ${dim})`,
        justifyContent: "center",
        alignItems: "center",
        gap: sp(0.03),
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          border: `${Math.max(4, size * 0.07)}px solid ${theme.colors.accent}`,
          opacity: logo,
          transform: `scale(${interpolate(logo, [0, 1], [0.8, 1])})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Заливка догоняет обводку: сначала контур, потом фирменный цвет.
          backgroundColor: `rgba(${parseInt(theme.colors.accent.slice(1, 3), 16)}, ${parseInt(theme.colors.accent.slice(3, 5), 16)}, ${parseInt(theme.colors.accent.slice(5, 7), 16)}, ${tint * 0.18})`,
        }}
      >
        <div
          style={{
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: "50%",
            border: `${Math.max(3, size * 0.05)}px solid ${theme.colors.accent}`,
          }}
        />
      </div>

      <div
        style={{
          opacity: interpolate(
            local,
            [fadeInFrames, fadeInFrames + 10],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          ),
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: sp(0.014),
        }}
      >
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.04),
            letterSpacing: fs(0.004),
            color: "#ffffff",
          }}
        >
          {handle}
        </div>

        {caption ? (
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.body),
              fontSize: fs(0.03),
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

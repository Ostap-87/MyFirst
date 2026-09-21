import { interpolate, useCurrentFrame } from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * Watermark — ник в углу кадра на весь ролик.
 *
 * Ролики репостят и пересобирают, поэтому подпись должна быть вшита в кадр,
 * а не только в описание. Держится приглушённой: задача — быть читаемой на
 * стоп-кадре, а не соревноваться с субтитрами.
 */
export type WatermarkProps = {
  readonly theme: BrandTheme;
  readonly handle: string;
  readonly corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  readonly opacity?: number;
};

export const Watermark: React.FC<WatermarkProps> = ({
  theme,
  handle,
  corner = "top-right",
  opacity = 0.75,
}) => {
  const frame = useCurrentFrame();
  const { fs, sp } = useFormat();

  const [vertical, horizontal] = corner.split("-");

  return (
    <div
      style={{
        position: "absolute",
        [vertical === "top" ? "top" : "bottom"]: sp(0.06),
        [horizontal === "left" ? "left" : "right"]: sp(0.05),
        display: "flex",
        alignItems: "center",
        gap: sp(0.012),
        // Появляется не сразу: первые кадры отдаём лицу и заголовку.
        opacity: interpolate(frame, [8, 20], [0, opacity], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          width: fs(0.032),
          height: fs(0.032),
          borderRadius: fs(0.009),
          border: `2px solid ${theme.colors.accent}`,
        }}
      />
      <span
        style={{
          fontFamily: fontFamily(theme.fonts.mono),
          fontSize: fs(0.022),
          letterSpacing: fs(0.002),
          color: "#ffffff",
          textShadow: "0 2px 10px rgba(0,0,0,0.65)",
        }}
      >
        {handle}
      </span>
    </div>
  );
};

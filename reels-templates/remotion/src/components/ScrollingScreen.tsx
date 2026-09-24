import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Highlight } from "../lib/types";
import { THEME } from "../styles";
import { msToFrame, res } from "../lib/utils";

// Скрин приложения (Taobao, Douyin, WB…) как «доказательство»: плавный скролл + рамки на цены.
export const ScrollingScreen: React.FC<{
  src: string;
  durationInFrames: number;
  scrollToPx?: number;
  highlights?: Highlight[];
}> = ({ src, durationInFrames, scrollToPx = 0, highlights = [] }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pad = Math.round(fps * 0.3);
  const y = interpolate(frame, [pad, Math.max(pad + 1, durationInFrames - pad)], [0, scrollToPx], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, transform: `translateY(${-y}px)` }}>
        <Img src={res(src)} style={{ width: "100%", display: "block" }} />
        {highlights.map((h, i) => {
          const f = frame - msToFrame(h.atMs, fps);
          if (f < 0) return null;
          const p = spring({ frame: f, fps, config: { damping: 12, stiffness: 180 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: h.x,
                top: h.y,
                width: h.w,
                height: h.h,
                border: `8px solid ${THEME.accent}`,
                borderRadius: 20,
                transform: `scale(${1.3 - 0.3 * p})`,
                opacity: Math.min(1, p * 1.5),
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

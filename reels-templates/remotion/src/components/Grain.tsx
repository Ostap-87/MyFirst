import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Плёночное зерно поверх всего кадра: «склеивает» фон и спикера в одну картинку.
// seed меняется каждый кадр — зерно живое, но детерминированное (рендер повторяем).
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const id = "grain-filter";
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

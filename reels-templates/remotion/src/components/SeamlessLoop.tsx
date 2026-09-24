import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { res } from "../lib/utils";

// Бесшовный луп: каждый следующий повтор начинается чуть раньше конца предыдущего
// и плавно проявляется поверх него (кроссфейд). Стык зацикливания не виден.
const FadeIn: React.FC<{ src: string; fadeFrames: number; first: boolean }> = ({ src, fadeFrames, first }) => {
  const frame = useCurrentFrame();
  const opacity = first ? 1 : interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo src={res(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

export const SeamlessLoop: React.FC<{ src: string; clipSec: number; fadeSec?: number }> = ({
  src,
  clipSec,
  fadeSec = 0.6,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const clip = Math.round(clipSec * fps);
  const fade = Math.round(fadeSec * fps);
  const period = Math.max(1, clip - fade);
  const count = Math.ceil(durationInFrames / period) + 1;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Sequence key={i} from={i * period} durationInFrames={clip} layout="none">
          <FadeIn src={src} fadeFrames={fade} first={i === 0} />
        </Sequence>
      ))}
    </>
  );
};

import React from "react";
import { Img, OffthreadVideo, interpolate, useCurrentFrame } from "remotion";
import { isVideo, res } from "../lib/utils";

// Картинка или видео на весь контейнер + медленный «наезд» (Ken Burns), чтобы статика жила.
export const Media: React.FC<{
  src: string;
  durationInFrames: number;
  kenBurns?: boolean;
  objectPosition?: string;
}> = ({ src, durationInFrames, kenBurns = true, objectPosition = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const scale = kenBurns
    ? interpolate(frame, [0, durationInFrames], [1.0, 1.08], { extrapolateRight: "clamp" })
    : 1;
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition,
    transform: `scale(${scale})`,
  };
  return isVideo(src) ? (
    <OffthreadVideo src={res(src)} muted style={style} />
  ) : (
    <Img src={res(src)} style={style} />
  );
};

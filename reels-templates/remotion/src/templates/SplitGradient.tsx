import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../components/Captions";
import { FeatheredBottom } from "../components/FeatheredBottom";
import { Media } from "../components/Media";
import { ScrollingScreen } from "../components/ScrollingScreen";
import { useCaptionsFile } from "../lib/useCaptionsFile";
import type { Broll } from "../lib/types";
import { msToFrame, res } from "../lib/utils";
import { THEME } from "../styles";

// T1 (фото 1) и T4 (фото 4): спикер сверху, B-roll / скрин снизу, склейка градиентом,
// субтитры ровно на шве. Когда B-roll нет — спикер на весь экран (жёсткий переход).
export type SplitGradientProps = {
  speakerSrc: string;
  brolls: Broll[];
  captionsFile?: string;
  captions?: Caption[];
  splitRatio?: number;
  featherPx?: number;
  speakerFocusY?: number; // 0..1 — где лицо по вертикали в исходнике
};

export const SplitGradient: React.FC<SplitGradientProps> = ({
  speakerSrc,
  brolls,
  captionsFile,
  captions,
  splitRatio = THEME.splitRatio,
  featherPx = THEME.featherPx,
  speakerFocusY = 0.3,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const caps = useCaptionsFile(captionsFile, captions);
  const ms = (frame / fps) * 1000;
  const split = brolls.some((b) => ms >= b.fromMs && ms < b.toMs);
  const seam = height * splitRatio;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Спикер: один и тот же видеоэлемент, меняется только высота контейнера */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: split ? seam + featherPx / 2 : height,
          overflow: "hidden",
        }}
      >
        <OffthreadVideo
          src={res(speakerSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `50% ${speakerFocusY * 100}%`,
            transform: `scale(${split ? THEME.splitZoom : 1})`,
            transformOrigin: `50% ${speakerFocusY * 100}%`,
            filter: THEME.grade,
          }}
        />
      </div>

      {brolls.map((b, i) => {
        const dur = Math.max(1, msToFrame(b.toMs - b.fromMs, fps));
        return (
          <Sequence key={i} from={msToFrame(b.fromMs, fps)} durationInFrames={dur} layout="none">
            <FeatheredBottom seam={seam} featherPx={featherPx}>
              {b.type === "screen" ? (
                <ScrollingScreen
                  src={b.src}
                  durationInFrames={dur}
                  scrollToPx={b.scrollToPx}
                  highlights={b.highlights}
                />
              ) : (
                <Media src={b.src} durationInFrames={dur} kenBurns={b.kenBurns ?? true} />
              )}
            </FeatheredBottom>
          </Sequence>
        );
      })}

      <Captions captions={caps} />
    </AbsoluteFill>
  );
};

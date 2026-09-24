import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../components/Captions";
import { Media } from "../components/Media";
import { useCaptionsFile } from "../lib/useCaptionsFile";
import type { MediaBroll } from "../lib/types";
import { msToFrame, res } from "../lib/utils";
import { THEME } from "../styles";

// T3 (фото 3): говорящая голова за столом с реквизитом.
// Медленный дрейф-наезд + резкие «панч-ины» на ключевых фразах + врезки крупняка реквизита.
export type PunchIn = { fromMs: number; toMs: number; scale?: number; originY?: number };

export type TalkingHeadProps = {
  speakerSrc: string;
  captionsFile?: string;
  captions?: Caption[];
  punchIns?: PunchIn[];
  inserts?: MediaBroll[]; // крупные планы листа/экрана на весь кадр
  drift?: number; // 0.05 = +5% за весь ролик
  vignette?: boolean;
  speakerFocusY?: number;
};

export const TalkingHeadPunchIn: React.FC<TalkingHeadProps> = ({
  speakerSrc,
  captionsFile,
  captions,
  punchIns = [],
  inserts = [],
  drift = 0.05,
  vignette = true,
  speakerFocusY = 0.35,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const caps = useCaptionsFile(captionsFile, captions);
  const ms = (frame / fps) * 1000;
  const punch = punchIns.find((p) => ms >= p.fromMs && ms < p.toMs);
  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + drift]) * (punch?.scale ?? 1);
  const originY = (punch?.originY ?? speakerFocusY) * 100;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `50% ${originY}%` }}>
        <OffthreadVideo
          src={res(speakerSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: THEME.grade }}
        />
      </AbsoluteFill>

      {vignette && (
        <AbsoluteFill
          style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }}
        />
      )}

      {inserts.map((b, i) => {
        const dur = Math.max(1, msToFrame(b.toMs - b.fromMs, fps));
        return (
          <Sequence key={i} from={msToFrame(b.fromMs, fps)} durationInFrames={dur} layout="none">
            <AbsoluteFill>
              <Media src={b.src} durationInFrames={dur} kenBurns={b.kenBurns ?? true} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <Captions captions={caps} />
    </AbsoluteFill>
  );
};

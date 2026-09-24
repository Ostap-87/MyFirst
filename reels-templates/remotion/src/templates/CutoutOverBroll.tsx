import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../components/Captions";
import { Media } from "../components/Media";
import { StickerFilter } from "../components/StickerFilter";
import { useCaptionsFile } from "../lib/useCaptionsFile";
import type { MediaBroll } from "../lib/types";
import { msToFrame, res } from "../lib/utils";
import { THEME } from "../styles";

// T2 (фото 2): B-roll на весь экран, поверх — вырезанный спикер с белой «стикерной» обводкой,
// прижат к правому нижнему углу и обрезан краем кадра.
export type CutoutOverBrollProps = {
  backgrounds: MediaBroll[];
  cutoutSrc: string; // webm с альфа-каналом (scripts/cutout.sh)
  audioSrc: string; // звук спикера отдельно
  captionsFile?: string;
  captions?: Caption[];
  cutoutWidthPct?: number;
  cutoutRightPct?: number; // отрицательное = уходит за правый край
  cutoutBleedPct?: number; // насколько уходит за нижний край
  outlinePx?: number;
};

export const CutoutOverBroll: React.FC<CutoutOverBrollProps> = ({
  backgrounds,
  cutoutSrc,
  audioSrc,
  captionsFile,
  captions,
  cutoutWidthPct = 0.9,
  cutoutRightPct = -0.17,
  cutoutBleedPct = 0.29,
  outlinePx = THEME.stickerOutlinePx,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const caps = useCaptionsFile(captionsFile, captions);
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {backgrounds.map((b, i) => {
        const dur = Math.max(1, msToFrame(b.toMs - b.fromMs, fps));
        return (
          <Sequence key={i} from={msToFrame(b.fromMs, fps)} durationInFrames={dur} layout="none">
            <AbsoluteFill>
              <Media src={b.src} durationInFrames={dur} kenBurns={b.kenBurns ?? true} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* лёгкое затемнение сверху и снизу — текст и спикер читаются на пёстром фоне */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      <StickerFilter id="sticker" outlinePx={outlinePx} />
      <div
        style={{
          position: "absolute",
          right: `${cutoutRightPct * 100}%`,
          bottom: `${-cutoutBleedPct * 100}%`,
          width: `${cutoutWidthPct * 100}%`,
          transform: `translateY(${(1 - enter) * 110}%) rotate(${(1 - enter) * 6}deg)`,
          transformOrigin: "50% 100%",
          filter: "url(#sticker) drop-shadow(0 18px 30px rgba(0,0,0,0.5))",
        }}
      >
        <OffthreadVideo transparent muted src={res(cutoutSrc)} style={{ width: "100%", display: "block" }} />
      </div>

      <Audio src={res(audioSrc)} />
      <Captions captions={caps} />
    </AbsoluteFill>
  );
};

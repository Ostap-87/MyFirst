import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import { CAPTION_FONT, THEME } from "../styles";
import { msToFrame, textOutline } from "../lib/utils";

// Как у автора: без знаков препинания, регистр как в речи, 2–5 слов на экран, 1–2 строки.
const clean = (s: string) => s.replace(/[.,!?…:;«»"]/g, "");

const Page: React.FC<{ page: TikTokPage; topPct: number; highlightActive: boolean }> = ({
  page,
  topPct,
  highlightActive,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 240 }, durationInFrames: 8 });
  const scale = 0.88 + 0.12 * pop;
  const nowMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${topPct * 100}%`,
          width: `${THEME.captionMaxWidthPct * 100}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          textAlign: "center",
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: THEME.captionFontSize,
          lineHeight: 1.12,
          letterSpacing: -0.5,
          color: THEME.captionColor,
          textShadow: textOutline(THEME.captionStrokePx, THEME.captionStroke),
        }}
      >
        {page.tokens.map((t, i) => {
          const active = highlightActive && nowMs >= t.fromMs && nowMs < t.toMs;
          return (
            <span key={i} style={{ color: active ? THEME.accent : undefined, whiteSpace: "pre" }}>
              {clean(t.text)}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<{
  captions: Caption[];
  topPct?: number;
  combineMs?: number; // чем больше — тем больше слов на экране
  highlightActive?: boolean; // подсветка текущего слова (у автора выключено)
}> = ({ captions, topPct = THEME.captionTopPct, combineMs = 1100, highlightActive = false }) => {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: combineMs }),
    [captions, combineMs]
  );

  return (
    <>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const ownEnd = page.startMs + page.durationMs + 250;
        const endMs = next ? Math.min(next.startMs, ownEnd) : ownEnd;
        return (
          <Sequence
            key={i}
            from={msToFrame(page.startMs, fps)}
            durationInFrames={Math.max(1, msToFrame(endMs - page.startMs, fps))}
            layout="none"
          >
            <Page page={page} topPct={topPct} highlightActive={highlightActive} />
          </Sequence>
        );
      })}
    </>
  );
};

import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../components/Captions";
import { FeatheredBottom } from "../components/FeatheredBottom";
import { Media } from "../components/Media";
import { ScrollingScreen } from "../components/ScrollingScreen";
import { StickerFilter } from "../components/StickerFilter";
import { useCaptionsFile } from "../lib/useCaptionsFile";
import type { Broll } from "../lib/types";
import { msToFrame, res } from "../lib/utils";
import { REEL, THEME } from "../styles";

// ГЛАВНАЯ композиция «Reel»: весь рилс собирается по одному файлу public/edit.json.
// Спикер идёт непрерывно (звук и синхрон не рвутся), а поверх по таймкодам включаются приёмы:
//   punchIns → T3 (резкий зум), splits → T1/T4 (сплит с B-roll или скрином), stickers → T2 (вырезка поверх B-roll).

export type PunchIn = { fromMs: number; toMs: number; scale?: number; originY?: number };
export type StickerSeg = { fromMs: number; toMs: number; bgSrc: string; kenBurns?: boolean };

export type ReelProps = {
  editFile?: string; // "edit.json" — всё ниже можно задать в нём
  durationMs?: number;
  speakerSrc: string; // студийный рендер T0 (или исходник)
  gradeSpeaker?: boolean; // false, если speakerSrc уже прошёл T0 (чтобы не грейдить дважды)
  cutoutSrc?: string; // спикер с альфой — нужен только для stickers
  captionsFile?: string;
  captions?: Caption[];
  punchIns?: PunchIn[];
  splits?: Broll[];
  stickers?: StickerSeg[];
  drift?: number;
  speakerFocusY?: number;
  // Высота субтитров для этого ролика. Не задана — берётся THEME.captionTopPct
  // (53%), рассчитанная на посадку в студии, где глаза на 33%. У селфи без
  // студии лицо ниже, и 53% приходится на глаза — тогда задаётся здесь, а
  // THEME остаётся нетронутой для остальных рилсов.
  captionTopPct?: number;
};

export const calculateReelMetadata: CalculateMetadataFunction<ReelProps> = async ({ props }) => {
  let merged: ReelProps = props;
  if (props.editFile) {
    const r = await fetch(staticFile(props.editFile));
    if (!r.ok) throw new Error(`Не найден public/${props.editFile}`);
    merged = { ...props, ...(await r.json()) };
  }
  const durationMs = merged.durationMs ?? 30000;
  return { props: merged, durationInFrames: Math.max(1, Math.ceil((durationMs / 1000) * REEL.fps)) };
};

export const Reel: React.FC<ReelProps> = ({
  speakerSrc,
  gradeSpeaker = false,
  cutoutSrc,
  captionsFile,
  captions,
  punchIns = [],
  splits = [],
  stickers = [],
  drift = 0.04,
  speakerFocusY = 0.33,
  captionTopPct,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, durationInFrames } = useVideoConfig();
  const caps = useCaptionsFile(captionsFile, captions);
  const ms = (frame / fps) * 1000;

  const inSplit = splits.find((s) => ms >= s.fromMs && ms < s.toMs);
  const inSticker = stickers.find((s) => ms >= s.fromMs && ms < s.toMs);
  const punch = !inSplit && !inSticker ? punchIns.find((p) => ms >= p.fromMs && ms < p.toMs) : undefined;

  const seam = height * THEME.splitRatio;
  const driftScale = interpolate(frame, [0, durationInFrames], [1, 1 + drift]);
  const speakerScale = inSplit ? THEME.splitZoom : driftScale * (punch?.scale ?? 1);
  const originY = (punch?.originY ?? speakerFocusY) * 100;

  const enter = inSticker
    ? spring({ frame: frame - msToFrame(inSticker.fromMs, fps), fps, config: { damping: 13, stiffness: 120 } })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Спикер — один непрерывный видеослой */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: inSplit ? seam + THEME.featherPx / 2 : height,
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
            transform: `scale(${speakerScale})`,
            transformOrigin: `50% ${originY}%`,
            filter: gradeSpeaker ? THEME.grade : undefined,
          }}
        />
      </div>

      {/* T1 / T4 — сплиты */}
      {splits.map((b, i) => {
        const dur = Math.max(1, msToFrame(b.toMs - b.fromMs, fps));
        return (
          <Sequence key={`s${i}`} from={msToFrame(b.fromMs, fps)} durationInFrames={dur} layout="none">
            <FeatheredBottom seam={seam} featherPx={THEME.featherPx}>
              {b.type === "screen" ? (
                <ScrollingScreen src={b.src} durationInFrames={dur} scrollToPx={b.scrollToPx} highlights={b.highlights} />
              ) : (
                <Media src={b.src} durationInFrames={dur} kenBurns={b.kenBurns ?? true} />
              )}
            </FeatheredBottom>
          </Sequence>
        );
      })}

      {/* T2 — фон стикер-сегментов */}
      {stickers.map((s, i) => {
        const dur = Math.max(1, msToFrame(s.toMs - s.fromMs, fps));
        return (
          <Sequence key={`k${i}`} from={msToFrame(s.fromMs, fps)} durationInFrames={dur} layout="none">
            <AbsoluteFill>
              <Media src={s.bgSrc} durationInFrames={dur} kenBurns={s.kenBurns ?? true} />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)",
              }}
            />
          </Sequence>
        );
      })}

      {/* T2 — вырезанный спикер: смонтирован всегда (синхрон), виден только в stickers */}
      {cutoutSrc && stickers.length > 0 && (
        <>
          <StickerFilter id="reel-sticker" outlinePx={THEME.stickerOutlinePx} />
          <div
            style={{
              position: "absolute",
              right: "-17%",
              bottom: "-29%",
              width: "90%",
              opacity: inSticker ? 1 : 0,
              transform: `translateY(${(1 - enter) * 110}%) rotate(${(1 - enter) * 6}deg)`,
              transformOrigin: "50% 100%",
              filter: "url(#reel-sticker) drop-shadow(0 18px 30px rgba(0,0,0,0.5))",
            }}
          >
            <OffthreadVideo transparent muted src={res(cutoutSrc)} style={{ width: "100%", display: "block" }} />
          </div>
        </>
      )}

      <Captions captions={caps} topPct={captionTopPct} />
    </AbsoluteFill>
  );
};

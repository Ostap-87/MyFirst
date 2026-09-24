import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../components/Captions";
import { Grain } from "../components/Grain";
import { SeamlessLoop } from "../components/SeamlessLoop";
import { useCaptionsFile } from "../lib/useCaptionsFile";
import { res } from "../lib/utils";

// T0 — Виртуальная студия.
// Слои снизу вверх:
//   1) статичный кадр кабинета (PNG) — интерьер гарантированно не «дышит»
//   2) видео-луп ТОЛЬКО в зоне окна (маска) — живой город
//   3) спикер с прозрачным фоном (webm с альфой)
//   4) край стола из того же PNG поверх спикера — ты сидишь «за» столом
//   5) общий грейд, виньетка, зерно — склеивают слои в одну картинку
//   6) субтитры (опционально)

export type Rect = { x: number; y: number; w: number; h: number }; // доли кадра 0..1

export type VirtualStudioProps = {
  stillSrc: string; // studio/night.png
  loopSrc: string; // studio/night.mp4
  loopClipSec?: number; // длина исходного лупа
  windowMaskSrc?: string; // PNG: непрозрачное = окно (scripts/window-mask-from-loop.py)
  windowRect?: Rect; // запасной вариант, если маски нет
  maskFeatherPx?: number;
  speakerSrc?: string; // webm с альфой (вырезанный ты)
  audioSrc?: string; // если звук отдельно
  speakerScale?: number; // 1 = спикер во всю высоту кадра
  speakerOffsetX?: number; // доли кадра, + вправо
  speakerOffsetY?: number; // доли кадра, + вниз
  speakerGrade?: string; // подгонка цвета спикера под фон (ночь/утро разные)
  rimLight?: string; // цвет «контрового» свечения по краю силуэта
  deskTopPct?: number; // где верхний край стола (0..1); ниже — стол перекрывает спикера
  bgBlurPx?: number; // лёгкий расфокус фона = малая ГРИП
  grain?: number;
  vignette?: boolean;
  captionsFile?: string;
  captions?: Caption[];
  debug?: "none" | "mask" | "diff";
};

const rectMask = (feather: number): React.CSSProperties => {
  const h = `linear-gradient(to right, transparent 0, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent 100%)`;
  const v = `linear-gradient(to bottom, transparent 0, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent 100%)`;
  return {
    WebkitMaskImage: `${h}, ${v}`,
    WebkitMaskComposite: "source-in",
    maskImage: `${h}, ${v}`,
    maskComposite: "intersect",
  };
};

export const VirtualStudio: React.FC<VirtualStudioProps> = ({
  stillSrc,
  loopSrc,
  loopClipSec = 8,
  windowMaskSrc,
  windowRect = { x: 0.3, y: 0.08, w: 0.7, h: 0.5 },
  maskFeatherPx = 40,
  speakerSrc,
  audioSrc,
  speakerScale = 1,
  speakerOffsetX = 0,
  speakerOffsetY = 0.04,
  speakerGrade = "contrast(1.04) saturate(1.05) sepia(0.08) brightness(0.98)",
  rimLight = "rgba(255, 190, 120, 0.35)",
  deskTopPct,
  bgBlurPx = 1.5,
  grain = 0.07,
  vignette = true,
  captionsFile,
  captions,
  debug = "none",
}) => {
  const caps = useCaptionsFile(captionsFile, captions);
  const bgStyle: React.CSSProperties = {
    filter: bgBlurPx ? `blur(${bgBlurPx}px)` : undefined,
    transform: bgBlurPx ? "scale(1.02)" : undefined, // прячем размытые края
  };
  const cover: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

  // Слой «окна»: луп, обрезанный маской
  const windowLayer = windowMaskSrc ? (
    <AbsoluteFill
      style={{
        WebkitMaskImage: `url(${res(windowMaskSrc)})`,
        maskImage: `url(${res(windowMaskSrc)})`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        mixBlendMode: debug === "diff" ? "difference" : undefined,
      }}
    >
      <SeamlessLoop src={loopSrc} clipSec={loopClipSec} />
    </AbsoluteFill>
  ) : (
    <div
      style={{
        position: "absolute",
        left: `${windowRect.x * 100}%`,
        top: `${windowRect.y * 100}%`,
        width: `${windowRect.w * 100}%`,
        height: `${windowRect.h * 100}%`,
        overflow: "hidden",
        mixBlendMode: debug === "diff" ? "difference" : undefined,
        ...rectMask(maskFeatherPx),
      }}
    >
      <div
        style={{
          position: "absolute",
          width: `${100 / windowRect.w}%`,
          height: `${100 / windowRect.h}%`,
          left: `${(-windowRect.x / windowRect.w) * 100}%`,
          top: `${(-windowRect.y / windowRect.h) * 100}%`,
        }}
      >
        <SeamlessLoop src={loopSrc} clipSec={loopClipSec} />
      </div>
    </div>
  );

  const deskMask =
    deskTopPct !== undefined
      ? `linear-gradient(to bottom, transparent 0, transparent ${deskTopPct * 100 - 0.4}%, #000 ${deskTopPct * 100 + 0.4}%, #000 100%)`
      : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* 1–2. Фон: статика + живое окно */}
      <AbsoluteFill style={bgStyle}>
        <Img src={res(stillSrc)} style={cover} />
        {windowLayer}
      </AbsoluteFill>

      {/* 3. Спикер */}
      {speakerSrc && (
        <AbsoluteFill
          style={{
            transform: `translate(${speakerOffsetX * 100}%, ${speakerOffsetY * 100}%) scale(${speakerScale})`,
            transformOrigin: "50% 100%",
            filter: `${speakerGrade} drop-shadow(0 0 10px ${rimLight}) drop-shadow(0 20px 40px rgba(0,0,0,0.45))`,
          }}
        >
          <OffthreadVideo transparent src={res(speakerSrc)} muted={!!audioSrc} style={cover} />
        </AbsoluteFill>
      )}
      {audioSrc && <Audio src={res(audioSrc)} />}

      {/* 4. Край стола поверх спикера */}
      {deskMask && (
        <AbsoluteFill style={{ ...bgStyle, WebkitMaskImage: deskMask, maskImage: deskMask }}>
          <Img src={res(stillSrc)} style={cover} />
        </AbsoluteFill>
      )}

      {/* 5. Склейка слоёв */}
      {vignette && (
        <AbsoluteFill
          style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38) 100%)" }}
        />
      )}
      <Grain opacity={grain} />

      {/* Отладка: подсветить маску окна */}
      {debug === "mask" && !windowMaskSrc && (
        <div
          style={{
            position: "absolute",
            left: `${windowRect.x * 100}%`,
            top: `${windowRect.y * 100}%`,
            width: `${windowRect.w * 100}%`,
            height: `${windowRect.h * 100}%`,
            outline: "6px dashed #00FF88",
          }}
        />
      )}
      {debug === "mask" && windowMaskSrc && (
        <AbsoluteFill style={{ opacity: 0.45 }}>
          <Img src={res(windowMaskSrc)} style={{ ...cover, filter: "sepia(1) hue-rotate(80deg) saturate(6)" }} />
        </AbsoluteFill>
      )}

      {/* 6. Субтитры */}
      {caps.length > 0 && <Captions captions={caps} />}
    </AbsoluteFill>
  );
};

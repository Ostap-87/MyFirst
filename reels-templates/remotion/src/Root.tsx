import React from "react";
import { Composition } from "remotion";
import { SplitGradient } from "./templates/SplitGradient";
import { CutoutOverBroll } from "./templates/CutoutOverBroll";
import { TalkingHeadPunchIn } from "./templates/TalkingHeadPunchIn";
import { VirtualStudio } from "./templates/VirtualStudio";
import { Reel, calculateReelMetadata } from "./templates/Reel";
import { sampleCaptions } from "./sample";
import { REEL } from "./styles";

// Длительность: поменяй DURATION или рендери с флагом --frames=0-N.
// = длительность take.mp4: 27,646 с. Композиция длиннее дубля дала бы
// хвост со студией без спикера.
const DURATION = Math.ceil(27.646 * REEL.fps);

export const RemotionRoot: React.FC = () => (
  <>
    {/* ГЛАВНАЯ: весь рилс по public/edit.json (длительность берётся из edit.json) */}
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{ editFile: "edit.json", speakerSrc: "studio-night.mp4" }}
      calculateMetadata={calculateReelMetadata}
    />

    {/* T0: виртуальная студия — ночь. Рендери её первой: результат = speakerSrc для T1/T3/T4 */}
    <Composition
      id="T0-Studio-Night"
      component={VirtualStudio}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        stillSrc: "studio/night.png",
        loopSrc: "studio/night.mp4",
        // Реальная длина лупа по ffprobe — 8,04 с, а не 8: при восьми на стыке
        // каждого круга проскакивает лишний кадр.
        loopClipSec: 8.04,
        windowMaskSrc: "studio/night-mask.png",
        speakerSrc: "speaker-keyed.webm",
        // Звук отдельной дорожкой: после npm run voice, −16 LUFS вместо −29,6
        // в исходнике. Видео с альфой при этом глушится.
        audioSrc: "speaker-keyed-audio.m4a",
        // Сепия 0,16 вместо 0,12: на пробном кадре лицо вышло серее тёплых
        // ламп — инструкция для ночи советует 0,14–0,18.
        speakerGrade: "contrast(1.05) saturate(1.02) sepia(0.16) brightness(0.95)",
        rimLight: "rgba(255, 180, 110, 0.35)",
        // Посадка под дубль 2026-09-24 (селфи, замер по сетке: макушка 41%,
        // глаза 54%, подбородок 72%). Масштаб считается от нижнего края кадра:
        // при 1,1 и сдвиге −0,154 глаза встают на 34%, макушка на 20%, а низ
        // тела уходит под край стола, так что шва нет.
        //
        // Масштаб 1,1, а не 1,0, — из-за плеч: в дубле они выходят за края
        // кадра, и при сдвиге вправо граница исходника проступала прямым
        // вертикальным срезом по левому плечу. При 1,1 и сдвиге ровно 0,05
        // левый край исходника совпадает с краем кадра. Голова при этом
        // остаётся правее надписи на стене и встаёт на фоне окна.
        speakerScale: 1.1,
        speakerOffsetX: 0.05,
        speakerOffsetY: -0.154,
        // Край стола на картинке — 80%, а не 88%: ниже начинается столешница.
        deskTopPct: 0.8,
        debug: "none" as const,
      }}
    />

    {/* T0: виртуальная студия — утро (другой грейд спикера: холоднее и светлее) */}
    <Composition
      id="T0-Studio-Morning"
      component={VirtualStudio}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        stillSrc: "studio/morning.png",
        loopSrc: "studio/morning.mp4",
        loopClipSec: 8,
        windowMaskSrc: "studio/morning-mask.png",
        speakerSrc: "speaker-keyed.webm",
        speakerGrade: "contrast(1.03) saturate(1.04) sepia(0.04) brightness(1.04)",
        rimLight: "rgba(255, 235, 200, 0.4)",
        deskTopPct: 0.88,
        debug: "none" as const,
      }}
    />
    {/* Фото 1: сплит-скрин с градиентной склейкой */}
    <Composition
      id="T1-SplitGradient"
      component={SplitGradient}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        speakerSrc: "speaker.mp4",
        captions: sampleCaptions,
        brolls: [
          { src: "broll/01.jpg", fromMs: 1500, toMs: 4500 },
          { src: "broll/02.mp4", fromMs: 6000, toMs: 9000 },
        ],
      }}
    />

    {/* Фото 2: вырезанный спикер-«стикер» поверх B-roll */}
    <Composition
      id="T2-CutoutOverBroll"
      component={CutoutOverBroll}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        cutoutSrc: "cutout.webm",
        audioSrc: "cutout-audio.m4a",
        captions: sampleCaptions,
        backgrounds: [
          { src: "broll/02.mp4", fromMs: 0, toMs: 5000 },
          { src: "broll/03.mp4", fromMs: 5000, toMs: 10000 },
        ],
      }}
    />

    {/* Фото 3: говорящая голова + реквизит + панч-ины */}
    <Composition
      id="T3-TalkingHead"
      component={TalkingHeadPunchIn}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        speakerSrc: "speaker.mp4",
        captions: sampleCaptions,
        punchIns: [
          { fromMs: 2400, toMs: 4200, scale: 1.18, originY: 0.3 },
          { fromMs: 7000, toMs: 8200, scale: 1.25, originY: 0.75 }, // наезд на лист с цифрами
        ],
        inserts: [{ src: "insert/paper-closeup.mp4", fromMs: 5000, toMs: 6500 }],
      }}
    />

    {/* Фото 4: сплит со скрин-доказательством (скролл + рамки на ценах) */}
    <Composition
      id="T4-ScreenProof"
      component={SplitGradient}
      durationInFrames={DURATION}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
      defaultProps={{
        speakerSrc: "speaker.mp4",
        captions: sampleCaptions,
        brolls: [
          {
            type: "screen",
            src: "screens/taobao.png",
            fromMs: 2000,
            toMs: 7000,
            scrollToPx: 600,
            highlights: [
              { x: 60, y: 520, w: 300, h: 90, atMs: 1200 },
              { x: 420, y: 520, w: 300, h: 90, atMs: 2000 },
            ],
          },
        ],
      }}
    />
  </>
);

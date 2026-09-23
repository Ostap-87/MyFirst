import "./index.css";
import carouselExample from "../data/carousel.example.json";
import { Composition } from "remotion";
import {
  MotionLab,
  motionLabDefaults,
  motionLabSchema,
} from "./shared/MotionLab";
import {
  EffectsLab,
  effectsLabDefaults,
  effectsLabSchema,
} from "./shared/EffectsLab";

// Реестр всех композиций проекта.
//
// Имя композиции = <префикс бренда>-<название>:
//   GTT-*       — GlobalTechTour   (src/globaltechtour)
//   Aura-*      — Aura Robotics    (src/aura-robotics)
//   Personal-*  — ostapdotcenko    (src/ostapdotcenko)
//   Shared-*    — нейтральные сцены для проверки эффектов (src/shared)
//
// Блоки между маркерами new-composition:* дописывает скрипт
// `npm run new-composition` — руками туда лезть не нужно, но можно.

// new-composition:imports:start
import {
  ChinaReel,
  chinaReelSchema,
} from "./globaltechtour/compositions/ChinaReel";
import {
  GTTIntro,
  gttIntroDefaults,
  gttIntroSchema,
} from "./globaltechtour/compositions/Intro";
import {
  AuraIntro,
  auraIntroDefaults,
  auraIntroSchema,
} from "./aura-robotics/compositions/Intro";
import {
  PersonalIntro,
  personalIntroDefaults,
  personalIntroSchema,
} from "./ostapdotcenko/compositions/Intro";
import {
  GTTStats,
  gttStatsDefaults,
  gttStatsSchema,
} from "./globaltechtour/compositions/Stats";
import {
  GTTPostReel,
  gttPostReelDefaults,
  gttPostReelSchema,
} from "./globaltechtour/compositions/PostReel";
import {
  AuraPostReel,
  auraPostReelDefaults,
  auraPostReelSchema,
} from "./aura-robotics/compositions/PostReel";
import {
  PersonalReel,
  personalReelDefaults,
  personalReelSchema,
} from "./ostapdotcenko/compositions/Reel";
import {
  calculateTalkingHeadMetadata,
  TalkingHead,
  talkingHeadDefaults,
  talkingHeadSchema,
} from "./ostapdotcenko/compositions/TalkingHead";
import {
  GTTCarousel,
  gttCarouselSchema,
} from "./globaltechtour/compositions/Carousel";
import {
  AuraCarousel,
  auraCarouselSchema,
} from "./aura-robotics/compositions/Carousel";
import {
  PersonalCarousel,
  personalCarouselSchema,
} from "./ostapdotcenko/compositions/Carousel";
// new-composition:imports:end

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* new-composition:start */}
      <Composition
        id="GTT-Intro"
        component={GTTIntro}
        schema={gttIntroSchema}
        defaultProps={gttIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Aura-Intro"
        component={AuraIntro}
        schema={auraIntroSchema}
        defaultProps={auraIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Personal-Intro"
        component={PersonalIntro}
        schema={personalIntroSchema}
        defaultProps={personalIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GTT-Stats"
        component={GTTStats}
        schema={gttStatsSchema}
        defaultProps={gttStatsDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* Reels из съёмки в Циндао: 25,5 с видео + 2,5 с концевой карточки.
          Тайминги плашек берутся из data/captions-china-expo.json. */}
      <Composition
        id="GTT-ChinaReel"
        component={ChinaReel}
        schema={chinaReelSchema}
        defaultProps={{
          footage: "local/china-graded.mp4",
          hookTop: "Кто учит топ-менеджеров",
          hookBottom: "Alibaba, Tencent и Baidu?",
          place: "Циндао, Китай",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          hasBurnedCaptions: false,
          ctaTitle: "Возим делегации в технологический Китай",
          ctaUrl: "globaltechtour.ru",
        }}
        durationInFrames={843}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GTT-PostReel"
        component={GTTPostReel}
        schema={gttPostReelSchema}
        defaultProps={gttPostReelDefaults}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Aura-PostReel"
        component={AuraPostReel}
        schema={auraPostReelSchema}
        defaultProps={auraPostReelDefaults}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Personal-Reel"
        component={PersonalReel}
        schema={personalReelSchema}
        defaultProps={personalReelDefaults}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Personal-TalkingHead"
        component={TalkingHead}
        schema={talkingHeadSchema}
        defaultProps={talkingHeadDefaults}
        calculateMetadata={calculateTalkingHeadMetadata}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GTT-Carousel"
        component={GTTCarousel}
        schema={gttCarouselSchema}
        defaultProps={{
          slides: carouselExample.slides as never,
          index: 0,
          showCounter: true,
          showSwipeHint: true,
          footer: "",
        }}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="Aura-Carousel"
        component={AuraCarousel}
        schema={auraCarouselSchema}
        defaultProps={{
          slides: carouselExample.slides as never,
          index: 0,
          showCounter: true,
          showSwipeHint: true,
          footer: "",
        }}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="Personal-Carousel"
        component={PersonalCarousel}
        schema={personalCarouselSchema}
        defaultProps={{
          slides: carouselExample.slides as never,
          index: 0,
          showCounter: true,
          showSwipeHint: true,
          footer: "",
        }}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      {/* new-composition:end */}

      {/* Витрина эффектов на нейтральных данных: сюда смотрим, когда
          проверяем новый эффект из src/shared/components/effects. */}
      <Composition
        id="Shared-MotionLab"
        component={MotionLab}
        schema={motionLabSchema}
        defaultProps={motionLabDefaults}
        durationInFrames={202}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Shared-EffectsLab"
        component={EffectsLab}
        schema={effectsLabSchema}
        defaultProps={effectsLabDefaults}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

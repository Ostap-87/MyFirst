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
import {
  ElementsLab,
  elementsLabDefaults,
  elementsLabSchema,
} from "./shared/ElementsLab";

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
  ChinaStories,
  chinaStoriesSchema,
} from "./globaltechtour/compositions/ChinaStories";
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
      {/* Стенд для элементов Remotion: показывает их как есть, до адаптации. */}
      <Composition
        id="Shared-ElementsLab"
        component={ElementsLab}
        schema={elementsLabSchema}
        defaultProps={elementsLabDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* Сторис из второй съёмки того же дня. Речь на противопоставлении,
          поэтому плашки спорят, а не перечисляют. 19,2 с = 576 кадров. */}
      <Composition
        id="GTT-ChinaStories"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/stories-graded.mp4",
          captionsSrc: "captions/stories.json",
          durationSeconds: 19.2,
          hookTop: "Бизнес-тур — это",
          hookBottom: "не поездка на рынок",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Рынки в Гуанчжоу", at: 6.45, until: 15.66, kind: "struck" as const },
            { text: "Встречи с корпорациями", at: 15.66, kind: "accent" as const },
          ],
        }}
        durationInFrames={576}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про бенчмаркинг. Плашки: сперва два термина копятся,
          затем «только для корпораций» перечёркивается и сменяется
          на «делаем доступным» — это разворот всей речи. */}
      <Composition
        id="GTT-Benchmark"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st2-graded.mp4",
          captionsSrc: "captions/st2.json",
          durationSeconds: 34.3,
          hookTop: "Формат, куда пускают",
          hookBottom: "только корпорации",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Бенчмарк-обучение", at: 8.48, until: 21.16, kind: "term" as const },
            { text: "Бенчмарк-туризм", at: 10.88, until: 21.16, kind: "term" as const },
            { text: "Только для корпораций", at: 21.16, until: 29.5, kind: "struck" as const },
            { text: "Делаем доступным", at: 29.5, kind: "accent" as const },
          ],
        }}
        durationInFrames={1029}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про нишевое мероприятие под Циндао. Речь перечислительная:
          приглашение -> закрытый формат -> имена холдингов -> зачем он там.
          Плашки идут этой же лестницей. 31,7 с = 949 кадров.

          Из речи вырезано «и иже с ними»: рез 21,94 -> 23,10 прошёл по
          серединам тишины с обеих сторон, иначе на склейке слышен щелчок.
          Тайминги после реза сдвинуты на те же 34 кадра. */}
      <Composition
        id="GTT-Invite"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st4-graded.mp4",
          captionsSrc: "captions/st4.json",
          durationSeconds: 31.7,
          hookTop: "Мероприятие, куда зовут",
          hookBottom: "только по приглашению",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Нишевое мероприятие", at: 9.9, until: 20.0, kind: "term" as const },
            { text: "Только крупные холдинги", at: 15.7, until: 20.0, kind: "term" as const },
            { text: "Alibaba · Haier · Tencent", at: 20.1, until: 23.9, kind: "accent" as const },
            { text: "Корпоративное обучение", at: 24.8, kind: "accent" as const },
          ],
        }}
        durationInFrames={949}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про опыт. Речь идёт от общего к конкретному: стаж ->
          какие это были встречи -> где остались связи. Плашки держатся
          по одной: кадр тесный, стек из двух к макушке не влезает.
          33,1 с = 992 кадра. */}
      <Composition
        id="GTT-Experience"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st5-graded.mp4",
          captionsSrc: "captions/st5.json",
          durationSeconds: 33.07,
          hookTop: "Десять лет встреч",
          hookBottom: "с первыми лицами",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "10 лет в этом формате", at: 4.1, until: 12.6, kind: "term" as const },
            { text: "Протокольные встречи", at: 13.1, until: 20.5, kind: "term" as const },
            { text: "Китай · Юго-Восточная Азия", at: 24.3, kind: "accent" as const },
          ],
        }}
        durationInFrames={992}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про готовые программы и базу. Самый тесный кадр из всех:
          лицо крупное, макушка почти у верха, поэтому плашки строго по
          одной. 24,3 с = 729 кадров. */}
      <Composition
        id="GTT-Programs"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st6-graded.mp4",
          captionsSrc: "captions/st6.json",
          durationSeconds: 24.3,
          hookTop: "Программу не пишут",
          hookBottom: "под каждый запрос",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Программы уже отработаны", at: 3.3, until: 12.8, kind: "term" as const },
            { text: "≈1000 компаний в базе", at: 13.5, until: 22.1, kind: "accent" as const },
            { text: "Топ-менеджмент напрямую", at: 22.3, kind: "accent" as const },
          ],
        }}
        durationInFrames={729}
        fps={30}
        width={1080}
        height={1920}
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
          platform: "stories" as const,
          showEndCard: false,
          ctaTitle: "Возим делегации в технологический Китай",
          ctaUrl: "globaltechtour.ru",
        }}
        durationInFrames={768}
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

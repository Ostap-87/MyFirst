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
  calculateStoriesMetadata,
  ChinaStories,
  chinaStoriesSchema,
} from "./globaltechtour/compositions/ChinaStories";
import {
  calculateEditorMetadata,
  ChinaStoriesEditor,
  chinaStoriesEditorSchema,
} from "./globaltechtour/compositions/ChinaStoriesEditor";
import {
  SitePromo,
  sitePromoSchema,
} from "./globaltechtour/compositions/SitePromo";
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
import { GTTCarouselAnimated, gttCarouselAnimatedDefaults, gttCarouselAnimatedSchema } from "./globaltechtour/compositions/CarouselAnimated";
import { GTTCarouselZoomTest, gttCarouselZoomTestDefaults, gttCarouselZoomTestSchema } from "./globaltechtour/compositions/CarouselZoomTest";
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
          cutaways: [],
        }}
        durationInFrames={576}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Head из пула: пропсы приходят файлом data/head/<ролик>.json через
          `npm run head -- --render <ролик>`, длительность — по съёмке.
          Здесь по умолчанию GTT-Invite, чтобы композиция открывалась. */}
      <Composition
        id="GTT-Head"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        calculateMetadata={calculateStoriesMetadata}
        defaultProps={{
          footage: "local/st4-graded.mp4",
          captionsSrc: "captions/st4.json",
          durationSeconds: 31.7,
          hookTop: "Мероприятие, куда зовут",
          hookBottom: "только по приглашению",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [],
          cutaways: [],
        }}
        durationInFrames={951}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Арсенал врезок на реальной сторис: окна, карточки внахлёст,
          B-roll со шторкой, видео в рамке. Витрина приёмов, не выпуск. */}
      <Composition
        id="GTT-Arsenal"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        calculateMetadata={calculateStoriesMetadata}
        defaultProps={{
          footage: "local/st4-graded.mp4",
          captionsSrc: "captions/st4.json",
          durationSeconds: 22,
          hookTop: "Арсенал приёмов",
          hookBottom: "поверх говорящей головы",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [],
          cutaways: [],
          focusY: 0.42,
          popWindows: [
            {
              at: 3,
              until: 6.6,
              items: [
                { src: "site/home.png" },
                { src: "tg-images/globaltechtour/2026-08-23-bytedance-tiktok-vs-douyin.png" },
                { src: "site/cases.jpg" },
                { src: "tg-images/globaltechtour/2026-08-16-nio-battery-swap.png" },
              ],
            },
          ],
          photoCards: [
            {
              at: 7.4,
              until: 11.2,
              items: [
                { src: "tg-images/globaltechtour/2026-08-22-tencent-wechat-os.png" },
                { src: "tg-images/globaltechtour/2026-08-26-ant-group-alipay-infra.png" },
                { src: "tg-images/globaltechtour/2026-08-28-sf-express-air-cargo.png" },
              ],
            },
          ],
          brolls: [
            {
              at: 11.8,
              until: 16.6,
              items: [
                { src: "tg-images/globaltechtour/2026-08-21-foxconn-ai-servers.png", caption: "Foxconn" },
                { src: "tg-images/globaltechtour/2026-09-01-longi-envision-solar-wind.png", caption: "LONGi" },
                { src: "site/route-tea.mp4", caption: "Маршрут" },
              ],
            },
          ],
          inserts: [
            { at: 17.4, until: 21.2, src: "local/china-expo.mp4", caption: "На выставке" },
          ],
        }}
        durationInFrames={660}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Деление экрана: спикер сверху, показ снизу. Витрина приёма на
          сторис про обучение в кампусах. */}
      <Composition
        id="GTT-SplitDemo"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        calculateMetadata={calculateStoriesMetadata}
        defaultProps={{
          footage: "local/st15-graded.mp4",
          captionsSrc: "captions/st15.json",
          durationSeconds: 16,
          hookTop: "Обучение",
          hookBottom: "в кампусах гигантов",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [],
          cutaways: [],
          focusY: 0.48,
          splits: [
            { at: 3.4, until: 8.6, items: [{ src: "site/training.png" }] },
            {
              at: 10.0,
              until: 15.2,
              items: [
                { src: "tg-images/globaltechtour/2026-08-22-tencent-wechat-os.png" },
                { src: "tg-images/globaltechtour/2026-08-23-bytedance-tiktok-vs-douyin.png" },
              ],
            },
          ],
        }}
        durationInFrames={480}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Монтажный стол: ролик ChinaStories и его лента в одном кадре.
          Пропсы любой сторис подставляет `npm run editor -- --id <id>`;
          здесь по умолчанию GTT-Invite — в ней есть стопка из трёх плашек. */}
      <Composition
        id="GTT-Editor"
        component={ChinaStoriesEditor}
        schema={chinaStoriesEditorSchema}
        calculateMetadata={calculateEditorMetadata}
        defaultProps={{
          title: "GTT-Invite",
          peaksSrc: "",
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
          cutaways: [],
        }}
        durationInFrames={951}
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
          cutaways: [],
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
          cutaways: [],
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
          cutaways: [],
        }}
        durationInFrames={992}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про готовые программы и базу. Самый тесный кадр из всех:
          лицо крупное, макушка почти у верха, поэтому плашки строго по
          одной. 24,33 с = 730 кадров. */}
      <Composition
        id="GTT-Programs"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st6-graded.mp4",
          captionsSrc: "captions/st6.json",
          durationSeconds: 24.33,
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
          cutaways: [],
        }}
        durationInFrames={730}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про скорость выезда. Речь короткая и вся про одно —
          что ждать не нужно, — поэтому плашки не перечисляют, а
          подпирают довод: программы есть -> срок -> согласований нет.
          16,9 с = 506 кадров. */}
      <Composition
        id="GTT-Speed"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st7-graded.mp4",
          captionsSrc: "captions/st7.json",
          durationSeconds: 16.9,
          hookTop: "Выехать можно",
          hookBottom: "за две недели",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Программы уже собраны", at: 3.3, until: 7.6, kind: "term" as const },
            { text: "Выезд за 2 недели", at: 8.3, until: 12.5, kind: "accent" as const },
            { text: "Согласовывать нечего", at: 13.0, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={506}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про географию за пределами Китая. Обе цифры — из речи,
          на глаз ничего не поставлено. 18,8 с = 563 кадра. */}
      <Composition
        id="GTT-Geography"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st8-graded.mp4",
          captionsSrc: "captions/st8.json",
          durationSeconds: 18.8,
          hookTop: "Дело не только",
          hookBottom: "в Китае",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "1000+ компаний в базе", at: 5.5, until: 10.3, kind: "accent" as const },
            { text: "17 готовых программ", at: 11.0, until: 15.4, kind: "accent" as const },
            { text: "Вся Юго-Восточная Азия", at: 15.9, kind: "term" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={563}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис-призыв, самая короткая из всех: 10 с. Речь — два довода
          и просьба написать, поэтому плашек всего две и вторая держится
          до конца: последнее, что остаётся в кадре, и есть призыв.
          10,0 с = 300 кадров. */}
      <Composition
        id="GTT-CallToAction"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st9-graded.mp4",
          captionsSrc: "captions/st9.json",
          durationSeconds: 10.0,
          hookTop: "Программы расписаны",
          hookBottom: "до маршрута",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Тайминг и маршрут", at: 3.2, until: 5.7, kind: "term" as const },
            { text: "Осталось решиться", at: 6.3, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про количество направлений. Ролик короткий, поэтому плашки
          две: цифра и куда идти за подробностями. 12,6 с = 376 кадров. */}
      <Composition
        id="GTT-Directions"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st10-graded.mp4",
          captionsSrc: "captions/st10.json",
          durationSeconds: 12.6,
          hookTop: "Уже готовых",
          hookBottom: "17 направлений",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "17 направлений", at: 5.2, until: 9.0, kind: "accent" as const },
            { text: "Маршрут — на сайте", at: 9.4, kind: "term" as const },
          ],
          cutaways: [
            { src: "site/expeditions.jpg", at: 7.4, seconds: 5.0, from: 0.02, to: 0.22 },
          ],
        }}
        durationInFrames={376}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис-перечисление индустрий. Плашки не копятся, а сменяют друг
          друга: список длинный, и стопкой он не помещается над головой.
          19,8 с = 591 кадр. */}
      <Composition
        id="GTT-Industries"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st11-graded.mp4",
          captionsSrc: "captions/st11.json",
          durationSeconds: 19.8,
          hookTop: "Программы есть",
          hookBottom: "под вашу индустрию",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Продукты питания", at: 2.9, until: 7.7, kind: "term" as const },
            { text: "Робототехника · Авто", at: 7.8, until: 12.9, kind: "term" as const },
            { text: "Стройка и девелопмент", at: 13.0, until: 16.4, kind: "term" as const },
            { text: "Лёгкая промышленность", at: 16.6, kind: "accent" as const },
          ],
          cutaways: [
            { src: "site/industries.png", at: 6.2, seconds: 6.2, from: 0.03, to: 0.30 },
          ],
        }}
        durationInFrames={591}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про доступ. Довод один и сильный — «многие компании закрыты,
          но я открываю дверь», — поэтому вторая плашка держится до конца.
          21,3 с = 638 кадров. */}
      <Composition
        id="GTT-ClosedDoors"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st12-graded.mp4",
          captionsSrc: "captions/st12.json",
          durationSeconds: 21.3,
          hookTop: "Многие компании",
          hookBottom: "закрыты для визитов",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "От роботов до нефтехимии", at: 7.5, until: 15.2, kind: "term" as const },
            { text: "Открываю закрытые двери", at: 16.4, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={638}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про плотность программы. Цифры — из речи: пять дней, две
          компании в день. 23,3 с = 698 кадров. */}
      <Composition
        id="GTT-FiveDays"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st13-graded.mp4",
          captionsSrc: "captions/st13.json",
          durationSeconds: 23.3,
          hookTop: "Пять дней —",
          hookBottom: "весь Китай",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "2 компании в день", at: 5.5, until: 13.8, kind: "term" as const },
            { text: "Управленцы, не менеджеры", at: 16.8, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={698}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про сроки кастомного тура. Последняя плашка перекладывает
          решение на зрителя — этим ролик и заканчивается.
          12,4 с = 369 кадров. */}
      <Composition
        id="GTT-Custom"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st14-graded.mp4",
          captionsSrc: "captions/st14.json",
          durationSeconds: 12.4,
          hookTop: "Тур под вашу",
          hookBottom: "индустрию",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Согласование — неделя", at: 4.9, until: 10.4, kind: "accent" as const },
            { text: "Дальше — за вами", at: 10.6, kind: "term" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={369}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про обучение внутри кампусов. Имена компаний — как они сами
          себя пишут: whisper дал «Hire» и «Bydance». 32,3 с = 968 кадров. */}
      <Composition
        id="GTT-Campus"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st15-graded.mp4",
          captionsSrc: "captions/st15.json",
          durationSeconds: 32.27,
          hookTop: "Обучение внутри",
          hookBottom: "их кампусов",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Кампусы корпораций", at: 7.1, until: 10.2, kind: "term" as const },
            { text: "Alibaba · Huawei · ByteDance", at: 10.4, until: 17.0, kind: "accent" as const },
            { text: "Три дня внутри", at: 17.6, until: 27.2, kind: "term" as const },
            { text: "Как они этого достигли", at: 27.5, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={968}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про методологию. Довод строится лесенкой: не просто визит ->
          сколько визитов -> что из них складывается. 23,4 с = 701 кадр. */}
      <Composition
        id="GTT-Method"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st16-graded.mp4",
          captionsSrc: "captions/st16.json",
          durationSeconds: 23.37,
          hookTop: "Не просто посещение",
          hookBottom: "а методология",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Своя методология", at: 3.9, until: 9.4, kind: "term" as const },
            { text: "2–3 посещения", at: 9.5, until: 14.5, kind: "accent" as const },
            { text: "От рецептуры до упаковки", at: 15.5, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={701}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про сопровождение после поездки. Короткая и об одном:
          экспедиция кончилась, работа — нет. 15,4 с = 461 кадр. */}
      <Composition
        id="GTT-AfterCare"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st17-graded.mp4",
          captionsSrc: "captions/st17.json",
          durationSeconds: 15.37,
          hookTop: "Экспедиция кончилась —",
          hookBottom: "сопровождение нет",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Пост-тур поддержка", at: 3.4, until: 9.2, kind: "accent" as const },
            { text: "Помогаем выстроить связи", at: 9.5, kind: "term" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={461}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про кейсы и блог. Самая длинная съёмка из девятнадцати —
          40,4 с, у сторис это верхняя граница. 1213 кадров. */}
      <Composition
        id="GTT-Cases"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st18-graded.mp4",
          captionsSrc: "captions/st18.json",
          durationSeconds: 40.43,
          hookTop: "Часть кейсов",
          hookBottom: "под NDA",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Кейсы — на сайте", at: 2.2, until: 4.1, kind: "term" as const },
            { text: "Часть под NDA", at: 4.3, until: 9.6, kind: "struck" as const },
            { text: "Блог по индустриям", at: 13.3, until: 21.0, kind: "accent" as const },
            { text: "Не только Китай", at: 21.2, until: 25.5, kind: "term" as const },
            { text: "Central Kitchen · напитки", at: 25.7, kind: "accent" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={1213}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Сторис про LinkedIn. Единственная, где призыв не к покупке,
          а к чтению. 20,9 с = 626 кадров. */}
      <Composition
        id="GTT-LinkedIn"
        component={ChinaStories}
        schema={chinaStoriesSchema}
        defaultProps={{
          footage: "local/st19-graded.mp4",
          captionsSrc: "captions/st19.json",
          durationSeconds: 20.87,
          hookTop: "Статьи на английском",
          hookBottom: "почти каждый день",
          brandMark: "GLOBAL TECH TOUR",
          logoScale: 1.5,
          logoSpin: 72,
          plates: [
            { text: "Статьи в LinkedIn", at: 7.5, until: 12.0, kind: "accent" as const },
            { text: "Разбор индустрий", at: 12.1, until: 18.4, kind: "term" as const },
            { text: "И немного рефлексии", at: 18.5, kind: "term" as const },
          ],
          cutaways: [],
        }}
        durationInFrames={626}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Промо сайта: ни говорящей головы, ни звука — только страницы и
          цифры. 45 с ровно = 1350 кадров.

          Цифры посчитаны по каталогу, а не взяты с его же страницы: там
          написано «более 900 компаний и 17 отраслей», а на деле 998 и 18. */}
      <Composition
        id="GTT-SitePromo"
        component={SitePromo}
        schema={sitePromoSchema}
        defaultProps={{
          title: "Бизнес-экспедиции",
          subtitle: "в Китай и Юго-Восточную Азию",
          site: "globaltechtour.ru",
          // Пути пустые до записи. Озвучка кладётся в public/audio,
          // и сцены после этого подгоняются под неё, а не она под них.
          voiceover: "audio/promo-voice-final.m4a",
          captionsSrc: "captions/promo-final.json",
          platform: "stories" as const,
          music: "",
          musicVolume: 0.16,
          openSeconds: 4.68,
          closeSeconds: 2.0,
          scenes: [
            { kind: "page" as const, src: "site/home.png", seconds: 3.68,
              from: 0.02, to: 0.26, label: "Не туризм, а исследование", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/industries.png", seconds: 1.45,
              from: 0.03, to: 0.20, label: "отраслей в каталоге", value: 18, prefix: "", unit: "выбираете свою" },
            // В каталоге сейчас 998 компаний. Округление вверх — решение
            // владельца: каталог растёт, и «более 1000» он считает
            // правильной формулировкой для промо.
            { kind: "page" as const, src: "site/industries.png", seconds: 4.55,
              from: 0.22, to: 0.44, label: "компаний в базе", value: 1000, prefix: "более", unit: "с прямым выходом" },
            { kind: "page" as const, src: "site/expeditions.jpg", seconds: 5.04,
              from: 0.02, to: 0.16, label: "готовых программ", value: 20, prefix: "",
              unit: "по каждой из стран: от Китая до ОАЭ" },
            { kind: "clip" as const, src: "site/route-tea.mp4", seconds: 6.46,
              from: 0, to: 0, label: "Маршрут по дням", value: 0, prefix: "", unit: "города, перелёты, компании" },
            { kind: "page" as const, src: "site/tea-expedition.png", seconds: 4.84,
              from: 0.28, to: 0.52, label: "Программа расписана по часам", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/cases.jpg", seconds: 2.84,
              from: 0.02, to: 0.11, label: "Кейсы и отзывы участников", value: 0, prefix: "", unit: "" },
            // Блог сюда не пошёл: его превью статей грузятся с внешнего
            // адреса и в локальную копию не попали — в кадре были бы значки
            // битых картинок. Обучение содержательнее и выглядит целым.
            { kind: "page" as const, src: "site/training.png", seconds: 9.08,
              from: 0.02, to: 0.26, label: "Обучение в кампусах", value: 0, prefix: "", unit: "" },
          ],
        }}
        durationInFrames={1339}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Тот же промо под Reels: отличается только отступами под интерфейс.
          В Reels верх свободнее, а снизу подпись ниже, чем поле ответа в
          сторис, поэтому субтитры и адрес опускаются. */}
      <Composition
        id="GTT-SitePromoReels"
        component={SitePromo}
        schema={sitePromoSchema}
        defaultProps={{
          title: "Бизнес-экспедиции",
          subtitle: "в Китай и Юго-Восточную Азию",
          site: "globaltechtour.ru",
          // Пути пустые до записи. Озвучка кладётся в public/audio,
          // и сцены после этого подгоняются под неё, а не она под них.
          voiceover: "audio/promo-voice-final.m4a",
          captionsSrc: "captions/promo-final.json",
          platform: "reels" as const,
          music: "",
          musicVolume: 0.16,
          openSeconds: 4.68,
          closeSeconds: 2.0,
          scenes: [
            { kind: "page" as const, src: "site/home.png", seconds: 3.68,
              from: 0.02, to: 0.26, label: "Не туризм, а исследование", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/industries.png", seconds: 1.45,
              from: 0.03, to: 0.20, label: "отраслей в каталоге", value: 18, prefix: "", unit: "выбираете свою" },
            // В каталоге сейчас 998 компаний. Округление вверх — решение
            // владельца: каталог растёт, и «более 1000» он считает
            // правильной формулировкой для промо.
            { kind: "page" as const, src: "site/industries.png", seconds: 4.55,
              from: 0.22, to: 0.44, label: "компаний в базе", value: 1000, prefix: "более", unit: "с прямым выходом" },
            { kind: "page" as const, src: "site/expeditions.jpg", seconds: 5.04,
              from: 0.02, to: 0.16, label: "готовых программ", value: 20, prefix: "",
              unit: "по каждой из стран: от Китая до ОАЭ" },
            { kind: "clip" as const, src: "site/route-tea.mp4", seconds: 6.46,
              from: 0, to: 0, label: "Маршрут по дням", value: 0, prefix: "", unit: "города, перелёты, компании" },
            { kind: "page" as const, src: "site/tea-expedition.png", seconds: 4.84,
              from: 0.28, to: 0.52, label: "Программа расписана по часам", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/cases.jpg", seconds: 2.84,
              from: 0.02, to: 0.11, label: "Кейсы и отзывы участников", value: 0, prefix: "", unit: "" },
            // Блог сюда не пошёл: его превью статей грузятся с внешнего
            // адреса и в локальную копию не попали — в кадре были бы значки
            // битых картинок. Обучение содержательнее и выглядит целым.
            { kind: "page" as const, src: "site/training.png", seconds: 9.08,
              from: 0.02, to: 0.26, label: "Обучение в кампусах", value: 0, prefix: "", unit: "" },
          ],
        }}
        durationInFrames={1339}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Английская версия. Сцены нарезаны заново по расшифровке английской
          озвучки, а не переведены вместе с текстом: речь идёт своим темпом,
          и русские длительности разъехались бы с картинкой. Вступление тут
          5,18 с против русских 4,68, зато сцена с маршрутом короче на
          полторы секунды.

          Числа в плашках те же — они про каталог, а не про язык. */}
      <Composition
        id="GTT-SitePromoEn"
        component={SitePromo}
        schema={sitePromoSchema}
        defaultProps={{
          title: "Business expeditions",
          subtitle: "to China and Southeast Asia",
          site: "globaltechtour.ru",
          voiceover: "audio/promo-voice-en.m4a",
          captionsSrc: "captions/promo-en.json",
          platform: "stories" as const,
          music: "",
          musicVolume: 0.16,
          openSeconds: 5.18,
          closeSeconds: 2.57,
          scenes: [
            { kind: "page" as const, src: "site/home.png", seconds: 3.52,
              from: 0.02, to: 0.26, label: "Not tourism, but research", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/industries.png", seconds: 2.14,
              from: 0.03, to: 0.20, label: "industries in the catalogue", value: 18, prefix: "", unit: "pick yours" },
            { kind: "page" as const, src: "site/industries.png", seconds: 4.1,
              from: 0.22, to: 0.44, label: "companies in the database", value: 1000, prefix: "over", unit: "direct line to leadership" },
            { kind: "page" as const, src: "site/expeditions.jpg", seconds: 6.2,
              from: 0.02, to: 0.16, label: "ready-made programmes", value: 20, prefix: "",
              unit: "one per country: from China to the UAE" },
            { kind: "clip" as const, src: "site/route-tea.mp4", seconds: 4.88,
              from: 0, to: 0, label: "Day-by-day route", value: 0, prefix: "", unit: "cities, flights, companies" },
            { kind: "page" as const, src: "site/tea-expedition.png", seconds: 4.8,
              from: 0.28, to: 0.52, label: "Every day scheduled by the hour", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/cases.jpg", seconds: 3.56,
              from: 0.02, to: 0.11, label: "Cases and participant reviews", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/training.png", seconds: 7.28,
              from: 0.02, to: 0.26, label: "Training inside the campuses", value: 0, prefix: "", unit: "" },
          ],
        }}
        durationInFrames={1327}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Английская версия под Reels: отличается только отступами. */}
      <Composition
        id="GTT-SitePromoEnReels"
        component={SitePromo}
        schema={sitePromoSchema}
        defaultProps={{
          title: "Business expeditions",
          subtitle: "to China and Southeast Asia",
          site: "globaltechtour.ru",
          voiceover: "audio/promo-voice-en.m4a",
          captionsSrc: "captions/promo-en.json",
          platform: "reels" as const,
          music: "",
          musicVolume: 0.16,
          openSeconds: 5.18,
          closeSeconds: 2.57,
          scenes: [
            { kind: "page" as const, src: "site/home.png", seconds: 3.52,
              from: 0.02, to: 0.26, label: "Not tourism, but research", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/industries.png", seconds: 2.14,
              from: 0.03, to: 0.20, label: "industries in the catalogue", value: 18, prefix: "", unit: "pick yours" },
            { kind: "page" as const, src: "site/industries.png", seconds: 4.1,
              from: 0.22, to: 0.44, label: "companies in the database", value: 1000, prefix: "over", unit: "direct line to leadership" },
            { kind: "page" as const, src: "site/expeditions.jpg", seconds: 6.2,
              from: 0.02, to: 0.16, label: "ready-made programmes", value: 20, prefix: "",
              unit: "one per country: from China to the UAE" },
            { kind: "clip" as const, src: "site/route-tea.mp4", seconds: 4.88,
              from: 0, to: 0, label: "Day-by-day route", value: 0, prefix: "", unit: "cities, flights, companies" },
            { kind: "page" as const, src: "site/tea-expedition.png", seconds: 4.8,
              from: 0.28, to: 0.52, label: "Every day scheduled by the hour", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/cases.jpg", seconds: 3.56,
              from: 0.02, to: 0.11, label: "Cases and participant reviews", value: 0, prefix: "", unit: "" },
            { kind: "page" as const, src: "site/training.png", seconds: 7.28,
              from: 0.02, to: 0.26, label: "Training inside the campuses", value: 0, prefix: "", unit: "" },
          ],
        }}
        durationInFrames={1327}
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
      <Composition
        id="GTT-CarouselAnimated"
        component={GTTCarouselAnimated}
        schema={gttCarouselAnimatedSchema}
        defaultProps={gttCarouselAnimatedDefaults}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1350}
      />
            <Composition
        id="GTT-CarouselZoomTest"
        component={GTTCarouselZoomTest}
        schema={gttCarouselZoomTestSchema}
        defaultProps={gttCarouselZoomTestDefaults}
        durationInFrames={90}
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

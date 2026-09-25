import {
  AbsoluteFill,
  type CalculateMetadataFunction,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import {
  CameraMoves,
  FramedInsert,
  mediaItemSchema,
  PhotoCards,
  PopWindows,
  SiteCutaway,
  SitePhoneHeight,
  SpinningTetra,
  CutoutStage,
  PipScreen,
  SplitScreen,
  WipeBroll,
} from "../../shared/components/effects";
import { useCaptions } from "../../shared/useCaptions";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * ChinaStories — шаблон формата Head под сторис.
 *
 * Композиция одна на все выпуски: съёмка, субтитры и плашки приходят
 * пропами, поэтому новый ролик — это запись в Root.tsx, а не новый файл.
 *
 * Чем сторис отличаются от Reels и почему это отдельный шаблон:
 *
 * 1. Другие безопасные зоны. Снизу строка ответа — она выше, чем подпись
 *    в Reels, поэтому субтитры поднимаются. Справа кнопок нет.
 * 2. Сторис пролистывают быстрее ленты, поэтому крючок формулируется
 *    утверждением, а не вопросом: на раздумье времени нет.
 *
 * ——— Плашки ———
 *
 * Три вида, и выбор между ними — смысловой, а не декоративный:
 *
 *   term   — термин или факт. Копится: следующая встаёт под предыдущей,
 *            и к концу перечисления список виден целиком.
 *   struck — то, что отрицается. Приглушённая, перечёркивание
 *            прочерчивается на глазах — видно, что это действие.
 *   accent — то, что утверждается взамен. Белая, с фирменной чертой.
 *
 * Секунды берутся из расшифровки, никогда на глаз: сдвиг на полсекунды
 * читается как брак.
 */

const plateSchema = z.object({
  text: z.string().describe("Текст плашки"),
  at: z.number().describe("Секунда появления — из расшифровки"),
  until: z
    .number()
    .optional()
    .describe("Секунда исчезновения; без неё держится до конца"),
  kind: z
    .enum(["term", "struck", "accent"])
    .describe("term — копится, struck — зачёркнутая, accent — утверждение"),
});

const cutawaySchema = z.object({
  src: z
    .string()
    .describe("Скриншот страницы внутри public, например site/industries.png"),
  at: z
    .number()
    .describe("Секунда появления — привязывается к словам про сайт"),
  seconds: z.number().describe("Сколько держится"),
  from: z
    .number()
    .min(0)
    .max(1)
    .describe("С какой доли высоты страницы начать"),
  to: z
    .number()
    .min(0)
    .max(1)
    .describe("До какой доли дойти: разница задаёт скорость"),
});

const moveSchema = z.object({
  at: z.number().describe("Секунда начала — на начале слова"),
  until: z.number().describe("Секунда конца — на конце фразы"),
  kind: z
    .enum(["punch", "push", "cut"])
    .describe("punch — быстрый зум, push — лёгкий наезд, cut — смена кадра"),
  scale: z.number().min(1).max(1.6).describe("Во сколько раз крупнее"),
});

const span = {
  at: z.number().describe("Секунда начала — на начале слова"),
  until: z.number().describe("Секунда конца — на конце фразы"),
};

const photoCardsBlock = z.object({
  ...span,
  items: z.array(mediaItemSchema).describe("Карточки по порядку — по словам"),
  stepSeconds: z
    .number()
    .optional()
    .describe("Шаг между карточками; по умолчанию 0,35 с"),
  side: z.enum(["left", "right"]).optional(),
  spread: z
    .number()
    .optional()
    .describe("Шаг сдвига, доля ширины карточки; для логотипов около 1"),
  widthFraction: z.number().optional().describe("Ширина карточки, доля кадра"),
});
const popWindowsBlock = z.object({
  ...span,
  items: z.array(mediaItemSchema).describe("Окна по порядку, до шести"),
});
const insertBlock = z.object({
  ...span,
  src: z.string().describe("Видео или фото внутри public"),
  caption: z.string().optional(),
  side: z.enum(["left", "right", "center"]).optional(),
});
const splitBlock = z.object({
  ...span,
  items: z
    .array(mediaItemSchema)
    .describe("Что показывать; несколько — сменяются"),
  side: z
    .enum(["bottom", "left", "right"])
    .optional()
    .describe("Откуда открывается показ; по умолчанию снизу"),
});
const stageBlock = z.object({
  ...span,
  items: z.array(mediaItemSchema).describe("Что показывать за спикером"),
});
const pipBlock = z.object({
  ...span,
  items: z.array(mediaItemSchema).describe("Что показывать на весь экран"),
  corner: z
    .enum(["bottom-right", "bottom-left", "top-right", "top-left"])
    .optional(),
});
const brollBlock = z.object({
  ...span,
  items: z
    .array(mediaItemSchema)
    .describe("Кадры на весь экран; caption — геометка"),
});

export const chinaStoriesSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  captionsSrc: z.string().describe("Путь к расшифровке внутри public"),
  durationSeconds: z.number().describe("Длительность съёмки в секундах"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  brandMark: z.string().describe("Подпись рядом с логотипом сверху"),
  logoScale: z.number().min(0.5).max(3).describe("Размер логотипа сверху"),
  logoSpin: z
    .number()
    .min(0)
    .max(360)
    .describe("Скорость вращения тетраэдра, градусов в секунду"),
  plates: z.array(plateSchema).describe("Плашки по ходу речи"),
  cutaways: z
    .array(cutawaySchema)
    .describe("Перебивки со страницей сайта; пустой массив — без них"),
  // Необязательные: выпуски, собранные до их появления, рендерятся как раньше.
  moves: z
    .array(moveSchema)
    .optional()
    .describe("Движения камеры: быстрый зум, лёгкий наезд, смена кадра"),
  focusY: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Где глаза по высоте кадра — центр зумов; по умолчанию 0,4"),
  photoCards: z
    .array(photoCardsBlock)
    .optional()
    .describe("Фотокарточки внахлёст"),
  popWindows: z
    .array(popWindowsBlock)
    .optional()
    .describe("Всплывающие окна вокруг спикера"),
  inserts: z
    .array(insertBlock)
    .optional()
    .describe("Видеоврезки и фото в рамке"),
  brolls: z
    .array(brollBlock)
    .optional()
    .describe("B-roll на весь кадр со шторкой"),
  splits: z
    .array(splitBlock)
    .optional()
    .describe("Деление экрана: спикер сверху, фото или видео снизу"),
  splitSeam: z
    .number()
    .min(0.3)
    .max(0.7)
    .optional()
    .describe("Где шов деления; по умолчанию 0,5"),
  pips: z
    .array(pipBlock)
    .optional()
    .describe("Картинка в картинке: показ на весь экран, спикер в окне в углу"),
  focusX: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Где лицо по ширине кадра; по умолчанию 0,5"),
  safeZone: z
    .enum(["stories", "reels"])
    .optional()
    .describe("Под чей интерфейс раскладка; по умолчанию сторис"),
  cutoutSrc: z
    .string()
    .optional()
    .describe("Съёмка без фона, прозрачный WebM (npm run head -- --cutout)"),
  stages: z
    .array(stageBlock)
    .optional()
    .describe("Спикер без фона перед показом, уменьшен к низу кадра"),
});

export type ChinaStoriesProps = z.infer<typeof chinaStoriesSchema>;

/** Длительность по съёмке: для GTT-Head, куда пропсы приходят файлом. */
export const calculateStoriesMetadata: CalculateMetadataFunction<
  ChinaStoriesProps
> = ({ props }) => ({
  durationInFrames: Math.ceil(props.durationSeconds * 30),
});
type Plate = z.infer<typeof plateSchema>;

/**
 * Геометрия сторис. Числа — доли высоты кадра, и держать их в одном месте
 * обязательно: раньше логотип и плашки правились порознь, логотип уехал
 * вниз, а плашки остались на своей высоте и наложились на подпись бренда.
 *
 * LOGO_TOP        — ниже строки профиля сторис (аватар + ник + время).
 * MARKS_TOP       — ниже логотипа со всей его высотой; крючок и плашки
 *                   стоят на одном уровне, одновременно их не бывает.
 * CAPTIONS_BOTTOM — выше строки ответа; она в сторис выше, чем подпись
 *                   в Reels, поэтому субтитры поднимаются.
 *
 * Логотип поднят вплотную под строку профиля (было 0,135, плашки — 0,225):
 * крючок в три строки при быстром зуме на первых секундах ложился на
 * лицо. Лицо в кадре начинается около трети высоты — всё сверху обязано
 * закончиться выше.
 */
const LOGO_TOP = 0.09;
const MARKS_TOP = 0.18;
const CAPTIONS_BOTTOM = 0.16;

/**
 * Reels перекрывает кадр иначе, чем сторис (зоны — SAFE_AREAS.reels):
 * снизу 22% под подписью, ником и треком; справа колонка кнопок от
 * середины кадра вниз; сверху заголовок «Reels». Поэтому субтитры и окно
 * спикера выше, всё правое внизу отодвинуто от края, шапка чуть ниже.
 */
const REELS = {
  logoTop: 0.1,
  marksTop: 0.19,
  captionsBottom: 0.24,
  buttons: 0.13,
  pipBottom: 0.33,
  pipWidth: 0.3,
  // Всё сверху должно кончиться выше строки субтитров (~0,69).
  overlaysBottom: 0.67,
  cardsTop: 0.545,
  // Фигура «без фона» без опускания: лицо на 0,58, над субтитрами.
  stageDrop: 0,
  phoneCqh: 56,
} as const;

const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

const PlateView: React.FC<{
  readonly plate: Plate;
  readonly appearAt: number;
  readonly fs: (fraction: number) => number;
}> = ({ plate, appearAt, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const since = frame - appearAt;
  const struck = plate.kind === "struck";

  const enter = spring({
    frame: since,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 18,
  });
  const opacity = interpolate(since, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strikeWidth = interpolate(since, [14, 32], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * fs(0.028)}px)`,
        alignSelf: "flex-start",
        position: "relative",
        backgroundColor: struck
          ? "rgba(12,16,24,0.62)"
          : "rgba(255,255,255,0.96)",
        borderLeft:
          plate.kind === "accent"
            ? `${fs(0.008)}px solid ${theme.colors.accent}`
            : "none",
        borderRadius: fs(0.014),
        padding: `${fs(0.016)}px ${fs(0.028)}px`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.38)",
        backdropFilter: struck ? "blur(10px)" : "none",
        WebkitBackdropFilter: struck ? "blur(10px)" : "none",
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: 700,
        fontSize: fs(0.044),
        letterSpacing: fs(-0.0008),
        color: struck ? "rgba(255,255,255,0.74)" : theme.colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {plate.text}
      {struck ? (
        <span
          style={{
            position: "absolute",
            left: fs(0.028),
            right: `${100 - strikeWidth}%`,
            top: "52%",
            height: fs(0.005),
            backgroundColor: "#FF6B6B",
            borderRadius: fs(0.003),
          }}
        />
      ) : null}
    </div>
  );
};

export const ChinaStories: React.FC<ChinaStoriesProps> = ({
  footage,
  captionsSrc,
  durationSeconds,
  hookTop,
  hookBottom,
  brandMark,
  logoScale,
  logoSpin,
  plates,
  cutaways,
  moves = [],
  focusY = 0.4,
  photoCards = [],
  popWindows = [],
  inserts = [],
  brolls = [],
  splits = [],
  splitSeam,
  pips = [],
  focusX = 0.5,
  cutoutSrc,
  stages = [],
  safeZone = "stories",
}) => {
  const reels = safeZone === "reels";
  const logoTop = reels ? REELS.logoTop : LOGO_TOP;
  const marksTop = reels ? REELS.marksTop : MARKS_TOP;
  const captionsBottom = reels ? REELS.captionsBottom : CAPTIONS_BOTTOM;
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { fs } = useFormat();
  const captions = useCaptions(captionsSrc || null);

  const footageFrames = Math.round(durationSeconds * fps);
  const second = frame / fps;

  const hookIn = interpolate(frame, [0, AT(0.4, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [AT(2.2, fps), AT(2.7, fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Во время перебивки плашки прячутся. Причина не в вёрстке, а в смысле:
  // на экране сайта те же отрасли и программы уже перечислены списком, и
  // плашка поверх них повторяет сказанное дважды. Заодно освобождается
  // место под окно перебивки.
  // B-roll на весь кадр закрывает спикера — плашки прячутся так же.
  // В «картинке в картинке» и «без фона» весь кадр отдан показу: плашка
  // сверху ложилась на телефон с сайтом.
  const cutawayNow =
    cutaways.some((c) => second >= c.at && second < c.at + c.seconds) ||
    [...brolls, ...pips, ...(cutoutSrc ? stages : [])].some(
      (b) => second >= b.at && second < b.until,
    );

  const visible = cutawayNow
    ? []
    : plates.filter(
        (p) => second >= p.at && (p.until === undefined || second < p.until),
      );

  return (
    <SitePhoneHeight.Provider value={reels ? REELS.phoneCqh : 70}>
      <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
        <Sequence durationInFrames={footageFrames}>
          <AbsoluteFill style={{ overflow: "hidden" }}>
            {/* Позиционируем обёртку: свои стили position OffthreadVideo
              до элемента не доносит. */}
            <CutoutStage
              cutoutSrc={cutoutSrc}
              drop={reels ? REELS.stageDrop : undefined}
              stages={stages.map((st) => ({
                fromFrame: AT(st.at, fps),
                toFrame: AT(st.until, fps),
                items: st.items,
              }))}
            >
              <SplitScreen
                focusY={focusY}
                focusX={focusX}
                seam={splitSeam}
                splits={splits.map((sp) => ({
                  fromFrame: AT(sp.at, fps),
                  toFrame: AT(sp.until, fps),
                  items: sp.items,
                  side: sp.side,
                }))}
              >
                <PipScreen
                  focusY={focusY}
                  focusX={focusX}
                  {...(reels
                    ? {
                        bottomFraction: REELS.pipBottom,
                        windowWidth: REELS.pipWidth,
                        sideMargin: REELS.buttons,
                      }
                    : {})}
                  pips={pips.map((pp) => ({
                    fromFrame: AT(pp.at, fps),
                    toFrame: AT(pp.until, fps),
                    items: pp.items,
                    corner: pp.corner,
                  }))}
                >
                  <CameraMoves
                    originY={focusY}
                    moves={moves.map((m) => ({
                      fromFrame: AT(m.at, fps),
                      toFrame: AT(m.until, fps),
                      kind: m.kind,
                      scale: m.scale,
                    }))}
                  >
                    <OffthreadVideo
                      src={staticFile(footage)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </CameraMoves>
                </PipScreen>
              </SplitScreen>
            </CutoutStage>
          </AbsoluteFill>
        </Sequence>

        {/* B-roll — под затемнениями: знак и субтитры поверх него читаются
          так же, как поверх съёмки. */}
        {brolls.map((b) => (
          <Sequence
            key={`b-${b.at}`}
            from={AT(b.at, fps)}
            durationInFrames={AT(b.until - b.at, fps)}
          >
            <WipeBroll items={b.items} />
          </Sequence>
        ))}

        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.22) 16%, rgba(0,0,0,0) 32%)",
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.28) 12%, rgba(0,0,0,0) 26%)",
          }}
        />

        {/* ——— Перебивки: страница сайта поверх съёмки ———

          Ставятся под шапкой и субтитрами намеренно. Речь во время
          перебивки не прерывается, значит логотип и подсветка слов должны
          оставаться видны — иначе на три секунды пропадает и бренд, и текст. */}
        {cutaways.map((c) => (
          <Sequence
            key={`${c.src}-${c.at}`}
            from={AT(c.at, fps)}
            durationInFrames={AT(c.seconds, fps)}
          >
            <SiteCutaway
              src={c.src}
              from={c.from}
              to={c.to}
              zoom={1.05}
              fadeFrames={8}
            />
          </Sequence>
        ))}

        {/* ——— Врезки поверх спикера: окна, карточки, видео в рамке ——— */}
        {popWindows.map((b) => (
          <Sequence
            key={`w-${b.at}`}
            from={AT(b.at, fps)}
            durationInFrames={AT(b.until - b.at, fps)}
          >
            <PopWindows
              items={b.items}
              rightInset={reels ? REELS.buttons : 0}
              bottomLimit={reels ? REELS.overlaysBottom : 1}
            />
          </Sequence>
        ))}
        {photoCards.map((b) => (
          <Sequence
            key={`pc-${b.at}`}
            from={AT(b.at, fps)}
            durationInFrames={AT(b.until - b.at, fps)}
          >
            <PhotoCards
              items={b.items}
              // В Reels стопка — от левого края и уже: справа кнопки.
              side={b.side ?? (reels ? "left" : undefined)}
              spread={b.spread}
              widthFraction={
                reels ? (b.widthFraction ?? 0.34) * 0.87 : b.widthFraction
              }
              topFraction={reels ? REELS.cardsTop : undefined}
              stepFrames={AT(b.stepSeconds ?? 0.35, fps)}
            />
          </Sequence>
        ))}
        {inserts.map((b) => (
          <Sequence
            key={`i-${b.at}`}
            from={AT(b.at, fps)}
            durationInFrames={AT(b.until - b.at, fps)}
          >
            <FramedInsert src={b.src} caption={b.caption} side={b.side} />
          </Sequence>
        ))}

        {/* ——— Вуаль под шапкой ———

          Знак белым по светлому небу даёт контраст 1,57:1 при норме 3:1 —
          это замер, а не впечатление: аудит контраста в HyperFrames поймал
          его на той же съёмке. Тени под текстом не хватает, небо ярче неё.

          Градиент гасит верх кадра и на тёмном фоне сам не читается: там,
          где фон уже тёмный, добавленные 60% почти не меняют картинку, а на
          небе вытягивают знак до нормы. Высота 0,29 — до низа зоны плашек,
          чтобы не появлялось видимой границы посреди кадра. */}
        <AbsoluteFill
          style={{
            height: Math.round(height * 0.29),
            background:
              "linear-gradient(to bottom," +
              "rgba(4,8,16,0.62) 0%," +
              "rgba(4,8,16,0.38) 52%," +
              "rgba(4,8,16,0) 100%)",
          }}
        />

        {/* ——— Шапка ——— */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: Math.round(height * logoTop),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: fs(0.02 * logoScale),
              justifyContent: "center",
            }}
          >
            <SpinningTetra
              size={fs(0.105 * logoScale)}
              degreesPerSecond={logoSpin}
            />
            <span
              style={{
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: 700,
                fontSize: fs(0.036 * logoScale),
                letterSpacing: fs(0.004),
                color: "#fff",
                textShadow: "0 2px 14px rgba(0,0,0,0.75)",
                whiteSpace: "nowrap",
              }}
            >
              {brandMark}
            </span>
          </div>
        </AbsoluteFill>

        {/* ——— Крючок ——— */}
        <Sequence durationInFrames={AT(2.8, fps)}>
          <AbsoluteFill
            style={{
              opacity: hookIn * hookOut,
              justifyContent: "flex-start",
              paddingTop: Math.round(height * marksTop),
              paddingLeft: fs(0.08),
              paddingRight: fs(0.08),
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(7,10,17,0.74)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderRadius: fs(0.022),
                padding: `${fs(0.026)}px ${fs(0.034)}px`,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: 700,
                fontSize: fs(0.055),
                lineHeight: 1.16,
                letterSpacing: fs(-0.0016),
                color: "#fff",
              }}
            >
              {/* Ровный перенос: без него мельче кегль ломал строку как
                «Большинство видит / Китай» — висячее слово. */}
              <span style={{ display: "block", textWrap: "balance" }}>
                {hookTop}
              </span>
              <span style={{ display: "block", color: "#8FD4FF" }}>
                {hookBottom}
              </span>
            </div>
          </AbsoluteFill>
        </Sequence>

        {/* ——— Плашки: term копятся, struck и accent сменяют ——— */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            // Тот же уровень, что и у крючка: они никогда не видны
            // одновременно, зато оба гарантированно ниже логотипа.
            paddingTop: Math.round(height * marksTop),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: fs(0.016),
          }}
        >
          {visible.map((plate) => (
            <PlateView
              key={`${plate.text}-${plate.at}`}
              plate={plate}
              appearAt={AT(plate.at, fps)}
              fs={fs}
            />
          ))}
        </AbsoluteFill>

        {/* ——— Субтитры: выше, чем в Reels — снизу строка ответа ——— */}
        <Sequence durationInFrames={footageFrames}>
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              paddingBottom: Math.round(height * captionsBottom),
              paddingLeft: fs(0.08),
              paddingRight: reels ? fs(REELS.buttons + 0.02) : fs(0.08),
            }}
          >
            <KaraokeCaptions
              theme={theme}
              captions={captions}
              mode="page"
              highlight="color"
              captionStyle="shadow"
              font="Onest"
              fontSizeFraction={0.05}
            />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </SitePhoneHeight.Provider>
  );
};

export default ChinaStories;

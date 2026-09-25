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
  SpinningTetra,
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
    .describe("Что показывать снизу; несколько — сменяются"),
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
 */
const LOGO_TOP = 0.135;
const MARKS_TOP = 0.225;
const CAPTIONS_BOTTOM = 0.16;

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
}) => {
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
  const cutawayNow =
    cutaways.some((c) => second >= c.at && second < c.at + c.seconds) ||
    brolls.some((b) => second >= b.at && second < b.until);

  const visible = cutawayNow
    ? []
    : plates.filter(
        (p) => second >= p.at && (p.until === undefined || second < p.until),
      );

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {/* Позиционируем обёртку: свои стили position OffthreadVideo
              до элемента не доносит. */}
          <SplitScreen
            focusY={focusY}
            seam={splitSeam}
            splits={splits.map((sp) => ({
              fromFrame: AT(sp.at, fps),
              toFrame: AT(sp.until, fps),
              items: sp.items,
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
          </SplitScreen>
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
          <PopWindows items={b.items} />
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
            side={b.side}
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
          paddingTop: Math.round(height * LOGO_TOP),
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
            paddingTop: Math.round(height * MARKS_TOP),
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
              padding: `${fs(0.034)}px ${fs(0.038)}px`,
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.062),
              lineHeight: 1.16,
              letterSpacing: fs(-0.0016),
              color: "#fff",
            }}
          >
            {hookTop}
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
          paddingTop: Math.round(height * MARKS_TOP),
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
            paddingBottom: Math.round(height * CAPTIONS_BOTTOM),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
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
  );
};

export default ChinaStories;

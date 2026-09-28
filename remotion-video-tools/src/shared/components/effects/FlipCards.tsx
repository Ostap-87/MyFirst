import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * FlipCards — карточки на фоне по очереди переворачиваются вокруг
 * вертикальной оси: каждая входит разворотом, на следующем слове уходит
 * разворотом и открывает следующую.
 *
 * Сделано для перечисления брендов («Chagee, Luckin Coffee, HeyTea»):
 * плашка-логотип на весь кадр читается сразу, а переворот показывает,
 * что это один ряд, а не три отдельные вставки.
 *
 * ——— Как движется ———
 *
 * Фон проявляется за `fadeFrames` и медленно дышит. Первая карточка
 * разворачивается из ребра (rotateY −90° → 0) с пружиной и лёгким
 * перелётом. За `flipFrames / 2` до конца своего окна карточка уходит в
 * ребро (0 → 90°, ускорение), следующая сразу выходит из ребра с другой
 * стороны — вместе это читается как переворот одной карточки. На ребре
 * карточка темнеет: без этого поворот выглядит плоским сжатием.
 *
 * Карточка — PNG с прозрачным фоном (логотип, название, подпись), фон —
 * отдельная картинка: переворачивается только карточка, фон стоит.
 */
export const flipCardItemSchema = z.object({
  src: z.string().describe("PNG карточки с прозрачным фоном внутри public"),
  seconds: z
    .number()
    .optional()
    .describe("Сколько держится карточка; без — делят остаток поровну"),
});

export const flipCardsSchema = z.object({
  background: z.string().describe("Фон на весь кадр внутри public; пусто — без фона"),
  items: z.array(flipCardItemSchema).describe("Карточки по порядку"),
  flipFrames: z.number().int().min(4).describe("Длительность переворота в кадрах"),
  fadeFrames: z.number().int().min(1).describe("Проявление фона в кадрах"),
  widthFraction: z.number().min(0.2).max(1).describe("Ширина карточки, доля кадра"),
  centerY: z.number().min(0).max(1).describe("Центр карточки по высоте, доля кадра"),
  centerX: z.number().min(0).max(1).describe("Центр карточки по ширине, доля кадра"),
  perspective: z.number().min(200).describe("Глубина перспективы, px"),
});

export type FlipCardsParams = z.infer<typeof flipCardsSchema>;
export type FlipCardsProps = Partial<FlipCardsParams>;

export const flipCardsDefaults: FlipCardsParams = {
  background: "",
  items: [],
  flipFrames: 14,
  fadeFrames: 6,
  widthFraction: 0.84,
  centerY: 0.45,
  centerX: 0.5,
  perspective: 1800,
};

export const FlipCards: React.FC<FlipCardsProps> = (params) => {
  const p = withDefaults(flipCardsDefaults, params);
  const { items, flipFrames, fadeFrames, widthFraction, centerY, centerX, perspective, background } = p;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  if (!items.length) return null;

  // Окна карточек: заданные `seconds` — как есть, остаток делится поровну.
  const fixed = items.map((it) => (it.seconds ? Math.round(it.seconds * fps) : null));
  const fixedSum = fixed.reduce<number>((a, f) => a + (f ?? 0), 0);
  const free = fixed.filter((f) => f === null).length;
  const per = free ? Math.floor(Math.max(0, durationInFrames - fixedSum) / free) : 0;
  const lens = fixed.map((f) => f ?? per);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const half = Math.max(2, Math.round(flipFrames / 2));

  const bgIn = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bgOut = interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = interpolate(frame, [0, durationInFrames], [1, 1.05]);
  const cardW = width * widthFraction;

  return (
    <AbsoluteFill style={{ opacity: Math.min(bgIn, bgOut) }}>
      {background ? (
        <Img
          src={staticFile(background)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${breathe})` }}
        />
      ) : null}
      {items.map((item, i) => {
        const from = starts[i];
        const last = i === items.length - 1;
        const local = frame - from;
        if (local < 0 || (!last && local >= lens[i])) return null;
        // Вход: пружина из ребра; у первой — чуть позже проявления фона.
        const enterDelay = i === 0 ? Math.round(fadeFrames / 2) : 0;
        const enter = spring({
          frame: local - enterDelay,
          fps,
          config: { damping: 13, mass: 0.7, stiffness: 170 },
          durationInFrames: half * 2,
        });
        const exit = last
          ? 0
          : interpolate(local, [lens[i] - half, lens[i]], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.in(Easing.cubic),
            });
        const angle = exit > 0 ? 90 * exit : -90 * (1 - enter);
        const edge = Math.abs(angle) / 90;
        const lift = interpolate(enter, [0, 1], [0.9, 1]);
        return (
          <div
            key={`${item.src}-${i}`}
            style={{
              position: "absolute",
              left: width * centerX - cardW / 2,
              top: height * centerY,
              width: cardW,
              transform: `translateY(-50%) perspective(${perspective}px) rotateY(${angle}deg) scale(${lift})`,
              transformOrigin: "50% 50%",
              filter: `brightness(${1 - edge * 0.45}) drop-shadow(0 ${30 * (1 - edge)}px ${50}px rgba(10,30,70,${0.35 * (1 - edge)}))`,
              backfaceVisibility: "hidden",
            }}
          >
            <Img src={staticFile(item.src)} style={{ width: "100%", display: "block" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

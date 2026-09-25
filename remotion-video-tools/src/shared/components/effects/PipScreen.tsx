import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { mediaItemSchema, withDefaults } from "./media";
import { ShowcaseLayer } from "./showcase";

/**
 * PipScreen — «картинка в картинке»: показ на весь экран, спикер в углу.
 *
 * Спикер не исчезает, как при B-roll на весь кадр, и не делит экран
 * пополам, как при делении: он сжимается в окно в углу, а весь кадр
 * отдаётся показу — видео, фото или витрине сайта. Так подают то, что
 * должно быть крупным: сайт в телефоне, панораму завода, ролик с экскурсии.
 *
 * ——— Как движется ———
 *
 * За `transitionFrames` кадр спикера плавно превращается в окно: размер,
 * положение, скругление и белая рамка меняются одним движением, без
 * исчезновения. Внутри окна — не весь кадр уменьшенный, а крупный план:
 * лицо встаёт в центр окна (`focusX`, `focusY`), иначе в маленьком окне
 * голова была бы с ноготь. Обратно — тем же движением.
 *
 * Окно стоит над строкой субтитров: они идут по низу кадра и должны
 * читаться и во время показа.
 */
export const pipSegmentSchema = z.object({
  fromFrame: z.number().int().min(0),
  toFrame: z.number().int().min(1),
  items: z.array(mediaItemSchema).describe("Что показывать на весь экран"),
  corner: z
    .enum(["bottom-right", "bottom-left", "top-right", "top-left"])
    .optional()
    .describe("Угол окна спикера; по умолчанию правый нижний"),
});

export const pipScreenSchema = z.object({
  pips: z.array(pipSegmentSchema).describe("Отрезки «картинки в картинке»"),
  windowWidth: z
    .number()
    .min(0.2)
    .max(0.6)
    .describe("Ширина окна, доля ширины кадра"),
  windowAspect: z.number().min(0.5).max(1.5).describe("Высота окна к ширине"),
  crop: z
    .number()
    .min(0.3)
    .max(1)
    .describe("Какую долю ширины кадра спикера видно в окне"),
  focusX: z.number().min(0).max(1).describe("Где лицо по ширине"),
  focusY: z.number().min(0).max(1).describe("Где глаза по высоте"),
  bottomFraction: z
    .number()
    .min(0)
    .max(0.5)
    .describe("Нижний край окна от низа кадра"),
  transitionFrames: z
    .number()
    .int()
    .min(1)
    .describe("Кадры на сжатие и возврат"),
  sideMargin: z
    .number()
    .min(0)
    .max(0.3)
    .describe(
      "Отступ окна от бокового края, доля ширины; в Reels справа кнопки",
    ),
});

export type PipScreenParams = z.infer<typeof pipScreenSchema>;
export type PipScreenProps = Partial<PipScreenParams> & {
  readonly children: React.ReactNode;
};

export const pipScreenDefaults: PipScreenParams = {
  pips: [],
  windowWidth: 0.36,
  windowAspect: 1.3,
  crop: 0.62,
  focusX: 0.5,
  focusY: 0.42,
  // Над субтитрами сторис: они стоят на 0,16 от низа и занимают строку.
  bottomFraction: 0.23,
  transitionFrames: 16,
  sideMargin: 0.05,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const PipScreen: React.FC<PipScreenProps> = ({
  children,
  ...params
}) => {
  const {
    pips,
    windowWidth,
    windowAspect,
    crop,
    focusX,
    focusY,
    bottomFraction,
    transitionFrames,
    sideMargin,
  } = withDefaults(pipScreenDefaults, params);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const active = pips.find((p) => frame >= p.fromFrame && frame < p.toFrame);
  const ease = {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const t = active
    ? Math.min(
        interpolate(
          frame,
          [active.fromFrame, active.fromFrame + transitionFrames],
          [0, 1],
          ease,
        ),
        interpolate(
          frame,
          [active.toFrame - transitionFrames, active.toFrame],
          [1, 0],
          ease,
        ),
      )
    : 0;

  // ——— Окно в углу ———
  const winW = width * windowWidth;
  const winH = winW * windowAspect;
  const margin = width * sideMargin;
  const corner = active?.corner ?? "bottom-right";
  const winX = corner.endsWith("right") ? width - margin - winW : margin;
  const winY = corner.startsWith("bottom")
    ? height * (1 - bottomFraction) - winH
    : height * 0.22;

  // Масштаб кадра спикера в окне: видна доля crop ширины — крупный план.
  const k = winW / (width * crop);
  // Сдвиг так, чтобы лицо встало в центр окна, глаза — на 40% высоты.
  const offX = winW / 2 - focusX * width * k;
  const offY = winH * 0.4 - focusY * height * k;

  const box = {
    x: lerp(0, winX, t),
    y: lerp(0, winY, t),
    w: lerp(width, winW, t),
    h: lerp(height, winH, t),
  };
  const scale = lerp(1, k, t);
  const inner = { x: lerp(0, offX, t), y: lerp(0, offY, t) };

  return (
    <AbsoluteFill>
      {pips.map((p) => (
        <Sequence
          key={`pip-${p.fromFrame}`}
          from={p.fromFrame}
          durationInFrames={p.toFrame - p.fromFrame}
          layout="none"
        >
          <ShowcaseLayer items={p.items} variant="full" />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          overflow: "hidden",
          borderRadius: lerp(0, winW * 0.08, t),
          boxShadow:
            t > 0
              ? `0 0 0 ${lerp(0, 6, t)}px #fff, 0 24px 60px rgba(0,0,0,${0.55 * t})`
              : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: inner.x,
            top: inner.y,
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

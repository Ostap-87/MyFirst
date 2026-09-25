import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { mediaItemSchema, withDefaults } from "./media";
import { ShowcaseLayer } from "./showcase";

/**
 * CutoutStage — спикер без фона поверх показа.
 *
 * Фон за спикером плавно сменяется показом — фото, видео, витриной сайта,
 * — а сам спикер, уже вырезанный, уменьшается и опускается к низу кадра
 * и продолжает говорить. Верх кадра отдаётся показу, лицо остаётся в
 * кадре над строкой субтитров. Приём телевизионный: ведущий «стоит» перед
 * экраном, а не сидит в окошке.
 *
 * ——— Откуда вырезка ———
 *
 * `cutoutSrc` — та же съёмка без фона: прозрачный WebM той же длины,
 * кадр в кадр. Готовится командой `npm run head -- --cutout <ролик>`
 * (нейросеть локально, около 0,7 с на кадр на процессоре). Вырезка
 * идёт синхронно с основной съёмкой: в отрезке она начинается с того же
 * кадра, что и ролик, — иначе губы разъедутся со звуком.
 *
 * ——— Как движется ———
 *
 * Сначала съёмка растворяется в вырезку поверх показа (фон «исчезает»),
 * одновременно фигура уменьшается к низу кадра — одно движение за
 * `transitionFrames`. Обратно — тем же движением.
 */
export const cutoutSegmentSchema = z.object({
  fromFrame: z.number().int().min(0),
  toFrame: z.number().int().min(1),
  items: z.array(mediaItemSchema).describe("Что показывать за спикером"),
});

export const cutoutStageSchema = z.object({
  cutoutSrc: z.string().describe("Прозрачный WebM спикера внутри public"),
  stages: z
    .array(cutoutSegmentSchema)
    .describe("Отрезки, когда спикер стоит перед показом"),
  scale: z.number().min(0.3).max(1).describe("Во сколько раз уменьшить фигуру"),
  drop: z
    .number()
    .min(0)
    .max(0.4)
    .describe("На сколько опустить, доля высоты кадра"),
  transitionFrames: z.number().int().min(1).describe("Кадры на уход и возврат"),
});

export type CutoutStageParams = z.infer<typeof cutoutStageSchema>;
export type CutoutStageProps = Partial<CutoutStageParams> & {
  readonly children: React.ReactNode;
};

export const cutoutStageDefaults: CutoutStageParams = {
  cutoutSrc: "",
  stages: [],
  // Лицо встаёт примерно на 0,65 высоты — над субтитрами (0,8), верх
  // кадра до 0,55 свободен под показ.
  scale: 0.7,
  drop: 0.08,
  transitionFrames: 16,
};

export const CutoutStage: React.FC<CutoutStageProps> = ({
  children,
  ...params
}) => {
  const { cutoutSrc, stages, scale, drop, transitionFrames } = withDefaults(
    cutoutStageDefaults,
    params,
  );
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const active = cutoutSrc
    ? stages.find((s) => frame >= s.fromFrame && frame < s.toFrame)
    : undefined;
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
  // Фон пропадает быстрее, чем фигура доезжает: к середине движения
  // зритель уже видит показ, а не обрезки кафе вокруг уменьшенной фигуры.
  const bgGone = Math.min(1, t * 1.8);
  const k = 1 - (1 - scale) * t;

  return (
    <AbsoluteFill>
      {/* Обычная съёмка — пока фон не ушёл. */}
      <AbsoluteFill style={{ opacity: 1 - bgGone }}>{children}</AbsoluteFill>

      {cutoutSrc
        ? stages.map((s) => (
            <Sequence
              key={`cut-${s.fromFrame}`}
              from={s.fromFrame}
              durationInFrames={s.toFrame - s.fromFrame}
              layout="none"
            >
              <AbsoluteFill style={{ opacity: bgGone }}>
                <ShowcaseLayer items={s.items} variant="full" shade={false} />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  transform: `translateY(${drop * height * t}px) scale(${k})`,
                  transformOrigin: "50% 100%",
                  // Мягкая тень отделяет фигуру от показа.
                  filter: `drop-shadow(0 20px 40px rgba(0,0,0,${0.5 * t}))`,
                }}
              >
                <OffthreadVideo
                  src={staticFile(cutoutSrc)}
                  transparent
                  muted
                  trimBefore={s.fromFrame}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AbsoluteFill>
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};

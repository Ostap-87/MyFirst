import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Media, mediaItemSchema, withDefaults } from "./media";

/**
 * SplitScreen — плавное деление экрана: спикер сверху, показ снизу.
 *
 * Спикер продолжает говорить, но уезжает в верхнюю часть кадра, а снизу
 * открывается фото или видео того, о чём он говорит. В отличие от B-roll
 * на весь кадр лицо не пропадает: зритель видит и человека, и предмет.
 *
 * ——— Как движется ———
 *
 * Шов едет снизу вверх от края кадра до `seam` (по умолчанию середина) за
 * `transitionFrames` с плавным торможением и так же возвращается. Спикер
 * при этом не сжимается, а кадрируется: окно над швом показывает его
 * лицо — центр кадрирования стоит на глазах (`focusY`), поэтому голова не
 * уезжает за верх и не режется по подбородку.
 *
 * Шов мягкий: нижний край спикера растворяется в показе на `featherPx` —
 * без видимой линии, как в шаблоне SplitGradient из reels-templates. Для
 * жёсткого стыка — `feather: 0` и `line: true`.
 *
 * ——— Как подключать ———
 *
 * Эффект оборачивает слой спикера целиком на всё время ролика — только так
 * он может его подвинуть. Показы задаются отрезками `splits`, между ними
 * спикер во весь кадр.
 */
export const splitSegmentSchema = z.object({
  fromFrame: z.number().int().min(0),
  toFrame: z.number().int().min(1),
  items: z.array(mediaItemSchema).describe("Что показывать снизу; несколько — сменяются"),
});

export const splitScreenSchema = z.object({
  splits: z.array(splitSegmentSchema).describe("Отрезки деления, не пересекаются"),
  seam: z.number().min(0.3).max(0.7).describe("Где шов, доля высоты кадра"),
  focusY: z.number().min(0).max(1).describe("Где глаза спикера — центр кадрирования"),
  transitionFrames: z.number().int().min(1).describe("Сколько кадров едет шов"),
  featherPx: z.number().min(0).max(300).describe("Мягкость шва в пикселях; 0 — жёсткий"),
  line: z.boolean().describe("Светлая линия по шву"),
  eyesAt: z
    .number()
    .min(0.2)
    .max(0.45)
    .describe("Куда встают глаза при делении, доля высоты кадра"),
});

export type SplitScreenParams = z.infer<typeof splitScreenSchema>;
export type SplitScreenProps = Partial<SplitScreenParams> & {
  readonly children: React.ReactNode;
};

export const splitScreenDefaults: SplitScreenParams = {
  splits: [],
  seam: 0.52,
  focusY: 0.42,
  transitionFrames: 14,
  featherPx: 110,
  line: false,
  // Ниже логотипа (0,135–0,2), но так, чтобы подбородок остался над швом.
  eyesAt: 0.31,
};

/** Нижняя половина: показы сменяются наплывом, внутри — медленный наезд. */
const Showcase: React.FC<{
  readonly items: { src: string; caption?: string }[];
  readonly top: number;
}> = ({ items, top }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const per = Math.max(1, Math.floor(durationInFrames / items.length));
  const fade = 10;
  return (
    <AbsoluteFill style={{ top, height: "auto", overflow: "hidden", backgroundColor: "#000" }}>
      {items.map((item, i) => {
        const from = i * per;
        const len = i === items.length - 1 ? durationInFrames - from : per + fade;
        const local = frame - from;
        const opacity = i === 0 ? 1 : interpolate(local, [0, fade], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(local, [0, len], [1.02, 1.1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <Sequence key={`${item.src}-${i}`} from={from} durationInFrames={len} layout="none">
            <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
              <Media src={item.src} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {/* Затемнение снизу: субтитры белые, и на светлом фото — скриншоте
          сайта — они пропадали. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.66) 45%, rgba(0,0,0,0) 78%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const SplitScreen: React.FC<SplitScreenProps> = ({ children, ...params }) => {
  const { splits, seam, focusY, transitionFrames, featherPx, line, eyesAt } = withDefaults(
    splitScreenDefaults,
    params,
  );
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const active = splits.find((s) => frame >= s.fromFrame && frame < s.toFrame);
  const ease = {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;

  // Насколько экран «раскрыт»: 0 — спикер во весь кадр, 1 — шов на месте.
  const open = active
    ? Math.min(
        interpolate(frame, [active.fromFrame, active.fromFrame + transitionFrames], [0, 1], ease),
        interpolate(frame, [active.toFrame - transitionFrames, active.toFrame], [1, 0], ease),
      )
    : 0;
  // Доля кадра над швом: 1 — спикер во весь кадр.
  const ratio = 1 - (1 - seam) * open;
  const seamPx = height * ratio;
  const feather = featherPx * open;

  // Кадрирование: видео уезжает вверх, пока глаза не встанут на eyesAt.
  // Масштаб не меняется — иначе по бокам открылись бы пустые поля.
  // Первая версия ставила глаза на ту же долю окна, что и кадра, и лоб
  // уходил под логотип.
  const box = Math.min(height, seamPx + feather);
  const shift = Math.max(
    0,
    Math.min((focusY - eyesAt) * height * open, height - box),
  );

  return (
    <AbsoluteFill>
      {splits.map((s) => (
        <Sequence
          key={`split-${s.fromFrame}`}
          from={s.fromFrame}
          durationInFrames={s.toFrame - s.fromFrame}
          layout="none"
        >
          <Showcase items={s.items} top={height * seam} />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: box,
          overflow: "hidden",
          WebkitMaskImage:
            feather > 0
              ? `linear-gradient(to bottom, #000 ${box - feather}px, transparent ${box}px)`
              : undefined,
          maskImage:
            feather > 0
              ? `linear-gradient(to bottom, #000 ${box - feather}px, transparent ${box}px)`
              : undefined,
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: -shift, height }}>
          {children}
        </div>
      </div>
      {line && active ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: seamPx - 3,
            height: 6,
            backgroundColor: "rgba(255,255,255,0.92)",
            boxShadow: "0 0 18px rgba(0,0,0,0.5)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

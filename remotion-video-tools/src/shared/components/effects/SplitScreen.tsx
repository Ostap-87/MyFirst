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
 * SplitScreen — плавное деление экрана: спикер в одной части, показ в другой.
 *
 * Показ открывается снизу (`side: "bottom"`, по умолчанию) или сбоку
 * (`"left"` / `"right"`). Сбоку спикер остаётся в своей половине по всей
 * высоте, лицо встаёт по центру этой половины — в вертикали это узкая
 * колонка, в которую как раз помещается телефон с сайтом или вертикальное
 * видео.
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
  items: z
    .array(mediaItemSchema)
    .describe("Что показывать; несколько — сменяются"),
  side: z
    .enum(["bottom", "left", "right"])
    .optional()
    .describe("Откуда открывается показ; по умолчанию снизу"),
});

export const splitScreenSchema = z.object({
  splits: z
    .array(splitSegmentSchema)
    .describe("Отрезки деления, не пересекаются"),
  seam: z.number().min(0.3).max(0.7).describe("Где шов, доля высоты кадра"),
  focusY: z
    .number()
    .min(0)
    .max(1)
    .describe("Где глаза спикера — центр кадрирования"),
  focusX: z
    .number()
    .min(0)
    .max(1)
    .describe("Где лицо по ширине — для бокового деления"),
  transitionFrames: z.number().int().min(1).describe("Сколько кадров едет шов"),
  featherPx: z
    .number()
    .min(0)
    .max(300)
    .describe("Мягкость шва в пикселях; 0 — жёсткий"),
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
  focusX: 0.5,
  transitionFrames: 14,
  featherPx: 110,
  line: false,
  // Ниже логотипа (0,135–0,2), но так, чтобы подбородок остался над швом.
  eyesAt: 0.31,
};

export const SplitScreen: React.FC<SplitScreenProps> = ({
  children,
  ...params
}) => {
  const {
    splits,
    seam,
    focusY,
    focusX,
    transitionFrames,
    featherPx,
    line,
    eyesAt,
  } = withDefaults(splitScreenDefaults, params);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const active = splits.find((s) => frame >= s.fromFrame && frame < s.toFrame);
  const side = active?.side ?? "bottom";
  const ease = {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;

  // Насколько экран «раскрыт»: 0 — спикер во весь кадр, 1 — шов на месте.
  const open = active
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
  // Доля кадра за спикером: 1 — спикер во весь кадр.
  const ratio = 1 - (1 - seam) * open;
  const feather = featherPx * open;
  const vertical = side === "bottom";

  // ——— Окно спикера ———
  //
  // Снизу: видео уезжает вверх, пока глаза не встанут на eyesAt. Масштаб
  // не меняется — иначе по бокам открылись бы пустые поля. Первая версия
  // ставила глаза на ту же долю окна, что и кадра, и лоб уходил под логотип.
  //
  // Сбоку: окно — колонка во всю высоту, видео сдвигается так, чтобы лицо
  // встало по центру колонки.
  const extent = vertical ? height : width;
  const box = Math.min(extent, extent * ratio + feather);
  const shift = Math.max(
    0,
    Math.min((focusY - eyesAt) * height * open, height - box),
  );
  // Сбоку: сдвиг видео внутри колонки, чтобы лицо встало в её центр, но
  // края видео не заходили внутрь колонки. Формула одна для обеих сторон:
  // сдвиг считается от левого края самой колонки.
  const shiftX = Math.min(0, Math.max(box - width, box / 2 - focusX * width));

  const maskDir =
    side === "bottom" ? "to bottom" : side === "right" ? "to right" : "to left";
  const mask =
    feather > 0
      ? `linear-gradient(${maskDir}, #000 ${box - feather}px, transparent ${box}px)`
      : undefined;

  const boxStyle: React.CSSProperties = vertical
    ? { left: 0, top: 0, width: "100%", height: box }
    : side === "right"
      ? { left: 0, top: 0, height: "100%", width: box }
      : { right: 0, top: 0, height: "100%", width: box };
  const innerStyle: React.CSSProperties = vertical
    ? { left: 0, right: 0, top: -shift, height }
    : { top: 0, bottom: 0, left: shiftX, width };

  return (
    <AbsoluteFill>
      {splits.map((s) => (
        <Sequence
          key={`split-${s.fromFrame}`}
          from={s.fromFrame}
          durationInFrames={s.toFrame - s.fromFrame}
          layout="none"
        >
          <ShowcaseLayer
            items={s.items}
            shade={(s.side ?? "bottom") === "bottom" ? true : "low"}
            style={
              (s.side ?? "bottom") === "bottom"
                ? { top: height * seam, height: "auto" }
                : (s.side ?? "bottom") === "right"
                  ? { left: width * seam, width: "auto" }
                  : { right: width * seam, width: "auto" }
            }
          />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          overflow: "hidden",
          WebkitMaskImage: mask,
          maskImage: mask,
          ...boxStyle,
        }}
      >
        <div style={{ position: "absolute", ...innerStyle }}>{children}</div>
      </div>
      {line && active ? (
        <div
          style={{
            position: "absolute",
            backgroundColor: "rgba(255,255,255,0.92)",
            boxShadow: "0 0 18px rgba(0,0,0,0.5)",
            ...(vertical
              ? { left: 0, right: 0, top: height * ratio - 3, height: 6 }
              : side === "right"
                ? { top: 0, bottom: 0, left: width * ratio - 3, width: 6 }
                : { top: 0, bottom: 0, right: width * ratio - 3, width: 6 }),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";
import { fontFamily } from "../../fonts";

/**
 * BigNumber — крупная цифра пункта: резко выскакивает на «во-первых»,
 * держится до начала объяснения и исчезает.
 *
 * Перечисление на слух теряется: к «в-пятых» зритель не помнит, сколько
 * было. Цифра на полкадра за долю секунды отмечает новый пункт, а уходит
 * раньше, чем начинается суть, — объяснение идёт уже по чистому кадру.
 *
 * ——— Как движется ———
 *
 * Вход за ~5 кадров: масштаб 1,9 → 1 жёсткой пружиной, размытие 12 → 0 px,
 * прозрачность 0 → 1 — «удар» в кадр. Держится с лёгким дыханием 1 → 1,04.
 * Выход за `exitFrames`: масштаб до 1,25 и прозрачность в ноль — цифра
 * «проходит сквозь» зрителя, а не сползает.
 */
export const bigNumberSchema = z.object({
  text: z.string().describe("Что показать: «1», «2»…"),
  label: z.string().describe("Подпись под цифрой мелко, например «из 7»; пусто — без неё"),
  color: z.string().describe("Цвет цифры"),
  x: z.number().min(0).max(1).describe("Центр по ширине, доля кадра"),
  y: z.number().min(0).max(1).describe("Центр по высоте, доля кадра"),
  sizeFraction: z.number().min(0.1).max(1).describe("Высота цифры, доля ширины кадра"),
  exitFrames: z.number().int().min(1).describe("Уход в кадрах"),
});

export type BigNumberParams = z.infer<typeof bigNumberSchema>;
export type BigNumberProps = Partial<BigNumberParams>;

export const bigNumberDefaults: BigNumberParams = {
  text: "1",
  label: "",
  color: "#2563eb",
  x: 0.5,
  y: 0.66,
  sizeFraction: 0.5,
  exitFrames: 6,
};

export const BigNumber: React.FC<BigNumberProps> = (params) => {
  const p = withDefaults(bigNumberDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const hit = spring({ frame, fps, config: { damping: 14, mass: 0.5, stiffness: 320 } });
  const exit = interpolate(
    frame,
    [durationInFrames - p.exitFrames, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) },
  );
  const breathe = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  const scale = interpolate(hit, [0, 1], [1.9, 1]) * breathe * (1 + 0.25 * exit);
  const blur = interpolate(hit, [0, 1], [12, 0]);
  const opacity = Math.min(1, hit * 1.6) * (1 - exit);
  const size = width * p.sizeFraction;

  return (
    <div
      style={{
        position: "absolute",
        left: width * p.x,
        top: height * p.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: `blur(${blur}px)`,
        textAlign: "center",
        lineHeight: 1,
      }}
    >
      <div
        style={{
          fontFamily: fontFamily("Unbounded"),
          fontWeight: 800,
          fontSize: size,
          color: p.color,
          WebkitTextStroke: `${size * 0.02}px #fff`,
          textShadow: `0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,0.55)`,
        }}
      >
        {p.text}
      </div>
      {p.label ? (
        <div
          style={{
            fontFamily: fontFamily("Inter"),
            fontWeight: 700,
            fontSize: size * 0.14,
            color: "#fff",
            marginTop: size * 0.02,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          {p.label}
        </div>
      ) : null}
    </div>
  );
};

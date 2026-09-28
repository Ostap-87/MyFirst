import {
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
 * FlagWave — флаг страны развевается рядом со спикером: выпрыгивает на
 * названии страны, машет полосами, уходит.
 *
 * Сделано для «от Китая до Саудовской Аравии»: страна показывается прямо
 * в кадре, рядом с головой, без отдельного экрана — речь не прерывается.
 *
 * ——— Как движется ———
 *
 * Вход: пружина от древка (левый край) — масштаб 0,4 → 1 с лёгким
 * перелётом, за ~10 кадров. Волна: полотно порезано на вертикальные
 * полосы, каждая сдвигается по вертикали синусом; у древка амплитуда
 * ноль, к свободному краю растёт — так ведёт себя ткань, а не картинка.
 * Полосы на гребне светлее, во впадине темнее — без этого волна читается
 * как дрожь. Выход: за `exitFrames` до конца сжимается к древку и гаснет.
 */
export const flagWaveSchema = z.object({
  src: z.string().describe("Картинка флага внутри public (SVG или PNG, 3:2)"),
  x: z.number().min(0).max(1).describe("Центр флага по ширине кадра, доля"),
  y: z.number().min(0).max(1).describe("Центр флага по высоте кадра, доля"),
  widthFraction: z
    .number()
    .min(0.05)
    .max(0.8)
    .describe("Ширина флага, доля кадра"),
  strips: z
    .number()
    .int()
    .min(4)
    .max(80)
    .describe("Полос в полотне: больше — глаже волна"),
  amplitude: z
    .number()
    .min(0)
    .max(0.2)
    .describe("Размах волны, доля ширины флага"),
  wavesPerSecond: z.number().min(0).describe("Скорость волны"),
  exitFrames: z.number().int().min(1).describe("Уход в кадрах"),
});

export type FlagWaveParams = z.infer<typeof flagWaveSchema>;
export type FlagWaveProps = Partial<FlagWaveParams>;

export const flagWaveDefaults: FlagWaveParams = {
  src: "",
  x: 0.25,
  y: 0.36,
  widthFraction: 0.3,
  strips: 36,
  amplitude: 0.045,
  wavesPerSecond: 1.3,
  exitFrames: 8,
};

export const FlagWave: React.FC<FlagWaveProps> = (params) => {
  const p = withDefaults(flagWaveDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  if (!p.src) return null;

  const W = width * p.widthFraction;
  const H = (W * 2) / 3;
  const enter = spring({
    frame,
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 180 },
  });
  const exit = interpolate(
    frame,
    [durationInFrames - p.exitFrames, durationInFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    },
  );
  const scale = interpolate(enter, [0, 1], [0.4, 1]) * (1 - 0.5 * exit);
  const opacity = Math.min(1, enter * 2) * (1 - exit);
  const phase = (frame / fps) * p.wavesPerSecond * Math.PI * 2;
  const stripW = W / p.strips;
  const amp = W * p.amplitude;

  return (
    <div
      style={{
        position: "absolute",
        left: width * p.x - W / 2,
        top: height * p.y - H / 2,
        width: W,
        height: H,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "0% 50%",
        filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.45))",
      }}
    >
      {Array.from({ length: p.strips }, (_, i) => {
        const k = i / (p.strips - 1);
        const wave = Math.sin(phase - k * Math.PI * 2.2);
        const dy = wave * amp * k;
        const shade = 1 + 0.16 * Math.cos(phase - k * Math.PI * 2.2) * k;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * stripW,
              top: 0,
              // +1 px: без нахлёста между полосами видны волосяные щели.
              width: stripW + 1,
              height: H,
              overflow: "hidden",
              transform: `translateY(${dy}px)`,
              filter: `brightness(${shade})`,
            }}
          >
            <Img
              src={staticFile(p.src)}
              // maxWidth: none — иначе общий img { max-width: 100% } ужимает
              // полотно до ширины полосы, и видна только первая.
              style={{
                position: "absolute",
                left: -i * stripW,
                top: 0,
                width: W,
                height: H,
                maxWidth: "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Media, mediaItemSchema, withDefaults } from "./media";

/**
 * PopWindows — всплывающие окна вокруг спикера.
 *
 * Визуальный «шум»: пока звучит «новости, выставки, чужие подкасты — все
 * показывают одно и то же», вокруг лица по очереди выскакивают маленькие
 * окна. Потом разом схлопываются, и следующая фраза звучит на чистом
 * кадре как вывод.
 *
 * Окна стоят по заранее заданным гнёздам вокруг лица, а не случайно:
 * случайная раскладка то закрывает глаза, то сбивается в угол. Гнёзда
 * свои для вертикали и горизонтали — в вертикали лицо занимает середину
 * по высоте, свободны углы сверху и снизу.
 */
export const popWindowsSchema = z.object({
  items: z.array(mediaItemSchema).describe("Окна по порядку появления, до шести"),
  stepFrames: z.number().int().min(1).describe("Шаг между окнами в кадрах"),
  sizeFraction: z.number().min(0.1).max(0.5).describe("Ширина окна, доля ширины кадра"),
  exitFrames: z.number().int().min(1).describe("За сколько кадров окна схлопываются"),
});

export type PopWindowsParams = z.infer<typeof popWindowsSchema>;
export type PopWindowsProps = Partial<PopWindowsParams>;

export const popWindowsDefaults: PopWindowsParams = {
  items: [],
  stepFrames: 6,
  sizeFraction: 0.3,
  exitFrames: 8,
};

/** Центры гнёзд в долях кадра, по порядку заполнения. */
// Вертикаль: лицо занимает середину кадра по ширине и высоту от 0,3 до
// 0,75 — свободны только углы: над головой под логотипом и на плечах над
// субтитрами. Пятое и шестое окно встают по бокам у ушей — запасные.
const SLOTS_VERTICAL = [
  [0.2, 0.29],
  [0.8, 0.3],
  [0.19, 0.71],
  [0.81, 0.72],
  [0.13, 0.5],
  [0.87, 0.5],
];
const SLOTS_LANDSCAPE = [
  [0.16, 0.26],
  [0.84, 0.3],
  [0.14, 0.72],
  [0.86, 0.7],
  [0.3, 0.14],
  [0.7, 0.86],
];

export const PopWindows: React.FC<PopWindowsProps> = (params) => {
  const { items, stepFrames, sizeFraction, exitFrames } = withDefaults(popWindowsDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const slots = height > width ? SLOTS_VERTICAL : SLOTS_LANDSCAPE;
  const w = width * sizeFraction;
  const h = w * 0.62;

  const exit = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {items.slice(0, slots.length).map((item, i) => {
        if (frame < i * stepFrames) return null;
        // Пружина с перелётом: окно «выскакивает», а не проявляется.
        const pop = spring({
          frame: frame - i * stepFrames,
          fps,
          config: { damping: 11, mass: 0.6, stiffness: 170 },
        });
        const [cx, cy] = slots[i];
        const rot = (i % 2 === 0 ? -1 : 1) * 3;
        return (
          <div
            key={`${item.src}-${i}`}
            style={{
              position: "absolute",
              left: cx * width - w / 2,
              top: cy * height - h / 2,
              width: w,
              height: h,
              transform: `scale(${pop * exit}) rotate(${rot}deg)`,
              borderRadius: w * 0.06,
              border: `${Math.max(3, w * 0.012)}px solid #fff`,
              boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
              overflow: "hidden",
              backgroundColor: "#111",
            }}
          >
            <Media src={item.src} />
          </div>
        );
      })}
    </>
  );
};

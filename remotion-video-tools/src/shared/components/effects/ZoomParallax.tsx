import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { z } from "zod";

/**
 * ZoomParallax — плавное приближение фото с параллаксом текста поверх.
 *
 * Кадр состоит из двух слоёв: фото медленно наезжает (scale zoomFrom -> zoomTo)
 * и одновременно едет по Y, а текст поверх движется в противоположную сторону
 * с меньшей амплитудой. Разница скоростей и даёт ощущение глубины.
 *
 * Если src пустой, вместо фото рисуется нейтральная заглушка — так эффект
 * можно проверить в Shared-EffectsLab, не подкладывая ассет.
 */
export const zoomParallaxSchema = z.object({
  src: z
    .string()
    .describe(
      'Путь к фото: staticFile("brand/photo.jpg") или URL. Пусто — заглушка',
    ),
  zoomFrom: z
    .number()
    .min(0.1)
    .describe("Масштаб фото в начале (1 — без увеличения)"),
  zoomTo: z.number().min(0.1).describe("Масштаб фото в конце"),
  driftY: z
    .number()
    .describe("На сколько пикселей фото уезжает по вертикали за сцену"),
  parallaxStrength: z
    .number()
    .describe("Сдвиг текстового слоя в пикселях — против движения фото"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("За сколько кадров проходит весь наезд"),
  overlayOpacity: z
    .number()
    .min(0)
    .max(1)
    .describe("Плотность тёмной подложки под текстом, 0 — без неё"),
});

export type ZoomParallaxParams = z.infer<typeof zoomParallaxSchema>;

/** Любой параметр можно опустить — возьмётся значение из zoomParallaxDefaults. */
export type ZoomParallaxProps = Partial<ZoomParallaxParams> & {
  readonly children?: React.ReactNode;
};

export const zoomParallaxDefaults: ZoomParallaxParams = {
  src: "",
  zoomFrom: 1,
  zoomTo: 1.18,
  driftY: -40,
  parallaxStrength: 60,
  durationInFrames: 150,
  overlayOpacity: 0.35,
};

export const ZoomParallax: React.FC<ZoomParallaxProps> = ({
  children,
  ...params
}) => {
  const {
    src,
    zoomFrom,
    zoomTo,
    driftY,
    parallaxStrength,
    durationInFrames,
    overlayOpacity,
  } = { ...zoomParallaxDefaults, ...params };
  const frame = useCurrentFrame();

  // Линейная кривая с лёгким торможением: наезд должен ощущаться ровным,
  // без ускорения в начале, иначе фото «дёргается» на первых кадрах.
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(progress, [0, 1], [zoomFrom, zoomTo]);
  const imageShift = interpolate(progress, [0, 1], [0, driftY]);
  const textShift = interpolate(progress, [0, 1], [0, -parallaxStrength]);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translateY(${imageShift}px)`,
        }}
      >
        {src ? (
          <Img
            src={src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(135deg, #3a3a44 0%, #6b6b76 55%, #23232a 100%)",
            }}
          />
        )}
      </AbsoluteFill>

      {overlayOpacity > 0 ? (
        <AbsoluteFill
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      ) : null}

      <AbsoluteFill style={{ transform: `translateY(${textShift}px)` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

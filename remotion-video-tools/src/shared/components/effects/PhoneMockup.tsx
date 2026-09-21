import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * PhoneMockup — скриншот в рамке телефона поверх видео.
 *
 * Доказательство в разговорном ролике: цифры из статистики показывают
 * скриншотом, а не пересказывают. Рамка нужна, чтобы вставка читалась как
 * «экран телефона», а не как случайная картинка поверх кадра.
 *
 * Замеры по референсу: вставка занимает около 55% высоты кадра, проявляется
 * за 7–8 кадров (0.25 с) — почти чистый fade с едва заметным наездом,
 * без выезда со стороны.
 */
export const phoneMockupSchema = z.object({
  src: z.string().describe('Скриншот: staticFile("brand/stats.png") или URL'),
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров появиться"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длительность появления в кадрах"),
  heightFraction: z
    .number()
    .min(0.1)
    .max(1)
    .describe("Высота вставки долей высоты кадра"),
  tilt: z.number().describe("Наклон рамки в градусах: 0 — строго вертикально"),
});

export type PhoneMockupParams = z.infer<typeof phoneMockupSchema>;

/** Любой параметр можно опустить — возьмётся значение из phoneMockupDefaults. */
export type PhoneMockupProps = Partial<PhoneMockupParams>;

export const phoneMockupDefaults: PhoneMockupParams = {
  src: "",
  delayInFrames: 0,
  durationInFrames: 8,
  heightFraction: 0.55,
  tilt: 0,
};

export const PhoneMockup: React.FC<PhoneMockupProps> = (params) => {
  const { src, delayInFrames, durationInFrames, heightFraction, tilt } = {
    ...phoneMockupDefaults,
    ...params,
  };
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const progress = interpolate(
    frame - delayInFrames,
    [0, durationInFrames],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const frameHeight = Math.round(height * heightFraction);
  const frameWidth = Math.round(frameHeight * 0.48);
  const radius = Math.round(frameWidth * 0.12);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity: progress,
          transform: `scale(${interpolate(progress, [0, 1], [0.96, 1])}) rotate(${tilt}deg)`,
          width: frameWidth,
          height: frameHeight,
          borderRadius: radius,
          border: `${Math.max(3, Math.round(frameWidth * 0.018))}px solid #1c1c1e`,
          backgroundColor: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        {src ? (
          <Img
            src={src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          // Заглушка, чтобы компонент можно было проверить без скриншота.
          <AbsoluteFill
            style={{
              background: "linear-gradient(160deg, #f4f4f6 0%, #d9d9de 100%)",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * StepNumber — крупный полупрозрачный номер пункта вверху кадра.
 *
 * Приём из разговорных Reels: говорящий перечисляет тезисы, и номер висит
 * над ним весь фрагмент. Полупрозрачность обязательна — цифра во всю ширину
 * кадра в полную силу перетягивает внимание с лица и субтитров.
 *
 * Замеры по референсу: цифра занимает около 6–7% высоты кадра, появляется
 * за 6–8 кадров (0.2–0.27 с) с лёгким увеличением, держится до конца сцены.
 */
export const stepNumberSchema = z.object({
  value: z
    .union([z.number(), z.string()])
    .describe("Номер пункта: 1, 2, 3 или «01»"),
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров появиться"),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .describe("Непрозрачность цифры: 0.5–0.8 — рабочий диапазон"),
  color: z.string().describe("Цвет цифры"),
  sizeFraction: z.number().min(0.01).describe("Кегль долей ширины кадра"),
});

export type StepNumberParams = z.infer<typeof stepNumberSchema>;

/** Любой параметр можно опустить — возьмётся значение из stepNumberDefaults. */
export type StepNumberProps = Partial<StepNumberParams> & {
  readonly fontFamily?: string;
};

export const stepNumberDefaults: StepNumberParams = {
  value: 1,
  delayInFrames: 0,
  opacity: 0.7,
  color: "#ffffff",
  sizeFraction: 0.13,
};

export const StepNumber: React.FC<StepNumberProps> = ({
  fontFamily,
  ...params
}) => {
  const { value, delayInFrames, opacity, color, sizeFraction } = {
    ...stepNumberDefaults,
    ...params,
  };
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const progress = spring({
    frame: frame - delayInFrames,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  // Появление за 7 кадров, как в референсе: быстрый fade плюс наезд с 1.15.
  const fade = interpolate(frame - delayInFrames, [0, 7], [0, opacity], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        textAlign: "center",
        opacity: fade,
        transform: `scale(${interpolate(progress, [0, 1], [1.15, 1])})`,
        fontFamily,
        fontWeight: 900,
        fontSize: Math.round(width * sizeFraction),
        lineHeight: 1,
        color,
        textShadow: "0 4px 24px rgba(0,0,0,0.45)",
      }}
    >
      {value}
    </div>
  );
};

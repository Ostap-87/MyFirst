import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FadeIn } from "../../shared/components/effects";
import { MetricCard } from "../../shared/components/MetricCard";
import { fontFamily } from "../../shared/fonts";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-Stats — сцена с тремя метриками: три цифры, отсчитывающиеся каскадом.
 *
 * Бренд GlobalTechTour: цвета и шрифты только из ../theme (CLAUDE.md, правило 1).
 * Каскад по 12 кадров: цифры стартуют по очереди, иначе три одновременных
 * счётчика спорят за внимание и не читается ни один.
 */
const metricSchema = z.object({
  value: z.number().describe("Значение метрики"),
  label: z.string().describe("Подпись под цифрой"),
  prefix: z.string().describe("Текст перед числом"),
  suffix: z.string().describe("Текст после числа"),
  compact: z.boolean().describe("Сокращать до «млн» / «млрд»"),
});

export const gttStatsSchema = z.object({
  title: z.string().describe("Заголовок сцены"),
  metrics: z.array(metricSchema).describe("Метрики: показываем не больше трёх"),
});

export type GTTStatsProps = z.infer<typeof gttStatsSchema>;

export const gttStatsDefaults: GTTStatsProps = {
  title: "NIO / 蔚来: батарея по подписке",
  metrics: [
    {
      value: 3790,
      label: "станций замены батарей по миру к февралю 2026",
      prefix: "",
      suffix: "",
      compact: false,
    },
    {
      value: 100_000_000,
      label: "выполненных свопов — порог пройден",
      prefix: "",
      suffix: "",
      compact: true,
    },
    {
      value: 16,
      label: "всей энергии электромобилей Китая в пиковые дни мая",
      prefix: "до ",
      suffix: "%",
      compact: false,
    },
  ],
};

export const GTTStats: React.FC<GTTStatsProps> = ({ title, metrics }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      <FadeIn delayInFrames={0} durationInFrames={16} translateY={20}>
        <h2
          style={{
            margin: 0,
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: 56,
            letterSpacing: -1,
            color: theme.colors.text,
          }}
        >
          {title}
        </h2>
      </FadeIn>

      <div
        style={{
          display: "flex",
          gap: theme.spacing.lg,
          alignItems: "flex-start",
        }}
      >
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            theme={theme}
            value={metric.value}
            label={metric.label}
            prefix={metric.prefix}
            suffix={metric.suffix}
            compact={metric.compact}
            delayInFrames={14 + index * 12}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

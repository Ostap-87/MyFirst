import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";
import { CountUp, SlideInSpring } from "./effects";

/**
 * MetricCard — карточка одной метрики: крупная цифра со счётчиком и подпись.
 *
 * Компонент нейтрален к бренду: тему получает пропом, чтобы одна карточка
 * работала во всех трёх брендах и не тянула чужие цвета (CLAUDE.md, правило 1).
 * Цифру красим акцентом бренда — это единственное цветное пятно в карточке,
 * поэтому взгляд идёт сразу на неё.
 */
export type MetricCardProps = {
  readonly theme: BrandTheme;
  /** Конечное значение счётчика. */
  readonly value: number;
  /** Подпись под цифрой: что именно измеряем. */
  readonly label: string;
  /** Текст после числа: «%», «шт.», «станций». */
  readonly suffix?: string;
  /** Текст перед числом: «+», «₽», «до». */
  readonly prefix?: string;
  /** Сокращать ли большие числа до «млн» и «млрд». */
  readonly compact?: boolean;
  /** Знаков после запятой. */
  readonly decimals?: number;
  /** Задержка появления — для каскада из нескольких карточек. */
  readonly delayInFrames?: number;
  /** Размер цифры в пикселях. */
  readonly valueSize?: number;
};

export const MetricCard: React.FC<MetricCardProps> = ({
  theme,
  value,
  label,
  suffix = "",
  prefix = "",
  compact = false,
  decimals = 0,
  delayInFrames = 0,
  valueSize = 120,
}) => {
  return (
    <SlideInSpring
      direction="up"
      distance={60}
      delayInFrames={delayInFrames}
      damping={15}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
          borderTop: `3px solid ${theme.colors.accent}`,
          paddingTop: theme.spacing.sm,
          minWidth: 320,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: valueSize,
            lineHeight: 1,
            letterSpacing: -2,
            color: theme.colors.text,
          }}
        >
          <CountUp
            to={value}
            prefix={prefix}
            suffix={suffix}
            compact={compact}
            decimals={decimals}
            delayInFrames={delayInFrames + 4}
            durationInFrames={50}
          />
        </div>

        <div
          style={{
            fontFamily: fontFamily(theme.fonts.body),
            fontWeight: theme.fonts.bodyWeight,
            fontSize: 30,
            lineHeight: 1.3,
            color: theme.colors.muted,
            maxWidth: 420,
          }}
        >
          {label}
        </div>
      </div>
    </SlideInSpring>
  );
};

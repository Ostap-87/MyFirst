import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FadeIn, SlideInSpring } from "../../shared/components/effects";
import { fontFamily } from "../../shared/fonts";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-Intro — заставка ролика GlobalTechTour: тема выпуска и подзаголовок.
 *
 * Бренд GlobalTechTour: цвета и шрифты берём только из ../theme
 * (CLAUDE.md, правило 1). Акцент #2563eb работает как узкая вертикальная
 * линия слева от заголовка — как на сайте, без заливки больших площадей.
 */
export const gttIntroSchema = z.object({
  kicker: z.string().describe("Надстрочник: рубрика или дата выпуска"),
  title: z.string().describe("Заголовок сцены"),
  subtitle: z.string().describe("Подзаголовок под заголовком"),
});

export type GTTIntroProps = z.infer<typeof gttIntroSchema>;

export const gttIntroDefaults: GTTIntroProps = {
  kicker: "ДЕЛОВЫЕ ТУРЫ · КИТАЙ",
  title: "Как устроен китайский технологический рынок",
  subtitle: "globaltechtour.ru — программы туров и делегаций",
};

export const GTTIntro: React.FC<GTTIntroProps> = ({
  kicker,
  title,
  subtitle,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        padding: theme.spacing.xl,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: theme.spacing.lg,
          alignItems: "stretch",
        }}
      >
        {/* Акцентная линия слева: появляется первой и «держит» композицию. */}
        <FadeIn delayInFrames={0} durationInFrames={14} translateY={0}>
          <div
            style={{
              width: 10,
              height: "100%",
              minHeight: 420,
              backgroundColor: theme.colors.accent,
            }}
          />
        </FadeIn>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
          }}
        >
          <FadeIn delayInFrames={6} durationInFrames={16} translateY={16}>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: 30,
                letterSpacing: 6,
                color: theme.colors.accent,
              }}
            >
              {kicker}
            </div>
          </FadeIn>

          <SlideInSpring
            direction="up"
            distance={90}
            delayInFrames={10}
            damping={16}
          >
            <h1
              style={{
                margin: 0,
                maxWidth: 1400,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: 92,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: theme.colors.text,
              }}
            >
              {title}
            </h1>
          </SlideInSpring>

          <FadeIn delayInFrames={28} durationInFrames={18} translateY={24}>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontWeight: theme.fonts.bodyWeight,
                fontSize: 38,
                color: theme.colors.muted,
              }}
            >
              {subtitle}
            </p>
          </FadeIn>
        </div>
      </div>
    </AbsoluteFill>
  );
};

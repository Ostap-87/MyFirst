import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FadeIn, SlideInSpring } from "../../shared/components/effects";
import { fontFamily } from "../../shared/fonts";
import { ostapdotcenkoTheme as theme } from "../theme";

/**
 * Personal-Intro — вертикальная заставка личного бренда (Reels / Shorts / TG).
 *
 * Бренд ostapdotcenko: цвета и шрифты берём только из ../theme
 * (CLAUDE.md, правило 1). Заголовок — Unbounded, текст — Golos Text,
 * жёлтый акцент точечно: цифра, подчёркивание, точка в конце строки.
 */
export const personalIntroSchema = z.object({
  kicker: z.string().describe("Надстрочник: рубрика"),
  title: z.string().describe("Заголовок, 2–4 слова"),
  subtitle: z.string().describe("Подзаголовок под заголовком"),
  handle: z.string().describe("Подпись автора внизу кадра"),
});

export type PersonalIntroProps = z.infer<typeof personalIntroSchema>;

export const personalIntroDefaults: PersonalIntroProps = {
  kicker: "B2B-МАРКЕТИНГ",
  title: "Китай без иллюзий",
  subtitle: "Что на самом деле работает в выходе на рынки Азии",
  handle: "@ostapdotcenko",
};

export const PersonalIntro: React.FC<PersonalIntroProps> = ({
  kicker,
  title,
  subtitle,
  handle,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        justifyContent: "center",
        gap: theme.spacing.lg,
      }}
    >
      {/* Карточка-панель: как блоки на сайте — поверхность чуть светлее фона. */}
      <FadeIn delayInFrames={0} durationInFrames={16} translateY={0}>
        <div
          style={{
            backgroundColor: theme.colors.surface,
            border: `2px solid ${theme.colors.line}`,
            borderRadius: 28,
            padding: theme.spacing.lg,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
          }}
        >
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

          <SlideInSpring
            direction="up"
            distance={70}
            delayInFrames={8}
            damping={13}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: 86,
                lineHeight: 1.12,
                letterSpacing: -2,
                color: theme.colors.text,
              }}
            >
              {title}
              <span style={{ color: theme.colors.accent }}>.</span>
            </h1>
          </SlideInSpring>

          <FadeIn delayInFrames={26} durationInFrames={18} translateY={24}>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontWeight: theme.fonts.bodyWeight,
                fontSize: 40,
                lineHeight: 1.35,
                color: theme.colors.muted,
              }}
            >
              {subtitle}
            </p>
          </FadeIn>
        </div>
      </FadeIn>

      <FadeIn delayInFrames={36} durationInFrames={16} translateY={20}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <div
            style={{
              width: 56,
              height: 4,
              backgroundColor: theme.colors.accent,
            }}
          />
          <span
            style={{
              fontFamily: fontFamily(theme.fonts.mono),
              fontSize: 34,
              color: theme.colors.text,
            }}
          >
            {handle}
          </span>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

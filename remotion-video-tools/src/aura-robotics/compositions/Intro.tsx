import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FadeIn, SlideInSpring } from "../../shared/components/effects";
import { fontFamily } from "../../shared/fonts";
import { auraRoboticsTheme as theme } from "../theme";

/**
 * Aura-Intro — заставка ролика Aura Robotics: модель робота и задача, которую он закрывает.
 *
 * Бренд Aura Robotics: цвета и шрифты берём только из ../theme
 * (CLAUDE.md, правило 1). Кислотно-жёлтый — маркером под ключевым словом,
 * как выделение в тексте: большими площадями он «выжигает» кадр.
 */
export const auraIntroSchema = z.object({
  kicker: z.string().describe("Надстрочник: категория робота"),
  title: z.string().describe("Заголовок сцены"),
  highlight: z.string().describe("Слово или фраза под жёлтым маркером"),
  subtitle: z.string().describe("Подзаголовок под заголовком"),
});

export type AuraIntroProps = z.infer<typeof auraIntroSchema>;

export const auraIntroDefaults: AuraIntroProps = {
  kicker: "ПРОМЫШЛЕННАЯ РОБОТОТЕХНИКА",
  title: "Робот закрывает",
  highlight: "полный цикл цеха",
  subtitle: "aura-robotics.ru — подобрать робота под задачу",
};

export const AuraIntro: React.FC<AuraIntroProps> = ({
  kicker,
  title,
  highlight,
  subtitle,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <FadeIn delayInFrames={0} durationInFrames={14} translateY={12}>
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: 28,
            letterSpacing: 6,
            color: theme.colors.muted,
          }}
        >
          {kicker}
        </div>
      </FadeIn>

      <SlideInSpring
        direction="up"
        distance={80}
        delayInFrames={8}
        damping={15}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: fontFamily(theme.fonts.heading),
            fontWeight: theme.fonts.headingWeight,
            fontSize: 104,
            lineHeight: 1.05,
            letterSpacing: -3,
            color: theme.colors.text,
          }}
        >
          {title}{" "}
          <span
            style={{
              // Маркер: жёлтая подложка только под словами, не на весь блок.
              backgroundColor: theme.colors.accent,
              boxDecorationBreak: "clone",
              padding: `0 ${theme.spacing.sm}px`,
            }}
          >
            {highlight}
          </span>
        </h1>
      </SlideInSpring>

      <FadeIn delayInFrames={26} durationInFrames={18} translateY={24}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <div
            style={{ width: 64, height: 2, backgroundColor: theme.colors.line }}
          />
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
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

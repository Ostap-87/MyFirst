import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import {
  FadeIn,
  GlitchTransition,
  SlideInSpring,
  ZoomParallax,
} from "./components/effects";
import { fontFamily } from "./fonts";

/**
 * Shared-EffectsLab — витрина библиотеки эффектов на нейтральных данных.
 *
 * Специально без брендовых цветов и шрифтов: сюда смотрим, когда проверяем
 * новый эффект или сверяем свой рендер с кадрами референса (CLAUDE.md, шаг
 * «Разбор моушн-дизайна»). Брендовые сцены живут в папках брендов.
 */
export const effectsLabSchema = z.object({
  headline: z.string().describe("Крупный текст первой сцены"),
  caption: z.string().describe("Подпись под заголовком"),
  secondHeadline: z.string().describe("Текст второй сцены — после глитча"),
  transitionAtFrame: z
    .number()
    .int()
    .min(1)
    .describe("Кадр, на котором срабатывает глитч"),
  glitchIntensity: z.number().min(0).describe("Сила сдвига полос в пикселях"),
});

export type EffectsLabProps = z.infer<typeof effectsLabSchema>;

export const effectsLabDefaults: EffectsLabProps = {
  headline: "ЭФФЕКТЫ",
  caption: "ZoomParallax + SlideInSpring + FadeIn",
  secondHeadline: "ПОСЛЕ ГЛИТЧА",
  transitionAtFrame: 120,
  glitchIntensity: 90,
};

const neutral = {
  text: "#f2f2f4",
  muted: "#b8b8c0",
  surface: "#1d1d22",
};

export const EffectsLab: React.FC<EffectsLabProps> = ({
  headline,
  caption,
  secondHeadline,
  transitionAtFrame,
  glitchIntensity,
}) => {
  const sceneOne = (
    <ZoomParallax
      src=""
      zoomFrom={1}
      zoomTo={1.2}
      driftY={-40}
      parallaxStrength={70}
      durationInFrames={transitionAtFrame}
      overlayOpacity={0.35}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", gap: 24 }}
      >
        <SlideInSpring
          direction="up"
          distance={90}
          delayInFrames={6}
          damping={12}
          mass={1}
          stiffness={100}
          fade
        >
          <div
            style={{
              fontFamily: fontFamily("Inter"),
              fontWeight: 900,
              fontSize: 140,
              letterSpacing: 8,
              color: neutral.text,
            }}
          >
            {headline}
          </div>
        </SlideInSpring>

        <FadeIn delayInFrames={24} durationInFrames={20} translateY={24}>
          <div
            style={{
              fontFamily: fontFamily("JetBrains Mono"),
              fontWeight: 400,
              fontSize: 36,
              color: neutral.muted,
            }}
          >
            {caption}
          </div>
        </FadeIn>
      </AbsoluteFill>
    </ZoomParallax>
  );

  // Вторая сцена живёт в Sequence: так её эффекты отсчитывают кадры от момента
  // перехода, а не от начала композиции (иначе анимация «проиграется» невидимой).
  const sceneTwo = (
    <Sequence from={transitionAtFrame}>
      <AbsoluteFill
        style={{
          backgroundColor: neutral.surface,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SlideInSpring
          direction="left"
          distance={220}
          delayInFrames={2}
          damping={16}
          mass={1}
          stiffness={120}
          fade
        >
          <div
            style={{
              fontFamily: fontFamily("Inter"),
              fontWeight: 700,
              fontSize: 110,
              letterSpacing: 4,
              color: neutral.text,
            }}
          >
            {secondHeadline}
          </div>
        </SlideInSpring>
      </AbsoluteFill>
    </Sequence>
  );

  return (
    <GlitchTransition
      transitionAtFrame={transitionAtFrame}
      durationInFrames={10}
      sliceCount={14}
      intensity={glitchIntensity}
      rgbSplit={16}
      seed="effects-lab"
      before={sceneOne}
      after={sceneTwo}
    />
  );
};

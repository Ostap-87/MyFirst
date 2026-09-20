import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import demoCaptions from "../../../data/captions.demo.json";
import {
  ChatOverlay,
  CountUp,
  FilmGrain,
  PhoneMockup,
  StepNumber,
} from "../../shared/components/effects";
import { EndCard } from "../../shared/components/EndCard";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import { LowerThird } from "../../shared/components/LowerThird";
import { SafeArea } from "../../shared/components/SafeArea";
import { SoundCue } from "../../shared/components/SoundCue";
import { StickyCTA } from "../../shared/components/StickyCTA";
import { Watermark } from "../../shared/components/Watermark";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import { ostapdotcenkoTheme as theme } from "../theme";

/**
 * Personal-TalkingHead — разговорный ролик целиком: раскладка приёмов,
 * разобранных по референсу (см. docs/reference-breakdown.md).
 *
 * Порядок слоёв снизу вверх: съёмка -> оверлеи (номер пункта, скриншот,
 * переписка) -> постоянные элементы бренда (ник, подпись, нижний призыв) ->
 * субтитры -> зерно -> финальная карточка. Субтитры всегда выше оверлеев:
 * их читают, даже когда поверх кадра что-то происходит.
 *
 * Место под съёмку помечено ниже: туда ставится <OffthreadVideo> и <Audio>
 * с речью, всё остальное уже на своих местах.
 */
export const talkingHeadSchema = z.object({
  speakerName: z.string().describe("Имя спикера для нижней трети"),
  speakerRole: z.string().describe("Роль или тема под именем"),
  handle: z.string().describe("Ник для водяного знака и финала"),
  ctaHighlight: z.string().describe("Слово на плашке акцента в нижнем призыве"),
  ctaHeadline: z.string().describe("Продолжение фразы призыва"),
  ctaNote: z.string().describe("Мелкая строка под призывом"),
  keyword: z.string().describe("Кодовое слово, которое печатается в поле"),
  metric: z.number().describe("Число для сцены со счётчиком"),
  metricLabel: z.string().describe("Подпись под числом"),
});

export type TalkingHeadProps = z.infer<typeof talkingHeadSchema>;

export const talkingHeadDefaults: TalkingHeadProps = {
  speakerName: "Остап Доценко",
  speakerRole: "B2B-МАРКЕТИНГ · КИТАЙ И ЮВА",
  handle: "@ostapdotcenko",
  ctaHighlight: "Хочешь",
  ctaHeadline: "так же?",
  ctaNote: "пришли кодовое слово в директ",
  keyword: "китай",
  metric: 3,
  metricLabel: "контракта закрыто за один тур",
};

export const TalkingHead: React.FC<TalkingHeadProps> = ({
  speakerName,
  speakerRole,
  handle,
  ctaHighlight,
  ctaHeadline,
  ctaNote,
  keyword,
  metric,
  metricLabel,
}) => {
  const { fs, sp, vh } = useFormat();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary }}>
      {/* МЕСТО ПОД СЪЁМКУ: сюда ставится
          <OffthreadVideo src={staticFile("footage/talk.mp4")} /> и <Audio> с речью.
          Пока — нейтральная подложка, чтобы вёрстка оверлеев читалась. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, #2b2b36 0%, ${theme.colors.primary} 68%)`,
        }}
      />

      {/* Номер пункта висит над спикером весь фрагмент. */}
      <Sequence from={40} durationInFrames={200}>
        <SafeArea platform="reels">
          <StepNumber
            value={1}
            fontFamily={fontFamily(theme.fonts.heading)}
            opacity={0.65}
          />
        </SafeArea>
      </Sequence>

      {/* Доказательство скриншотом: статистика в рамке телефона. */}
      <Sequence from={70} durationInFrames={150}>
        <PhoneMockup
          src=""
          delayInFrames={0}
          durationInFrames={8}
          heightFraction={0.46}
        />
      </Sequence>

      {/* Переписка с индикатором набора. */}
      <Sequence from={250} durationInFrames={170}>
        <ChatOverlay
          fontFamily={fontFamily(theme.fonts.body)}
          messages={[
            {
              side: "in",
              text: "ну и как, сработало?",
              atFrame: 6,
              typingFrames: 0,
            },
            {
              side: "out",
              text: "три контракта с первого тура",
              atFrame: 60,
              typingFrames: 26,
            },
          ]}
          lighten={0.5}
        />
      </Sequence>

      {/* Второй пункт — со счётчиком вместо скриншота. */}
      <Sequence from={430} durationInFrames={88}>
        <SafeArea platform="reels">
          <StepNumber
            value={2}
            fontFamily={fontFamily(theme.fonts.heading)}
            opacity={0.65}
          />
          <AbsoluteFill
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: fontFamily(theme.fonts.heading),
                  fontWeight: theme.fonts.headingWeight,
                  fontSize: fs(0.2),
                  lineHeight: 1,
                  color: theme.colors.accent,
                }}
              >
                <CountUp to={metric} delayInFrames={8} durationInFrames={40} />
              </div>
              <div
                style={{
                  marginTop: sp(0.02),
                  fontFamily: fontFamily(theme.fonts.body),
                  fontSize: fs(0.036),
                  color: "#ffffff",
                  maxWidth: sp(0.7),
                }}
              >
                {metricLabel}
              </div>
            </div>
          </AbsoluteFill>
        </SafeArea>
      </Sequence>

      {/* Постоянные элементы бренда. */}
      <Watermark theme={theme} handle={handle} corner="top-right" />

      <SafeArea platform="reels" style={{ justifyContent: "flex-end" }}>
        <LowerThird
          theme={theme}
          name={speakerName}
          role={speakerRole}
          delayInFrames={18}
          holdInFrames={90}
        />
      </SafeArea>

      {/* Призыв появляется в середине и висит до конца: досматривают не все. */}
      <SafeArea platform="reels" style={{ justifyContent: "flex-end" }}>
        <StickyCTA
          theme={theme}
          highlight={ctaHighlight}
          headline={ctaHeadline}
          note={ctaNote}
          keyword={keyword}
          delayInFrames={300}
        />
      </SafeArea>

      {/* Субтитры — выше оверлеев, но ниже зерна и финала.
          Позиция по вертикали считается от высоты кадра: субтитры идут ПОД
          призывом, у самого низа, как в референсе (около 88% высоты). */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: vh(0.1),
          paddingLeft: sp(0.07),
          paddingRight: sp(0.07),
        }}
      >
        <KaraokeCaptions
          theme={theme}
          captions={demoCaptions as Caption[]}
          mode="word"
          fontSizeFraction={0.058}
        />
      </AbsoluteFill>

      <FilmGrain
        opacity={0.11}
        grainSize={2}
        vignette={0.32}
        blendMode="screen"
      />

      <EndCard
        theme={theme}
        handle={handle}
        caption="новые разборы каждую неделю"
        startFrame={520}
      />

      {/* Звук под движение: появление номера, скриншота, сообщения и призыва. */}
      <SoundCue name="swoosh" atFrame={40} volume={0.5} />
      <SoundCue name="pop" atFrame={70} volume={0.6} />
      <SoundCue name="notify" atFrame={256} volume={0.6} />
      <SoundCue name="pop" atFrame={310} volume={0.5} />
      <SoundCue name="swoosh" atFrame={430} volume={0.5} />
      <SoundCue name="click" atFrame={520} volume={0.6} />
    </AbsoluteFill>
  );
};

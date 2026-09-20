import type { CalculateMetadataFunction } from "remotion";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
} from "remotion";
import { z } from "zod";
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
import { useCaptions } from "../../shared/useCaptions";
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
  captionsSrc: z
    .string()
    .describe(
      'Файл субтитров внутри public, например "local/captions.json". Пусто — без субтитров',
    ),
  footageSrc: z
    .string()
    .describe(
      'Видео со съёмкой внутри public, например "local/talk.mp4". Пусто — подложка',
    ),
  audioSrc: z
    .string()
    .describe(
      "Отдельная звуковая дорожка внутри public. Пусто — берём звук из видео",
    ),
  captionFont: z
    .string()
    .describe(
      "Гарнитура субтитров: Inter, Onest, Montserrat, Manrope, Golos Text",
    ),
  captionStyle: z
    .enum(["shadow", "outline", "plate"])
    .describe("Оформление слова: тень, обводка или плашка"),
});

export type TalkingHeadProps = z.infer<typeof talkingHeadSchema>;

/**
 * Длительность ролика считается по субтитрам, а не задаётся руками: выпуски
 * разной длины иначе пришлось бы каждый раз править в Root.tsx, а лишние
 * кадры в конце — это секунды черноты после последней фразы.
 */
export const calculateTalkingHeadMetadata: CalculateMetadataFunction<
  TalkingHeadProps
> = async ({ props, defaultProps }) => {
  const fps = 30;
  const src = props.captionsSrc || defaultProps.captionsSrc;
  if (!src) return { fps };

  try {
    const response = await fetch(staticFile(src));
    const captions = (await response.json()) as { endMs: number }[];
    const lastMs = captions.length ? captions[captions.length - 1].endMs : 0;
    // Хвост в 2.5 с: на нём доигрывает финальная карточка.
    return { fps, durationInFrames: Math.round((lastMs / 1000) * fps) + 75 };
  } catch {
    // Файла нет или он битый — пусть работает длительность из Root.tsx,
    // а настоящую ошибку покажет useCaptions уже при рендере кадра.
    return { fps };
  }
};

export const talkingHeadDefaults: TalkingHeadProps = {
  captionsSrc: "captions/demo.json",
  footageSrc: "",
  audioSrc: "",
  captionFont: "Inter",
  captionStyle: "shadow",
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
  captionsSrc,
  footageSrc,
  audioSrc,
  captionFont,
  captionStyle,
}) => {
  const { fs, sp, vh, durationInFrames } = useFormat();
  const captions = useCaptions(captionsSrc || null);

  // Призыв выходит на середине ролика, финальная карточка — за 2.5 с до конца.
  const ctaDelay = Math.round(durationInFrames * 0.5);
  const endCardStart = Math.max(0, durationInFrames - 75);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary }}>
      {/* Съёмка: путь приходит в пропсах, без неё — нейтральная подложка,
          на которой видно вёрстку оверлеев. */}
      {footageSrc ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(footageSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted={Boolean(audioSrc)}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 38%, #2b2b36 0%, ${theme.colors.primary} 68%)`,
          }}
        />
      )}

      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}

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
      <Sequence from={430} durationInFrames={Math.max(1, endCardStart - 430)}>
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
          delayInFrames={ctaDelay}
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
          captions={captions}
          mode="word"
          captionStyle={captionStyle}
          font={captionFont}
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
      <SoundCue name="click" atFrame={endCardStart} volume={0.6} />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, staticFile } from "remotion";
import { z } from "zod";
import { FadeIn, FilmGrain, SlideInSpring, ZoomParallax } from "./effects";
import { SafeArea } from "./SafeArea";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * PostReelLayout — вертикальный ролик по одному Telegram-посту.
 *
 * Компонент нейтрален к бренду: тему получает пропом, поэтому одна и та же
 * вёрстка работает и для GTT, и для Aura, не смешивая их палитры
 * (CLAUDE.md, правило 1). Данные приходят из data/posts.json — см.
 * `npm run parse-plan`.
 *
 * Кадр строится снизу вверх: фото с медленным наездом, поверх — градиент,
 * который гасит низ кадра, и только потом текст. Без градиента белый
 * заголовок теряется на светлых участках фото.
 */
export const postReelSchema = z.object({
  company: z.string().describe("Компания или тема поста — надстрочник"),
  date: z.string().describe("Дата поста в формате ГГГГ-ММ-ДД"),
  title: z.string().describe("Заголовок поста"),
  lead: z.string().describe("Первое предложение поста"),
  cta: z.string().describe("Строка призыва с адресом сайта"),
  image: z
    .string()
    .describe(
      'Путь к картинке внутри public, например "tg-images/aura/2026-08-16-...png"',
    ),
  platform: z
    .enum(["telegram", "reels", "shorts"])
    .describe("Под какую площадку считать безопасные поля"),
});

export type PostReelProps = z.infer<typeof postReelSchema>;

export type PostReelLayoutProps = PostReelProps & {
  readonly theme: BrandTheme;
};

/** Дата ГГГГ-ММ-ДД -> «16 августа 2026». */
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const formatDate = (iso: string): string => {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const month = MONTHS[Number(parts[1]) - 1];
  return month ? `${Number(parts[2])} ${month} ${parts[0]}` : iso;
};

/** Длинный лид не влезает в вертикальный кадр — режем по границе слова. */
const trim = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
};

export const PostReelLayout: React.FC<PostReelLayoutProps> = ({
  theme,
  company,
  date,
  title,
  lead,
  cta,
  image,
  platform,
}) => {
  const { fs, sp, durationInFrames } = useFormat();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary }}>
      <ZoomParallax
        src={image ? staticFile(image) : ""}
        zoomFrom={1.02}
        zoomTo={1.16}
        driftY={-30}
        parallaxStrength={0}
        durationInFrames={durationInFrames}
        overlayOpacity={0}
      />

      {/* Градиент снизу: без него светлое фото съедает белый текст. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 32%, rgba(0,0,0,0.15) 58%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      <SafeArea platform={platform} style={{ justifyContent: "space-between" }}>
        <FadeIn delayInFrames={4} durationInFrames={16} translateY={-14}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: sp(0.02),
              fontFamily: fontFamily(theme.fonts.mono),
              fontSize: fs(0.028),
              letterSpacing: fs(0.003),
              color: theme.colors.accent,
            }}
          >
            <span>{company.toUpperCase()}</span>
            <span
              style={{
                width: sp(0.04),
                height: 2,
                backgroundColor: theme.colors.accent,
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.75)" }}>
              {formatDate(date)}
            </span>
          </div>
        </FadeIn>

        <div
          style={{ display: "flex", flexDirection: "column", gap: sp(0.03) }}
        >
          <SlideInSpring
            direction="up"
            distance={70}
            delayInFrames={12}
            damping={15}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.082),
                lineHeight: 1.1,
                letterSpacing: -1,
                color: "#ffffff",
              }}
            >
              {title}
            </h1>
          </SlideInSpring>

          <FadeIn delayInFrames={30} durationInFrames={20} translateY={26}>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontWeight: theme.fonts.bodyWeight,
                fontSize: fs(0.038),
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              {trim(lead, 190)}
            </p>
          </FadeIn>

          <FadeIn delayInFrames={48} durationInFrames={18} translateY={20}>
            <div
              style={{
                marginTop: sp(0.01),
                paddingTop: sp(0.02),
                borderTop: `2px solid ${theme.colors.accent}`,
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.03),
                color: "#ffffff",
              }}
            >
              {cta}
            </div>
          </FadeIn>
        </div>
      </SafeArea>

      <FilmGrain
        opacity={0.1}
        grainSize={2}
        vignette={0.3}
        blendMode="screen"
      />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Img, staticFile } from "remotion";
import { formatRu } from "../effects/CountUp";
import { useFormat } from "../../format";
import { fontFamily } from "../../fonts";
import type { BrandTheme } from "../../theme";
import type { Slide } from "./types";

/**
 * CarouselSlide — один слайд карусели Instagram.
 *
 * В отличие от видеосцены здесь нет анимации: слайд — это кадр, который
 * листают руками. Поэтому вся работа уходит в иерархию — на слайде должно
 * быть ровно одно, что читается с расстояния вытянутой руки.
 *
 * Тема приходит пропом (CLAUDE.md, правило 1).
 */
export type CarouselSlideProps = {
  readonly theme: BrandTheme;
  readonly slide: Slide;
  /** Номер слайда и общее количество — для счётчика. */
  readonly position: { index: number; total: number };
  readonly showCounter?: boolean;
  readonly showSwipeHint?: boolean;
  /** Сайт или ник внизу слайда: карусели репостят, подпись должна быть в картинке. */
  readonly footer?: string;
};

export const CarouselSlide: React.FC<CarouselSlideProps> = ({
  theme,
  slide,
  position,
  showCounter = true,
  showSwipeHint = true,
  footer = "",
}) => {
  const { fs, sp } = useFormat();

  // Кегль заголовка обложки подбирается по длине: «Batteries» и
  // «Borunte: шестиосевые роботы, которые обслуживают термопластавтоматы» —
  // это 9 и 68 знаков, одним размером они не живут.
  const coverTitleSize = (text: string) => {
    if (text.length > 64) return fs(0.068);
    if (text.length > 44) return fs(0.082);
    return fs(0.105);
  };

  // Тёмные слайды делаем поверх картинки и на обложке, светлые — в теле
  // карусели: сплошная лента тёмных кадров в ленте читается как реклама.
  const isDark =
    slide.type === "cover" ||
    slide.type === "image" ||
    theme.colors.primary === "#12121a";
  const background = isDark ? theme.colors.primary : theme.colors.surface;
  const textColor = isDark ? "#ffffff" : theme.colors.text;
  const mutedColor = isDark ? "rgba(255,255,255,0.7)" : theme.colors.muted;

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {(slide.type === "cover" || slide.type === "image") && slide.image ? (
        <>
          <AbsoluteFill>
            <Img
              src={staticFile(slide.image)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              background:
                slide.type === "cover"
                  ? "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)"
                  : "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%)",
            }}
          />
        </>
      ) : null}

      <AbsoluteFill
        style={{
          padding: `${sp(0.12)}px ${sp(0.08)}px`,
          justifyContent: slide.type === "cover" ? "flex-end" : "center",
          gap: sp(0.035),
        }}
      >
        {slide.type === "cover" ? (
          <>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.032),
                letterSpacing: fs(0.004),
                color: theme.colors.accent,
                // Акцент поверх фотографии живёт только с тенью: на светлом
                // участке кадра синий по синему исчезает.
                textShadow: "0 2px 10px rgba(0,0,0,0.85)",
              }}
            >
              {slide.kicker.toUpperCase()}
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: coverTitleSize(slide.title),
                lineHeight: 1.08,
                letterSpacing: -1,
                color: "#ffffff",
              }}
            >
              {slide.title}
            </h1>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: fs(0.042),
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {slide.subtitle}
            </p>
          </>
        ) : null}

        {slide.type === "point" ? (
          <>
            <div
              style={{
                width: fs(0.13),
                height: fs(0.13),
                borderRadius: "50%",
                backgroundColor: theme.colors.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.062),
                color: theme.colors.primary,
              }}
            >
              {slide.index}
            </div>
            {slide.title ? (
              <h2
                style={{
                  margin: 0,
                  fontFamily: fontFamily(theme.fonts.heading),
                  fontWeight: theme.fonts.headingWeight,
                  fontSize: fs(0.075),
                  lineHeight: 1.12,
                  color: textColor,
                }}
              >
                {slide.title}
              </h2>
            ) : null}
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: slide.title ? fs(0.042) : fs(0.052),
                lineHeight: 1.4,
                color: slide.title ? mutedColor : textColor,
              }}
            >
              {slide.text}
            </p>
          </>
        ) : null}

        {slide.type === "metric" ? (
          <>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.2),
                lineHeight: 0.95,
                letterSpacing: -4,
                color: theme.colors.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {slide.prefix}
              {formatRu(slide.value, 0, slide.compact)}
              {slide.suffix}
            </div>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.055),
                lineHeight: 1.2,
                color: textColor,
              }}
            >
              {slide.label}
            </div>
            {slide.source ? (
              <div
                style={{
                  fontFamily: fontFamily(theme.fonts.mono),
                  fontSize: fs(0.026),
                  color: mutedColor,
                }}
              >
                {slide.source}
              </div>
            ) : null}
          </>
        ) : null}

        {slide.type === "quote" ? (
          <>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.18),
                lineHeight: 0.7,
                color: theme.colors.accent,
              }}
            >
              «
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.062),
                lineHeight: 1.25,
                color: textColor,
              }}
            >
              {slide.text}
            </p>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.028),
                color: mutedColor,
              }}
            >
              {slide.author}
            </div>
          </>
        ) : null}

        {slide.type === "image" ? (
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `${sp(0.12)}px ${sp(0.08)}px`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: fs(0.04),
                lineHeight: 1.35,
                color: "#ffffff",
              }}
            >
              {slide.caption}
            </p>
          </AbsoluteFill>
        ) : null}

        {slide.type === "cta" ? (
          <>
            <h2
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: theme.fonts.headingWeight,
                fontSize: fs(0.085),
                lineHeight: 1.1,
                color: textColor,
              }}
            >
              {slide.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: fs(0.042),
                lineHeight: 1.4,
                color: mutedColor,
              }}
            >
              {slide.text}
            </p>
            {slide.keyword ? (
              <div
                style={{
                  marginTop: sp(0.02),
                  alignSelf: "flex-start",
                  padding: `${sp(0.018)}px ${sp(0.04)}px`,
                  borderRadius: 999,
                  backgroundColor: theme.colors.accent,
                  fontFamily: fontFamily(theme.fonts.heading),
                  fontWeight: theme.fonts.headingWeight,
                  fontSize: fs(0.05),
                  color: theme.colors.primary,
                }}
              >
                {slide.keyword}
              </div>
            ) : null}
            <div
              style={{
                marginTop: sp(0.03),
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.032),
                color: theme.colors.accent,
              }}
            >
              {slide.handle}
            </div>
          </>
        ) : null}
      </AbsoluteFill>

      {showCounter ? (
        <div
          style={{
            position: "absolute",
            top: sp(0.06),
            right: sp(0.08),
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.028),
            color: isDark ? "rgba(255,255,255,0.75)" : theme.colors.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {position.index + 1} / {position.total}
        </div>
      ) : null}

      {footer && slide.type !== "cta" ? (
        <div
          style={{
            position: "absolute",
            bottom: sp(0.05),
            left: sp(0.08),
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.026),
            color: isDark ? "rgba(255,255,255,0.6)" : theme.colors.muted,
            textShadow: isDark ? "0 2px 8px rgba(0,0,0,0.6)" : "none",
          }}
        >
          {footer}
        </div>
      ) : null}

      {/* Подсказка листать — только на первом слайде: дальше она бессмысленна,
          а место занимает. */}
      {showSwipeHint && position.index === 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: sp(0.05),
            right: sp(0.08),
            display: "flex",
            alignItems: "center",
            gap: sp(0.014),
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.03),
            color: theme.colors.accent,
          }}
        >
          листай <span style={{ fontSize: fs(0.04) }}>→</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

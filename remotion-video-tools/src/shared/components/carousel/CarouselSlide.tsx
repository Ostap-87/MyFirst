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
  const { fs, sp, vh } = useFormat();

  // Кегль заголовка обложки подбирается по длине: «Batteries» и
  // «Borunte: шестиосевые роботы, которые обслуживают термопластавтоматы» —
  // это 9 и 68 знаков, одним размером они не живут.
  // Кегль цифры — по длине готовой строки. «12» и «500 000 ₽» одним
  // размером не живут: второе вылезает за поля кадра.
  const metricSize = (text: string) => {
    if (text.length <= 3) return fs(0.2);
    if (text.length <= 5) return fs(0.17);
    if (text.length <= 7) return fs(0.14);
    if (text.length <= 10) return fs(0.115);
    return fs(0.095);
  };

  const coverTitleSize = (text: string) => {
    if (text.length > 64) return fs(0.068);
    if (text.length > 44) return fs(0.082);
    return fs(0.105);
  };

  // Слайд с картинкой обычно тёмный: текст ложится поверх фотографии.
  // Без картинки — светлый, чтобы лента не читалась как сплошная реклама.
  // Бренды с imageStyle "framed" (GTT) держат фон светлым всегда: фото
  // живёт в отдельной карточке, а не заливает кадр (см. theme.ts).
  const hasImage = Boolean("image" in slide && slide.image);
  const framed = hasImage && theme.imageStyle === "framed";
  const isDark = !framed && (hasImage || theme.colors.primary === "#12121a");
  const background = isDark ? theme.colors.primary : theme.colors.surface;
  const textColor = isDark ? "#ffffff" : theme.colors.text;
  const mutedColor = isDark ? "rgba(255,255,255,0.7)" : theme.colors.muted;

  // Карточка фото в "framed"-режиме: фикс. отступы сверху/по бокам, высота —
  // чуть больше половины кадра, дальше текст идёт под ней (не поверх).
  const framedImageTop = vh(0.06);
  const framedImageHeight = vh(0.44);
  const framedContentTop = framedImageTop + framedImageHeight + vh(0.045);

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {hasImage && "image" in slide && slide.image ? (
        framed ? (
          <div
            style={{
              position: "absolute",
              top: framedImageTop,
              left: sp(0.08),
              right: sp(0.08),
              height: framedImageHeight,
              borderRadius: sp(0.045),
              overflow: "hidden",
              border: `1px solid ${theme.colors.line}`,
              boxShadow: "0 16px 40px rgba(23,23,29,0.08)",
            }}
          >
            <Img
              src={staticFile(slide.image)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <>
            <AbsoluteFill>
              <Img
                src={staticFile(slide.image)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AbsoluteFill>
            {/* Затемнение под текст. На обложке текст внизу — гасим низ;
                на остальных слайдах он по центру, поэтому гасим кадр ровнее,
                иначе цифра на светлом участке фотографии пропадает. */}
            <AbsoluteFill
              style={{
                background:
                  slide.type === "cover"
                    ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.3) 100%)"
                    : slide.type === "image"
                      ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%)"
                      : "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 42%, rgba(0,0,0,0.82) 100%)",
              }}
            />
          </>
        )
      ) : null}

      <AbsoluteFill
        style={{
          padding: framed
            ? `${framedContentTop}px ${sp(0.08)}px ${sp(0.08)}px`
            : `${sp(0.12)}px ${sp(0.08)}px`,
          justifyContent: framed
            ? "flex-start"
            : slide.type === "cover"
              ? "flex-end"
              : "center",
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
                // Поверх фотографии кикер белый: акцентный цвет на светлом
                // участке кадра пропадает даже с тенью. В "framed" фото не
                // заливает кадр — кикер обычный акцентный, без тени.
                color: hasImage && !framed ? "#ffffff" : theme.colors.accent,
                textShadow: framed ? "none" : "0 2px 12px rgba(0,0,0,0.9)",
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
                color: framed ? theme.colors.text : "#ffffff",
                textShadow: framed ? "none" : "0 4px 24px rgba(0,0,0,0.75)",
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
                color: framed ? theme.colors.muted : "rgba(255,255,255,0.85)",
                textShadow: framed ? "none" : "0 2px 14px rgba(0,0,0,0.7)",
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
                fontSize: metricSize(
                  `${slide.prefix}${formatRu(slide.value, 0, slide.compact)}${slide.suffix}`,
                ),
                lineHeight: 1,
                letterSpacing: -3,
                color: theme.colors.accent,
                fontVariantNumeric: "tabular-nums",
                // Без nowrap «500 000 ₽» рвётся, и знак валюты уезжает
                // на отдельную строку под числом.
                whiteSpace: "nowrap",
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
          framed ? (
            <p
              style={{
                margin: 0,
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: fs(0.044),
                lineHeight: 1.4,
                color: theme.colors.text,
              }}
            >
              {slide.caption}
            </p>
          ) : (
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
          )
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
                // Длинный адрес рвём по символам, иначе он вылезает за поля;
                // кегль мельче обычного — это подпись, а не заголовок.
                fontSize: slide.handle.length > 28 ? fs(0.026) : fs(0.032),
                lineHeight: 1.3,
                wordBreak: "break-all",
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
            top: framed ? framedImageTop + sp(0.025) : sp(0.06),
            right: framed ? sp(0.08) + sp(0.025) : sp(0.08),
            padding: framed ? `${sp(0.012)}px ${sp(0.022)}px` : 0,
            borderRadius: 999,
            backgroundColor: framed ? "rgba(255,255,255,0.92)" : "transparent",
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.028),
            color: framed
              ? theme.colors.text
              : isDark
                ? "rgba(255,255,255,0.75)"
                : theme.colors.muted,
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
            bottom: framed
              ? undefined
              : sp(0.05),
            top: framed
              ? framedImageTop + framedImageHeight - sp(0.05) - sp(0.025)
              : undefined,
            left: sp(0.08) + (framed ? sp(0.025) : 0),
            padding: framed ? `${sp(0.012)}px ${sp(0.022)}px` : 0,
            borderRadius: 999,
            backgroundColor: framed ? "rgba(255,255,255,0.92)" : "transparent",
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.026),
            color: framed
              ? theme.colors.text
              : isDark
                ? "rgba(255,255,255,0.6)"
                : theme.colors.muted,
            textShadow: !framed && isDark ? "0 2px 8px rgba(0,0,0,0.6)" : "none",
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
            bottom: framed
              ? undefined
              : sp(0.05),
            top: framed
              ? framedImageTop + framedImageHeight - sp(0.05) - sp(0.025)
              : undefined,
            right: framed ? sp(0.08) + sp(0.025) : sp(0.08),
            display: "flex",
            alignItems: "center",
            gap: sp(0.014),
            padding: framed ? `${sp(0.014)}px ${sp(0.028)}px` : 0,
            borderRadius: 999,
            backgroundColor: framed ? theme.colors.accent : "transparent",
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.03),
            color: framed ? "#ffffff" : theme.colors.accent,
          }}
        >
          листай <span style={{ fontSize: fs(0.04) }}>→</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

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
  const { fs, sp, vh, height } = useFormat();

  // Разбивает строку по `**акцент**` на обычные и крупные акцентные куски —
  // так в одной подписи можно выделить цифру/фразу без отдельного слайда.
  // Работает и без разметки: тогда просто возвращает исходный текст одним
  // куском обычного размера.
  const renderRich = (
    text: string,
    base: React.CSSProperties,
    emphasis: React.CSSProperties,
  ) =>
    text
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} style={{ ...base, ...emphasis }}>
            {part.slice(2, -2)}
          </span>
        ) : (
          <span key={i} style={base}>
            {part}
          </span>
        ),
      );

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

  // Карточка фото в "framed"-режиме теперь занимает почти весь слайд —
  // текст ложится прямо на фото, а не в отдельный блок под ним (запрос
  // пользователя 21.09.2026: "картинка и поверх неё идёт скомпанованная
  // надпись", а не картинка + отдельная подпись снизу). Верх фото остаётся
  // чётким, низ — под плавно нарастающим размытием (frosted-панель), на
  // которой и живёт текст: светлое, не тёмным градиентом, как раньше.
  const framedMarginSide = sp(0.06);
  const framedMarginTop = vh(0.045);
  const framedMarginBottom = vh(0.045);
  const framedCardHeight = height - framedMarginTop - framedMarginBottom;
  // Обложке нужно больше места (кикер+заголовок+подзаголовок), остальным
  // типам с фото — меньше (обычно одна подпись).
  // Панель считается щедро — текст не должен вылезать за размытую зону на
  // резкую часть фото (было именно так до правки 21.09.2026: заголовок
  // в 3 строки перекрывал верх снимка нечитаемым чёрным-по-светлому).
  const framedPanelHeight = Math.round(
    framedCardHeight * (slide.type === "cover" ? 0.62 : 0.46),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {hasImage && "image" in slide && slide.image && !framed ? (
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
      ) : null}

      {hasImage && "image" in slide && slide.image && framed ? (
        <div
          style={{
            position: "absolute",
            top: framedMarginTop,
            left: framedMarginSide,
            right: framedMarginSide,
            height: framedCardHeight,
            borderRadius: sp(0.045),
            overflow: "hidden",
            border: `1px solid ${theme.colors.line}`,
            boxShadow: "0 16px 40px rgba(23,23,29,0.08)",
          }}
        >
          {/* Фото на всю карточку, верх — чёткий, без затемнения. */}
          <Img
            src={staticFile(slide.image)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Frosted-панель: размытие и белый оттенок нарастают плавно
              (маска-градиент), а не жёсткой линией — верх карточки при
              этом остаётся резким. Светлая, не тёмная (запрос
              пользователя 21.09.2026), текст поверх — тёмный. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: framedPanelHeight,
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              backgroundColor: "rgba(255,255,255,0.78)",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: framedPanelHeight,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: `0 ${sp(0.07)}px ${sp(0.06)}px`,
              gap: sp(0.02),
            }}
          >
            {slide.type === "cover" ? (
              <>
                <div
                  style={{
                    fontFamily: fontFamily(theme.fonts.mono),
                    fontSize: fs(0.03),
                    letterSpacing: fs(0.004),
                    color: theme.colors.accent,
                  }}
                >
                  {slide.kicker.toUpperCase()}
                </div>
                <h1 style={{ margin: 0, lineHeight: 1.08, letterSpacing: -1 }}>
                  {renderRich(
                    slide.title,
                    {
                      fontFamily: fontFamily(theme.fonts.heading),
                      fontWeight: theme.fonts.headingWeight,
                      fontSize: coverTitleSize(slide.title),
                      color: theme.colors.text,
                    },
                    { color: theme.colors.accent },
                  )}
                </h1>
                <p style={{ margin: 0, lineHeight: 1.35 }}>
                  {renderRich(
                    slide.subtitle,
                    {
                      fontFamily: fontFamily(theme.fonts.body),
                      fontSize: fs(0.036),
                      color: theme.colors.muted,
                    },
                    { fontWeight: 700, color: theme.colors.text },
                  )}
                </p>
              </>
            ) : null}

            {slide.type === "image" ? (
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                {renderRich(
                  slide.caption,
                  {
                    fontFamily: fontFamily(theme.fonts.body),
                    fontSize: fs(0.038),
                    color: theme.colors.text,
                  },
                  { fontWeight: 700, color: theme.colors.accent },
                )}
              </p>
            ) : null}

            {slide.type === "point" ? (
              <>
                <div
                  style={{
                    width: fs(0.11),
                    height: fs(0.11),
                    borderRadius: "50%",
                    backgroundColor: theme.colors.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fontFamily(theme.fonts.heading),
                    fontWeight: theme.fonts.headingWeight,
                    fontSize: fs(0.052),
                    color: "#ffffff",
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
                      fontSize: fs(0.062),
                      lineHeight: 1.12,
                      color: theme.colors.text,
                    }}
                  >
                    {slide.title}
                  </h2>
                ) : null}
                <p
                  style={{
                    margin: 0,
                    fontFamily: fontFamily(theme.fonts.body),
                    fontSize: slide.title ? fs(0.036) : fs(0.044),
                    lineHeight: 1.4,
                    color: slide.title ? theme.colors.muted : theme.colors.text,
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
                    fontSize: fs(0.046),
                    lineHeight: 1.2,
                    color: theme.colors.text,
                  }}
                >
                  {slide.label}
                </div>
                {slide.source ? (
                  <div
                    style={{
                      fontFamily: fontFamily(theme.fonts.mono),
                      fontSize: fs(0.024),
                      color: theme.colors.muted,
                    }}
                  >
                    {slide.source}
                  </div>
                ) : null}
              </>
            ) : null}

            {slide.type === "quote" ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fontFamily(theme.fonts.heading),
                    fontWeight: theme.fonts.headingWeight,
                    fontSize: fs(0.052),
                    lineHeight: 1.25,
                    color: theme.colors.text,
                  }}
                >
                  «{slide.text}»
                </p>
                <div
                  style={{
                    fontFamily: fontFamily(theme.fonts.mono),
                    fontSize: fs(0.026),
                    color: theme.colors.muted,
                  }}
                >
                  {slide.author}
                </div>
              </>
            ) : null}

            {slide.type === "cta" ? (
              <>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: fontFamily(theme.fonts.heading),
                    fontWeight: theme.fonts.headingWeight,
                    fontSize: fs(0.068),
                    lineHeight: 1.1,
                    color: theme.colors.text,
                  }}
                >
                  {slide.title}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fontFamily(theme.fonts.body),
                    fontSize: fs(0.038),
                    lineHeight: 1.4,
                    color: theme.colors.muted,
                  }}
                >
                  {slide.text}
                </p>
              </>
            ) : null}
          </div>

          {/* Счётчик — плашкой поверх резкой (не размытой) верхней части
              фото, чтобы читался на любом снимке. */}
          {showCounter ? (
            <div
              style={{
                position: "absolute",
                top: sp(0.028),
                right: sp(0.028),
                padding: `${sp(0.012)}px ${sp(0.022)}px`,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.92)",
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.026),
                color: theme.colors.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {position.index + 1} / {position.total}
            </div>
          ) : null}

          {/* Подпись сайта и подсказка «листай» — одной строкой над панелью
              подписи, тоже плашками. */}
          {footer && slide.type !== "cta" ? (
            <div
              style={{
                position: "absolute",
                left: sp(0.028),
                bottom: framedPanelHeight + sp(0.028),
                padding: `${sp(0.01)}px ${sp(0.02)}px`,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.85)",
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.024),
                color: theme.colors.muted,
              }}
            >
              {footer}
            </div>
          ) : null}

          {showSwipeHint && position.index === 0 ? (
            <div
              style={{
                position: "absolute",
                right: sp(0.028),
                bottom: framedPanelHeight + sp(0.028),
                display: "flex",
                alignItems: "center",
                gap: sp(0.012),
                padding: `${sp(0.012)}px ${sp(0.026)}px`,
                borderRadius: 999,
                backgroundColor: theme.colors.accent,
                fontFamily: fontFamily(theme.fonts.mono),
                fontSize: fs(0.026),
                color: "#ffffff",
              }}
            >
              листай <span style={{ fontSize: fs(0.036) }}>→</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!framed ? (
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
                  // Поверх фотографии кикер белый: акцентный цвет на светлом
                  // участке кадра пропадает даже с тенью.
                  color: hasImage ? "#ffffff" : theme.colors.accent,
                  textShadow: "0 2px 12px rgba(0,0,0,0.9)",
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
                  textShadow: "0 4px 24px rgba(0,0,0,0.75)",
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
                  color: "rgba(255,255,255,0.85)",
                  textShadow: "0 2px 14px rgba(0,0,0,0.7)",
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
      ) : null}

      {/* Счётчик, подпись сайта и подсказка «листай» для НЕ-framed стиля
          (тёмная заливка под фото или полностью светлый слайд без фото) —
          для framed-фото те же элементы уже отрисованы внутри карточки
          фото выше, плашками поверх резкой части снимка. */}
      {!framed && showCounter ? (
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

      {!framed && footer && slide.type !== "cta" ? (
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
      {!framed && showSwipeHint && position.index === 0 ? (
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

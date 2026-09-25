import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * SiteShowcase — витрина сайта: телефон с живой прокруткой.
 *
 * Голый скриншот в рамке выглядит как «прислали картинку в чат» — так
 * владелец и сказал про первую версию. Здесь сайт подан как продукт:
 * тёмный фон со свечением, телефон с лёгким поворотом в 3D, страница
 * внутри плавно едет вниз, рядом крупно название и адрес на кнопке.
 *
 * Раскладка подстраивается под место. В широкой области — нижней
 * половине при делении экрана — телефон слева, название и адрес справа.
 * В высокой — на весь кадр — телефон по центру, адрес под ним.
 *
 * Прокрутка задаётся долей высоты страницы: сдвиг считается в процентах
 * от самой картинки, и размер скриншота знать заранее не нужно.
 */
export const siteShowcaseSchema = z.object({
  src: z.string().describe("Длинный скриншот мобильной страницы внутри public"),
  title: z.string().describe("Название над адресом; пусто — без названия"),
  url: z.string().describe("Адрес на кнопке; пусто — без кнопки"),
  scrollTo: z.number().min(0).max(0.9).describe("До какой доли страницы долистать"),
  accent: z.string().describe("Цвет кнопки и свечения"),
  variant: z
    .enum(["part", "full"])
    .describe("part — в части кадра (деление), full — на весь кадр под окном спикера"),
});

export type SiteShowcaseParams = z.infer<typeof siteShowcaseSchema>;
export type SiteShowcaseProps = Partial<SiteShowcaseParams>;

export const siteShowcaseDefaults: SiteShowcaseParams = {
  src: "",
  title: "",
  url: "",
  scrollTo: 0.35,
  accent: "#2563eb",
  variant: "part",
};

export const SiteShowcase: React.FC<SiteShowcaseProps> = (params) => {
  const { src, title, url, scrollTo, accent, variant } = withDefaults(siteShowcaseDefaults, params);
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Страница стоит полсекунды, чтобы зритель успел увидеть первый экран,
  // потом едет до scrollTo и останавливается к концу.
  const scroll = interpolate(frame, [fps * 0.5, durationInFrames - fps * 0.3], [0, scrollTo], ease);
  const enter = interpolate(frame, [0, 14], [0, 1], ease);
  const float = Math.sin((frame / fps) * 1.6) * 6;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 90% at 30% 40%, #13254a 0%, #0a1224 55%, #05080f 100%)",
        overflow: "hidden",
      }}
    >
      {/* Свечение за телефоном — отделяет его от тёмного фона. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 45% at 30% 45%, ${accent}55 0%, transparent 70%)`,
        }}
      />
      <Layout
        enter={enter}
        float={float}
        src={src}
        scroll={scroll}
        title={title}
        url={url}
        accent={accent}
        full={variant === "full"}
      />
    </AbsoluteFill>
  );
};

/**
 * Раскладка по пропорциям контейнера. Размеры — в единицах контейнера
 * (cqw, cqh): эффект живёт и в половине кадра, и на весь кадр, а
 * useVideoConfig знает только размер композиции.
 */
const Layout: React.FC<{
  readonly enter: number;
  readonly float: number;
  readonly src: string;
  readonly scroll: number;
  readonly title: string;
  readonly url: string;
  readonly accent: string;
  readonly full: boolean;
}> = ({ enter, float, src, scroll, title, url, accent, full }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      containerType: "size",
      display: "flex",
      // Всё прижато к верху области: снизу по ней идут субтитры, и
      // по центру они ложились на адрес и низ телефона.
      alignItems: "flex-start",
      // На весь кадр: телефон слева ниже логотипа, текст справа сверху —
      // правый нижний угол занят окном спикера, низ — субтитрами.
      justifyContent: full ? "flex-start" : "center",
      gap: "6cqw",
      padding: full ? "22cqh 8cqw 0" : "6cqh 6cqw 0",
      boxSizing: "border-box",
      flexDirection: "row",
      flexWrap: "wrap",
      alignContent: "flex-start",
    }}
  >
    {/* Телефон: высота от меньшей стороны контейнера, чтобы в половине
        кадра он не упирался в края, а на весь кадр не был мелким. */}
    <div
      style={{
        height: full ? "min(46cqh, 90cqw)" : "min(60cqh, 120cqw)",
        aspectRatio: "0.49",
        borderRadius: "min(6cqh, 11cqw)",
        padding: "min(1.2cqh, 2.2cqw)",
        backgroundColor: "#0b0d12",
        boxShadow: "0 40px 90px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.12)",
        transform: `perspective(1600px) rotateY(${-10 * enter}deg) translateY(${(1 - enter) * 60 + float}px) scale(${0.94 + 0.06 * enter})`,
        opacity: enter,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "min(5cqh, 9cqw)",
          overflow: "hidden",
          backgroundColor: "#fff",
          position: "relative",
        }}
      >
        {src ? (
          <Img
            src={staticFile(src)}
            style={{
              width: "100%",
              display: "block",
              transform: `translateY(${-scroll * 100}%)`,
            }}
          />
        ) : null}
      </div>
    </div>

    {title || url ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "3cqh",
          opacity: enter,
          transform: `translateX(${(1 - enter) * 40}px)`,
          maxWidth: full ? "38cqw" : "46cqw",
          paddingTop: full ? "3cqh" : "8cqh",
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: fontFamily("Inter"),
              fontWeight: 800,
              fontSize: "min(8cqh, 7.5cqw)",
              lineHeight: 1.05,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        ) : null}
        {url ? (
          <div
            style={{
              fontFamily: fontFamily("Inter"),
              fontWeight: 700,
              fontSize: "min(4.6cqh, 4.4cqw)",
              color: "#fff",
              backgroundColor: accent,
              borderRadius: 999,
              padding: "1.4cqh 3.6cqw",
              boxShadow: `0 12px 36px ${accent}88`,
            }}
          >
            {url}
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
);

import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import { SpinningTetra } from "../../shared/components/effects";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";
import captionsData from "../../../data/captions-china-expo.json";

/**
 * ChinaReel — Reels из съёмки на закрытой выставке под Циндао.
 *
 * Исходник: один непрерывный дубль 25,5 с, селфи на ходу. Все четыре компании
 * (Alibaba, Tencent, Baidu, Haier) названы в последние четыре секунды — до них
 * в Reels обычно не досматривают. Поэтому крючок в первой секунде обещает
 * именно эти имена, а плашки выводят их на экран в момент произнесения.
 *
 * Секунды взяты из data/captions-china-expo.json (whisper, модель small),
 * а не подобраны на глаз: сдвиг плашки на полсекунды сразу читается как брак.
 *
 * ——— Компоновка кадра ———
 *
 * Съёмка идёт во весь кадр, край в край, без рамки и полей — масштаб 1:1.
 *
 * Исходник — чистый файл с камеры (iPhone 16 Pro, HEVC 1920x1080 с матрицей
 * поворота -90). Никаких чужих титров в нём нет, поэтому маскирующая полоса
 * выключена: под субтитрами только лёгкая тень, лицо ничем не перекрыто.
 *
 * Важное про длительность. Оригинал идёт 34,2 с, и компании звучат в нём на
 * 26,4—30,7 с. Обрезка до 25,5 с вырезала бы их все — то есть ровно то, что
 * обещает крючок. Поэтому запись не обрезана, а ускорена в 1,343 раза
 * (ровно 34,24 / 25,5) с сохранением высоты голоса. Так делал и Kapwing:
 * его версия была той же длины из того же оригинала.
 */

export const chinaReelSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  place: z.string().describe("Геометка: город и страна"),
  brandMark: z.string().describe("Подпись рядом с логотипом сверху"),
  logoScale: z
    .number()
    .min(0.5)
    .max(3)
    .describe("Размер логотипа сверху: 1 — базовый"),
  hasBurnedCaptions: z
    .boolean()
    .describe(
      "У исходника есть вшитые чужие титры — включить маскирующую полосу",
    ),
  ctaTitle: z.string().describe("Заголовок концевой карточки"),
  ctaUrl: z.string().describe("Адрес сайта на концевой карточке"),
});

export type ChinaReelProps = z.infer<typeof chinaReelSchema>;

/** Секунда произнесения -> кадр. Тайминги из расшифровки. */
const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

/** Компании в порядке появления. Секунды — из data/captions-china-expo.json. */
const COMPANIES = [
  { name: "Alibaba", at: 21.09 },
  { name: "Tencent", at: 21.72 },
  { name: "Baidu", at: 22.34 },
  { name: "Haier", at: 22.84 },
];

const FOOTAGE_SECONDS = 25.6;
const GEO_FROM = 3.44;
const GEO_TO = 6.1;

/** Съёмка показывается как есть: 1:1, край в край. */
const ZOOM = 1;

/**
 * Плашка компании: плавное проявление со сдвигом вверх.
 *
 * Плашки не сменяют друг друга, а копятся: к концу фразы весь список стоит
 * в кадре, и зритель видит масштаб целиком, а не четыре мелькнувших слова.
 */
const CompanyPlate: React.FC<{
  readonly name: string;
  readonly appearAt: number;
  readonly fs: (fraction: number) => number;
}> = ({ name, appearAt, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const since = frame - appearAt;

  const enter = spring({
    frame: since,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 16,
  });

  const opacity = interpolate(since, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * fs(0.03)}px)`,
        alignSelf: "flex-end",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderLeft: `${fs(0.007)}px solid ${theme.colors.accent}`,
        borderRadius: fs(0.012),
        padding: `${fs(0.015)}px ${fs(0.025)}px`,
        boxShadow: "0 6px 26px rgba(0,0,0,0.34)",
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: 700,
        fontSize: fs(0.04),
        color: theme.colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </div>
  );
};

/** Логотип с подписью: шапка ролика, держится весь хронометраж. */
const BrandMark: React.FC<{
  readonly label: string;
  readonly fs: (fraction: number) => number;
  readonly scale: number;
}> = ({ label, fs, scale }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: fs(0.02 * scale),
      justifyContent: "center",
    }}
  >
    <SpinningTetra size={fs(0.105 * scale)} degreesPerSecond={26} />
    <span
      style={{
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: 700,
        fontSize: fs(0.036 * scale),
        letterSpacing: fs(0.004),
        color: "#fff",
        textShadow: "0 2px 14px rgba(0,0,0,0.75)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  </div>
);

export const ChinaReel: React.FC<ChinaReelProps> = ({
  footage,
  hookTop,
  hookBottom,
  place,
  brandMark,
  logoScale,
  hasBurnedCaptions,
  ctaTitle,
  ctaUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const { fs } = useFormat();

  const footageFrames = Math.round(FOOTAGE_SECONDS * fps);
  const endCardFrom = footageFrames;
  const onFootage = frame < endCardFrom;

  // Съёмка во весь кадр, увеличенная и прижатая к верху: так строка 1500
  // исходника попадает ровно на нижнюю кромку, а чужие титры под ней — нет.
  const videoWidth = Math.round(width * ZOOM);
  const videoHeight = Math.round((videoWidth * height) / width);
  const videoLeft = Math.round((width - videoWidth) / 2);

  const hookIn = interpolate(frame, [0, AT(0.5, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [AT(1.7, fps), AT(2.2, fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
      {/* Съёмка во весь кадр. Увеличена и прижата к верху — чужие титры
          Kapwing остаются ниже нижней кромки и в кадр не попадают. */}
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {/* Позиционируем обёртку, а не сам OffthreadVideo: собственные
              стили position он до элемента не доносит, и кадр уезжает. */}
          <div
            style={{
              position: "absolute",
              left: videoLeft,
              top: 0,
              width: videoWidth,
              height: videoHeight,
            }}
          >
            <OffthreadVideo
              src={staticFile(footage)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Затемнение сверху под логотип и снизу под субтитры: без него
          белый текст теряется на небе и на светлой рубашке. */}
      {onFootage ? (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.2) 12%, rgba(0,0,0,0) 24%)",
            }}
          />
          {/*
            Маскирующая полоса. Нужна ТОЛЬКО пока в исходнике вшиты чужие
            титры Kapwing (y 1560—1640). На чистом исходнике она выключается
            пропом: тогда лицо ничем не перекрыто, а субтитрам хватает
            мягкой тени.
          */}
          {hasBurnedCaptions ? (
            <AbsoluteFill
              style={{
                // 28px не хватало: чужие титры просвечивали сквозь полосу.
                backdropFilter: "blur(44px)",
                WebkitBackdropFilter: "blur(44px)",
                maskImage:
                  "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 26%, rgba(0,0,0,0) 38%)",
                WebkitMaskImage:
                  "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 26%, rgba(0,0,0,0) 38%)",
              }}
            />
          ) : null}
          <AbsoluteFill
            style={{
              background: hasBurnedCaptions
                ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 18%, rgba(0,0,0,0.3) 28%, rgba(0,0,0,0) 38%)"
                : // Чистый исходник: только лёгкая тень под текст, лицо открыто.
                  "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 10%, rgba(0,0,0,0) 22%)",
            }}
          />
        </>
      ) : null}

      {/* ——— Шапка: логотип ——— */}
      {onFootage ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.052),
          }}
        >
          <BrandMark label={brandMark} fs={fs} scale={logoScale} />
        </AbsoluteFill>
      ) : null}

      {/* ——— Крючок ——— */}
      <Sequence durationInFrames={AT(2.3, fps)}>
        <AbsoluteFill
          style={{
            opacity: hookIn * hookOut,
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.17),
            paddingLeft: fs(0.09),
            paddingRight: fs(0.09),
          }}
        >
          {/* Подложка обязательна: в первых кадрах за текстом светлый
              дорожный знак, и белое по белому не читается вовсе. */}
          <div
            style={{
              backgroundColor: "rgba(7,10,17,0.72)",
              borderRadius: fs(0.022),
              padding: `${fs(0.035)}px ${fs(0.04)}px`,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.062),
              lineHeight: 1.16,
              letterSpacing: fs(-0.0016),
              color: "#fff",
            }}
          >
            {hookTop}
            <span style={{ display: "block", color: "#8FD4FF" }}>
              {hookBottom}
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ——— Геометка, гарамоном ——— */}
      <Sequence
        from={AT(GEO_FROM, fps)}
        durationInFrames={AT(GEO_TO - GEO_FROM, fps)}
      >
        <GeoPlate
          place={place}
          fs={fs}
          top={Math.round(height * 0.155)}
          left={fs(0.07)}
        />
      </Sequence>

      {/* ——— Плашки компаний: верх справа внутри съёмки ——— */}
      {onFootage ? (
        <AbsoluteFill
          style={{
            paddingTop: Math.round(height * 0.155),
            paddingRight: fs(0.07),
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: fs(0.015),
          }}
        >
          {COMPANIES.map((company) =>
            frame >= AT(company.at, fps) ? (
              <CompanyPlate
                key={company.name}
                name={company.name}
                appearAt={AT(company.at, fps)}
                fs={fs}
              />
            ) : null,
          )}
        </AbsoluteFill>
      ) : null}

      {/* ——— Субтитры: под съёмкой, на лицо не налезают ——— */}
      <Sequence durationInFrames={footageFrames}>
        {/* Прижаты к низу: там теперь плечи, а не подбородок. */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            paddingBottom: Math.round(height * 0.115),
            paddingLeft: fs(0.08),
            paddingRight: fs(0.08),
          }}
        >
          <KaraokeCaptions
            theme={theme}
            captions={captionsData as Caption[]}
            mode="page"
            highlight="color"
            captionStyle="shadow"
            font="Onest"
            fontSizeFraction={0.05}
          />
        </AbsoluteFill>
      </Sequence>

      {/* ——— Концевая карточка ——— */}
      <Sequence
        from={endCardFrom}
        durationInFrames={durationInFrames - endCardFrom}
      >
        <EndCard title={ctaTitle} url={ctaUrl} fs={fs} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Геометка: засечки и широкий трекинг — подпись к месту, а не элемент интерфейса. */
const GeoPlate: React.FC<{
  readonly place: string;
  readonly fs: (fraction: number) => number;
  readonly top: number;
  readonly left: number;
}> = ({ place, fs, top, left }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.7 },
    durationInFrames: 20,
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ paddingTop: top, paddingLeft: left }}>
      <div
        style={{
          opacity,
          transform: `translateY(${(1 - enter) * fs(0.022)}px)`,
          alignSelf: "flex-start",
          display: "flex",
          flexDirection: "column",
          gap: fs(0.01),
        }}
      >
        {/* Гарамон тонкий по рисунку: на пересвеченном небе он пропадал
            даже с двойной тенью. Плашка решает это честнее. */}
        <div
          style={{
            backgroundColor: "rgba(7,10,17,0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: fs(0.012),
            padding: `${fs(0.014)}px ${fs(0.026)}px ${fs(0.018)}px`,
            display: "flex",
            flexDirection: "column",
            gap: fs(0.012),
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: fontFamily("Cormorant Garamond"),
              fontWeight: 500,
              fontSize: fs(0.06),
              letterSpacing: fs(0.007),
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {place}
          </span>
          <span
            style={{
              width: "100%",
              height: fs(0.0035),
              backgroundColor: "#61CBFA",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Концевая карточка: белый фон, фирменный синий текст, вращающийся логотип.
 * Светлый финал после тёмного ролика работает как точка, а не как обрыв.
 */
const EndCard: React.FC<{
  readonly title: string;
  readonly url: string;
  readonly fs: (fraction: number) => number;
}> = ({ title, url, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.8 },
    durationInFrames: 22,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        gap: fs(0.045),
        paddingLeft: fs(0.1),
        paddingRight: fs(0.1),
        opacity: interpolate(frame, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div style={{ transform: `scale(${0.85 + enter * 0.15})` }}>
        <SpinningTetra size={fs(0.3)} degreesPerSecond={34} />
      </div>

      <div
        style={{
          transform: `translateY(${(1 - enter) * fs(0.035)}px)`,
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: 700,
          fontSize: fs(0.076),
          lineHeight: 1.16,
          letterSpacing: fs(-0.002),
          color: theme.colors.accent,
          textAlign: "center",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontFamily: fontFamily("Cormorant Garamond"),
          fontWeight: 500,
          fontSize: fs(0.048),
          letterSpacing: fs(0.005),
          color: theme.colors.accent,
          opacity: 0.82,
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  );
};

export default ChinaReel;

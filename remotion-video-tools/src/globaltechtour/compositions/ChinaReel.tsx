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
 * Съёмка НЕ растянута на весь кадр, и это решает сразу три задачи.
 *
 * 1. Низ исходника обрезан по y=1500. Там на y 1560—1640 вшиты чужие титры
 *    Kapwing — замерено по шести кадрам во всех частях ролика. Обрезка
 *    убирает их совсем, поэтому не нужна маскирующая полоса размытия:
 *    закрывать нечего.
 * 2. Съёмка уменьшена до 76% ширины — лицо перестаёт упираться в края кадра.
 * 3. Освободившиеся поля получают своё содержание: сверху логотип, снизу
 *    субтитры. Субтитры больше не лежат на лице, а стоят под кадром.
 *
 * Фон — та же съёмка, размытая и затемнённая: чёрные поля читались бы как
 * ошибка экспорта, а размытая подложка — как приём.
 */

export const chinaReelSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  place: z.string().describe("Геометка: город и страна"),
  brandMark: z.string().describe("Подпись рядом с логотипом сверху"),
  ctaTitle: z.string().describe("Заголовок концевой карточки"),
  ctaUrl: z.string().describe("Адрес сайта на концевой карточке"),
});

export type ChinaReelProps = z.infer<typeof chinaReelSchema>;

/** Секунда произнесения -> кадр. Тайминги из расшифровки. */
const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

/** Компании в порядке появления. Секунды — из data/captions-china-expo.json. */
const COMPANIES = [
  { name: "Alibaba", at: 21.18 },
  { name: "Tencent", at: 22.16 },
  { name: "Baidu", at: 23.53 },
  { name: "Haier", at: 24.0 },
];

const FOOTAGE_SECONDS = 25.5;
const GEO_FROM = 3.56;
const GEO_TO = 6.2;

/**
 * Доля исходного кадра, которая остаётся после обрезки низа.
 * 1500 из 1920: ниже начинаются чужие титры.
 */
const KEEP = 1500 / 1920;

/** Ширина съёмки в кадре, долей ширины композиции. */
const FOOTAGE_WIDTH = 0.82;

/** Верх блока со съёмкой, долей высоты композиции. */
const FOOTAGE_TOP = 0.115;

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
}> = ({ label, fs }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: fs(0.02),
      justifyContent: "center",
    }}
  >
    <SpinningTetra size={fs(0.105)} degreesPerSecond={26} />
    <span
      style={{
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: 700,
        fontSize: fs(0.036),
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
  ctaTitle,
  ctaUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const { fs } = useFormat();

  const footageFrames = Math.round(FOOTAGE_SECONDS * fps);
  const endCardFrom = footageFrames;
  const onFootage = frame < endCardFrom;

  // Геометрия блока со съёмкой. Считаем в пикселях: это компоновка кадра,
  // а не размер шрифта, и доля тут нужна один раз — на входе.
  const boxWidth = Math.round(width * FOOTAGE_WIDTH);
  const naturalHeight = Math.round((boxWidth * height) / width);
  const boxHeight = Math.round(naturalHeight * KEEP);
  const boxTop = Math.round(height * FOOTAGE_TOP);
  const boxLeft = Math.round((width - boxWidth) / 2);

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
      {/* Фон: та же съёмка, размытая и затемнённая. */}
      {onFootage ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(footage)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(48px) brightness(0.42) saturate(0.8)",
              transform: "scale(1.2)",
            }}
            muted
          />
        </AbsoluteFill>
      ) : null}

      {/* Съёмка: низ обрезан вместе с чужими титрами. */}
      <Sequence durationInFrames={footageFrames}>
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: boxLeft,
              top: boxTop,
              width: boxWidth,
              height: boxHeight,
              overflow: "hidden",
              borderRadius: fs(0.022),
              boxShadow: "0 18px 60px rgba(0,0,0,0.5)",
            }}
          >
            <OffthreadVideo
              src={staticFile(footage)}
              style={{
                width: boxWidth,
                height: naturalHeight,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ——— Шапка: логотип ——— */}
      {onFootage ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: Math.round(height * 0.052),
          }}
        >
          <BrandMark label={brandMark} fs={fs} />
        </AbsoluteFill>
      ) : null}

      {/* ——— Крючок ——— */}
      <Sequence durationInFrames={AT(2.3, fps)}>
        <AbsoluteFill
          style={{
            opacity: hookIn * hookOut,
            justifyContent: "flex-start",
            paddingTop: boxTop + Math.round(height * 0.03),
            paddingLeft: fs(0.14),
            paddingRight: fs(0.14),
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
        <GeoPlate place={place} fs={fs} top={boxTop + Math.round(height * 0.035)} left={boxLeft + fs(0.04)} />
      </Sequence>

      {/* ——— Плашки компаний: верх справа внутри съёмки ——— */}
      {onFootage ? (
        <AbsoluteFill
          style={{
            paddingTop: boxTop + Math.round(height * 0.035),
            paddingRight: width - boxLeft - boxWidth + fs(0.035),
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
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            paddingTop: boxTop + boxHeight + Math.round(height * 0.018),
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

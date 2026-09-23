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
 * Раскладка кадра:
 *   верх справа — плашки компаний. Лицо занимает левую и центральную часть,
 *                 правый верхний угол свободен во всех четырёх моментах.
 *   верх слева  — геометка, гарамоном: рубленый шрифт рядом с ней звучит
 *                 как интерфейс, а не как подпись к месту.
 *   низ         — субтитры. Полоса на y 1440—1620 выбрана не случайно: там
 *                 вшиты чужие титры Kapwing, и подложка их закрывает.
 */

export const chinaReelSchema = z.object({
  footage: z.string().describe("Путь к видео внутри public"),
  hookTop: z.string().describe("Первая строка крючка"),
  hookBottom: z.string().describe("Вторая строка крючка, акцентом"),
  place: z.string().describe("Геометка: город и страна"),
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

  // Появление плавное: 14 кадров на проявление плюс мягкий подъём.
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
        display: "flex",
        alignItems: "center",
        gap: fs(0.018),
        alignSelf: "flex-end",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderLeft: `${fs(0.007)}px solid ${theme.colors.accent}`,
        borderRadius: fs(0.012),
        padding: `${fs(0.016)}px ${fs(0.026)}px`,
        boxShadow: "0 6px 26px rgba(0,0,0,0.34)",
      }}
    >
      <span
        style={{
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: 700,
          fontSize: fs(0.042),
          letterSpacing: fs(-0.0006),
          color: theme.colors.text,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </div>
  );
};

export const ChinaReel: React.FC<ChinaReelProps> = ({
  footage,
  hookTop,
  hookBottom,
  place,
  ctaTitle,
  ctaUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { fs, vh } = useFormat();

  const footageFrames = Math.round(FOOTAGE_SECONDS * fps);
  const endCardFrom = footageFrames;

  // Крючок: держится две секунды и уходит, чтобы не мешать речи.
  const hookOut = interpolate(frame, [AT(1.7, fps), AT(2.2, fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, AT(0.5, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={footageFrames}>
        <OffthreadVideo
          src={staticFile(footage)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>

      {/* Затемнение сверху: белый текст на небе иначе не читается. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0) 38%)",
          opacity: frame < endCardFrom ? 1 : 0,
        }}
      />

      {/*
        Низ кадра. Две накладки, и вторая — не украшение.

        Титры Kapwing вшиты в пиксели исходника на y 1540—1600 (замерено по
        кадру), перекрасить их нельзя. Размытие стирает их в кашу, затемнение
        сверху добавляет контраста нашему тексту. Края растушёваны маской,
        иначе полоса читается как заплатка.
      */}
      <AbsoluteFill
        style={{
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 17%, rgba(0,0,0,0) 30%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 17%, rgba(0,0,0,0) 30%)",
          opacity: frame < endCardFrom ? 1 : 0,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.66) 16%, rgba(0,0,0,0) 34%)",
          opacity: frame < endCardFrom ? 1 : 0,
        }}
      />

      {/* ——— Крючок ——— */}
      <Sequence durationInFrames={AT(2.3, fps)}>
        <AbsoluteFill
          style={{
            opacity: hookIn * hookOut,
            paddingTop: vh(0.13),
            paddingLeft: fs(0.07),
            paddingRight: fs(0.07),
          }}
        >
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.072),
              lineHeight: 1.14,
              letterSpacing: fs(-0.0018),
              color: "#fff",
              textShadow: "0 2px 22px rgba(0,0,0,0.62)",
            }}
          >
            {hookTop}
            <span style={{ display: "block", color: "#8FB6FF" }}>
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
        <GeoPlate place={place} fs={fs} vh={vh} />
      </Sequence>

      {/* ——— Плашки компаний: верх справа, копятся ——— */}
      <AbsoluteFill
        style={{
          paddingTop: vh(0.13),
          paddingRight: fs(0.07),
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: fs(0.016),
          opacity: frame < endCardFrom ? 1 : 0,
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

      {/* ——— Субтитры ——— */}
      <Sequence durationInFrames={footageFrames}>
        {/* KaraokeCaptions не позиционирует себя сам — иначе строка уезжает
            к верхней кромке. Прижимаем к низу так, чтобы текст встал ровно
            на полосу чужих титров и закрыл её собой. */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            paddingBottom: vh(0.15),
            paddingLeft: fs(0.07),
            paddingRight: fs(0.07),
          }}
        >
          <KaraokeCaptions
            theme={theme}
            captions={captionsData as Caption[]}
            mode="page"
            highlight="color"
            captionStyle="shadow"
            font="Onest"
            fontSizeFraction={0.052}
          />
        </AbsoluteFill>
      </Sequence>

      {/* ——— Концевая карточка ——— */}
      <Sequence from={endCardFrom} durationInFrames={durationInFrames - endCardFrom}>
        <EndCard title={ctaTitle} url={ctaUrl} fs={fs} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Геометка: засечки и широкий трекинг — подпись к месту, а не элемент интерфейса. */
const GeoPlate: React.FC<{
  readonly place: string;
  readonly fs: (fraction: number) => number;
  readonly vh: (fraction: number) => number;
}> = ({ place, fs, vh }) => {
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
    <AbsoluteFill style={{ paddingTop: vh(0.135), paddingLeft: fs(0.07) }}>
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
        <span
          style={{
            fontFamily: fontFamily("Cormorant Garamond"),
            fontWeight: 500,
            fontSize: fs(0.068),
            letterSpacing: fs(0.007),
            color: "#fff",
            // Небо в кадре пересвечено: одной мягкой тени тонким засечкам мало.
            textShadow:
              "0 2px 10px rgba(0,0,0,0.85), 0 0 34px rgba(0,0,0,0.65)",
            whiteSpace: "nowrap",
          }}
        >
          {place}
        </span>
        <span
          style={{
            width: fs(0.13),
            height: fs(0.003),
            backgroundColor: theme.colors.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

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
        backgroundColor: "#0A0E16",
        alignItems: "center",
        justifyContent: "center",
        gap: fs(0.05),
        paddingLeft: fs(0.1),
        paddingRight: fs(0.1),
        opacity: interpolate(frame, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * fs(0.035)}px)`,
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: 700,
          fontSize: fs(0.078),
          lineHeight: 1.16,
          letterSpacing: fs(-0.002),
          color: "#fff",
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: fontFamily("Cormorant Garamond"),
          fontWeight: 500,
          fontSize: fs(0.046),
          letterSpacing: fs(0.005),
          color: "#8FB6FF",
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  );
};

export default ChinaReel;

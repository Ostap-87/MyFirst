import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { CountUp, SpinningTetra } from "../../shared/components/effects";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * SitePromo — промо сайта из его же страниц.
 *
 * Отличается от формата Head тем, что говорящей головы здесь нет вовсе:
 * ролик собран из прокрутки реальных страниц и плашек поверх. Звука тоже
 * нет — промо рассчитано на просмотр без него, как большинство сторис.
 *
 * ——— Откуда цифры ———
 *
 * Все числа посчитаны по самому каталогу, а не взяты из текста на сайте.
 * Это оказалось важно: на странице индустрий написано «более чем 900
 * компаний и 17 отраслей», а в каталоге их 998 и 18. Показывать заниженное
 * значение в промо было бы странно.
 *
 * ——— Почему прокрутка задаётся здесь, а не видеофайлом ———
 *
 * Страницы приходят длинными скриншотами, и ведёт их этот компонент. Так
 * скорость и границы правятся числом в пропсах, без пересъёмки. Видеофайл
 * нужен только карте маршрута: она на сайте анимирована сама.
 */

const sceneSchema = z.object({
  kind: z.enum(["page", "clip"]).describe("page — скриншот, clip — видео"),
  src: z.string().describe("Путь внутри public"),
  seconds: z.number().describe("Длительность сцены"),
  from: z.number().describe("С какой доли высоты вести (для page)"),
  to: z.number().describe("До какой доли (для page)"),
  label: z.string().describe("Надпись сверху; пустая — без надписи"),
  value: z.number().describe("Число для счётчика; 0 — без счётчика"),
  prefix: z.string().describe("Слово перед числом, например «более»"),
  unit: z.string().describe("Подпись под числом"),
});

export const sitePromoSchema = z.object({
  title: z.string().describe("Заголовок на открывающем кадре"),
  subtitle: z.string().describe("Вторая строка открывающего кадра"),
  site: z.string().describe("Адрес сайта, он же финальный кадр"),
  voiceover: z
    .string()
    .describe("Озвучка внутри public, например audio/promo-voice.wav; пусто — без неё"),
  music: z
    .string()
    .describe("Музыкальная подложка внутри public; пусто — без неё"),
  musicVolume: z
    .number()
    .min(0)
    .max(1)
    .describe("Громкость подложки: под голосом хватает 0.12-0.18"),
  scenes: z.array(sceneSchema).describe("Сцены по порядку"),
});

export type SitePromoProps = z.infer<typeof sitePromoSchema>;
type Scene = z.infer<typeof sceneSchema>;

const AT = (seconds: number, fps: number) => Math.round(seconds * fps);

/** Страница, которую ведёт вверх. */
const Page: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  const progress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [scene.from, scene.to],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(-${progress * 100}%)`,
        }}
      >
        <Img
          src={staticFile(scene.src)}
          style={{ width, height: "auto", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Надпись и число поверх сцены. */
const Caption: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { fs } = useFormat();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.7 },
    durationInFrames: 16,
  });

  if (!scene.label && !scene.value) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: Math.round(height * 0.11),
        opacity: enter,
        transform: `translateY(${(1 - enter) * fs(0.03)}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(7,10,17,0.86)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: fs(0.022),
          padding: `${fs(0.026)}px ${fs(0.04)}px`,
          textAlign: "center",
          boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
        }}
      >
        {scene.value ? (
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.13),
              lineHeight: 1,
              color: "#8FD4FF",
              letterSpacing: fs(-0.003),
            }}
          >
            {/* Счётчик, а не готовое число: цифра, которая доезжает на
                глазах, держит внимание всю сцену. */}
            {scene.prefix ? (
              <span style={{ fontSize: fs(0.062), marginRight: fs(0.014) }}>
                {scene.prefix}
              </span>
            ) : null}
            <CountUp from={0} to={scene.value} delayInFrames={4} durationInFrames={AT(1.4, fps)} />
          </div>
        ) : null}
        {scene.label ? (
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: scene.value ? fs(0.036) : fs(0.052),
              lineHeight: 1.2,
              color: "#fff",
              marginTop: scene.value ? fs(0.012) : 0,
              letterSpacing: fs(-0.001),
            }}
          >
            {scene.label}
          </div>
        ) : null}
        {scene.unit ? (
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.body),
              fontWeight: 400,
              fontSize: fs(0.028),
              color: "rgba(255,255,255,0.72)",
              marginTop: fs(0.008),
            }}
          >
            {scene.unit}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const SitePromo: React.FC<SitePromoProps> = ({
  title,
  subtitle,
  site,
  voiceover,
  music,
  musicVolume,
  scenes,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();
  const { fs } = useFormat();

  // Длительности выставлены по готовой озвучке, а не по средней скорости
  // речи: расшифровка дала время каждой фразы, и сцены нарезаны по ним.
  const OPEN = AT(4.68, fps);
  const CLOSE = AT(2.0, fps);

  // Сцены идут встык, каждая знает только свою длину.
  let cursor = OPEN;
  const placed = scenes.map((scene) => {
    const at = cursor;
    cursor += AT(scene.seconds, fps);
    return { scene, at };
  });

  const openOut = interpolate(frame, [OPEN - AT(0.4, fps), OPEN], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Тетраэдр приходит первым и один, надпись — следом: так взгляд успевает
  // остановиться на знаке, прежде чем появляется текст.
  const tetraIn = interpolate(frame, [0, AT(0.7, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fogIn = interpolate(
    frame,
    [AT(0.8, fps), AT(2.1, fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A11" }}>
      {/* ——— Звук ———

          Голос идёт ровно, без затуханий: подрезать речь по краям нельзя,
          первое и последнее слово должны прозвучать целиком.

          Подложка, наоборот, входит и уходит плавно и стоит тихо. Когда
          голос есть, её громкость режется вдвое: даже на 0.2 музыка
          соперничает с речью, и слушать становится трудно. */}
      {voiceover ? <Audio src={staticFile(voiceover)} /> : null}
      {music ? (
        <Audio
          src={staticFile(music)}
          volume={(f) => {
            const base = voiceover ? musicVolume * 0.5 : musicVolume;
            const inCurve = interpolate(f, [0, AT(1.2, fps)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const outCurve = interpolate(
              f,
              [durationInFrames - AT(1.6, fps), durationInFrames - 1],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return base * Math.min(inCurve, outCurve);
          }}
        />
      ) : null}

      {placed.map(({ scene, at }) => (
        <Sequence
          key={`${scene.src}-${at}`}
          from={at}
          durationInFrames={AT(scene.seconds, fps)}
        >
          {scene.kind === "clip" ? (
            <AbsoluteFill style={{ overflow: "hidden" }}>
              {/* Обёртка обязательна: свои стили position OffthreadVideo
                  до элемента не доносит. */}
              <div style={{ position: "absolute", inset: 0 }}>
                <OffthreadVideo
                  src={staticFile(scene.src)}
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            </AbsoluteFill>
          ) : (
            <Page scene={scene} />
          )}

          {/* Затемнение сверху: страницы светлые, надпись белая. */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0) 34%)",
            }}
          />
          <Caption scene={scene} />
        </Sequence>
      ))}

      {/* ——— Открывающий кадр: белый, тетраэдр, надпись из тумана ———

          Надпись не просто проявляется, а выходит из расфокуса: размытие
          уходит с 22 px до нуля вместе с прозрачностью. Один только fade на
          белом читается как включённый свет, а не как появление. */}
      <Sequence durationInFrames={OPEN}>
        <AbsoluteFill
          style={{
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: openOut,
            gap: fs(0.03),
          }}
        >
          <div
            style={{
              opacity: tetraIn,
              transform: `scale(${0.82 + tetraIn * 0.18})`,
            }}
          >
            <SpinningTetra size={fs(0.92)} degreesPerSecond={72} />
          </div>
          <div
            style={{
              opacity: fogIn,
              filter: `blur(${(1 - fogIn) * 22}px)`,
              transform: `scale(${1.06 - fogIn * 0.06})`,
              marginTop: fs(0.04),
              paddingLeft: fs(0.08),
              paddingRight: fs(0.08),
            }}
          >
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.heading),
                fontWeight: 700,
                fontSize: fs(0.078),
                color: theme.colors.text,
                textAlign: "center",
                lineHeight: 1.15,
                letterSpacing: fs(-0.002),
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: fontFamily(theme.fonts.body),
                fontSize: fs(0.044),
                color: theme.colors.accent,
                textAlign: "center",
                marginTop: fs(0.018),
                lineHeight: 1.25,
              }}
            >
              {subtitle}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ——— Финальный кадр: тот же белый, что и на открытии ——— */}
      <Sequence from={durationInFrames - CLOSE} durationInFrames={CLOSE}>
        <AbsoluteFill
          style={{
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            gap: fs(0.028),
          }}
        >
          <SpinningTetra size={fs(0.58)} degreesPerSecond={72} />
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.066),
              color: theme.colors.text,
              marginTop: fs(0.03),
              letterSpacing: fs(0.002),
            }}
          >
            {site}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Подпись сайта держится весь ролик, кроме крайних кадров: промо
          смотрят без звука, и адрес должен быть виден в любой момент. */}
      <Sequence from={OPEN} durationInFrames={durationInFrames - OPEN - CLOSE}>
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: Math.round(height * 0.055),
          }}
        >
          <div
            style={{
              fontFamily: fontFamily(theme.fonts.heading),
              fontWeight: 700,
              fontSize: fs(0.034),
              color: "#fff",
              letterSpacing: fs(0.003),
              backgroundColor: "rgba(7,10,17,0.72)",
              padding: `${fs(0.014)}px ${fs(0.028)}px`,
              borderRadius: fs(0.03),
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {site}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export default SitePromo;

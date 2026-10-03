import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Caption } from "@remotion/captions";
import { z } from "zod";
import { AuraBot3D, auraBot3DGestureSchema, CameraFX, cameraFxKindSchema, GridCard, TickerStrip } from "../../shared/components/effects";
import { AuraLogo } from "../components/AuraLogo";
import { useCaptions } from "../../shared/useCaptions";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * Aura Head (`Aura-Head`) — говорящая голова в стиле сайта aura-robotics.ru.
 *
 * Тот же конвейер, что у GTT Head (`npm run head -- --prepare/--draft/--render`),
 * но свой фрейм. Правило владельца 03.10: плашки не перекрывают лицо — все
 * плашки стоят в нижней трети над субтитрами, верх кадра отдан знаку и
 * роботу. Перечисления — отдельный белый экран: спикер уходит, робот крупно
 * показывает на пункты. Видео-вставка — через робота: он выдвигает карточку
 * сбоку, бьёт по ней, карточка разворачивается на весь экран, речь идёт за
 * кадром, потом карточка сжимается, спикер возвращается, робот задвигает
 * карточку обратно. Правила — docs/aura-head.md.
 */
const secondsAt = z.number().min(0);
const gestureSchema = z.object({ at: secondsAt, kind: auraBot3DGestureSchema });

export const robotTalkSchema = z.object({
  footage: z.string().describe("Съёмка после --prepare, внутри public"),
  cutoutSrc: z.string().describe("Вырезка спикера с альфой для dollyZoom и orbit; пусто — без неё"),
  camera: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      kind: cameraFxKindSchema,
      strength: z.number().min(0).max(2),
      originX: z.number().min(0).max(1),
      originY: z.number().min(0).max(1),
      direction: z.enum(["left", "right"]),
    }),
  ).describe("Приёмы камеры: pushIn, whipPan, dollyZoom, lowAngle, crane, orbit"),
  captionsSrc: z.string().describe("Пословные субтитры JSON внутри public"),
  captionsOffsetSeconds: z.number().describe("Сдвиг субтитров, если съёмка обрезана"),
  durationSeconds: z.number().min(1),
  safeZone: z.enum(["stories", "reels"]),
  music: z.string().describe("Подложка внутри public; пусто — без музыки"),
  musicVolume: z.number().min(0).max(1),
  hookTop: z.string(),
  hookBottom: z.string().describe("Вторая строка крючка — на жёлтом маркере"),
  logo: z.object({
    size: z.number().min(0.12).max(0.5).describe("Диаметр круга знака, доля ширины"),
    ring: z.boolean().describe("Кольцо «AURA ROBOTICS» вокруг монограммы"),
    ringSecondsPerTurn: z.number().min(3).max(120),
    reassembleEverySeconds: z.number().min(2).max(120).describe("Как часто знак пересобирается из элементов"),
    shineEverySeconds: z.number().min(1).max(120),
  }),
  bot: z.object({
    side: z.enum(["right", "left"]),
    sizeFraction: z.number().min(0.08).max(0.4).describe("Рост робота, доля высоты кадра"),
    look: z.number().min(-1).max(1).describe("Куда смотрит в покое; 0 — на зрителя"),
    gestures: z.array(gestureSchema),
    auto: z.boolean().describe("Жесты и перемещения на события монтажа автоматически"),
    hidden: z.boolean(),
    spots: z.array(
      z.object({
        at: secondsAt,
        x: z.number().min(0).max(1).describe("Где стоят ноги, доля ширины"),
        y: z.number().min(0).max(1).describe("Где стоят ноги, доля высоты"),
        facing: z.number().describe("Поворот корпуса, градусы; 0 — к зрителю"),
      }),
    ),
  }),
  cards: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      index: z.string().describe("Номер «01» мелким моно; пусто — без номера"),
      title: z.string(),
      highlight: z.string().describe("Часть заголовка под жёлтым маркером"),
      text: z.string(),
      items: z.array(z.string()).describe("Пункты перечисления: белый экран, робот показывает на каждый"),
    }),
  ),
  factories: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      logo: z.string().describe("Логотип завода внутри public"),
      name: z.string(),
      city: z.string(),
      note: z.string(),
    }),
  ),
  inserts: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      src: z.string(),
      kind: z.enum(["image", "video"]),
      label: z.string(),
      side: z.enum(["left", "right"]).describe("С какой стороны робот выдвигает карточку"),
      fullAfter: z.number().min(0).describe("Через сколько секунд после появления карточка раскрывается на весь экран"),
      fullSeconds: z.number().min(0).describe("Сколько держится на весь экран; 0 — не раскрывать"),
      trimBefore: z.number().min(0),
    }),
  ),
  tickers: z.array(z.object({ at: secondsAt, until: secondsAt, items: z.array(z.object({ name: z.string(), city: z.string() })) })),
  stats: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      prefix: z.string(),
      value: z.number(),
      suffix: z.string(),
      label: z.string(),
    }),
  ),
  cta: z.object({
    at: secondsAt,
    title: z.string(),
    button: z.string(),
    url: z.string(),
  }),
});

export type RobotTalkProps = z.infer<typeof robotTalkSchema>;

export const calculateRobotTalkMetadata: CalculateMetadataFunction<RobotTalkProps> = ({ props }) => ({
  durationInFrames: Math.ceil(props.durationSeconds * 30),
});

/** Геометрия: доли высоты. Плашки якорятся к низу — над субтитрами. */
const GEO = {
  stories: { logoTop: 0.09, captionsBottom: 0.16, rightPad: 0 },
  reels: { logoTop: 0.1, captionsBottom: 0.22, rightPad: 0.16 },
};
const SIDES = 0.07;
const AT = (seconds: number, fps: number) => Math.round(seconds * fps);
const SFX = { pop: "audio/sfx/pop.wav", swoosh: "audio/sfx/swoosh.wav", counter: "audio/sfx/counter.wav", notify: "audio/sfx/notify.wav", click: "audio/sfx/click.wav" };
const ITEM_EVERY = 0.9; // секунд между пунктами перечисления
const MOVE = 0.9; // секунд на переход робота между точками
const SLIDE = 0.8; // секунд на выдвижение карточки

const Sfx: React.FC<{ src: string; volume?: number; at?: number }> = ({ src, volume = 0.4, at = 0 }) => (
  <Sequence from={at} durationInFrames={30} layout="none">
    <Audio src={staticFile(src)} volume={() => volume} />
  </Sequence>
);

/** Жёлтый маркер под частью строки — как подсветка ключевых слов на сайте. */
const Marked: React.FC<{ text: string; highlight: string; accent: string }> = ({ text, highlight, accent }) => {
  const i = highlight ? text.indexOf(highlight) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ background: accent, padding: "0 0.12em", borderRadius: "0.12em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  );
};

/** Субтитры: страницы по 2–4 слова, текущее слово под маркером. */
const buildPages = (captions: Caption[], offsetMs: number) => {
  const pages: { from: number; to: number; words: Caption[] }[] = [];
  let cur: Caption[] = [];
  let chars = 0;
  const flush = () => {
    if (!cur.length) return;
    pages.push({ from: cur[0].startMs - offsetMs, to: cur[cur.length - 1].endMs - offsetMs, words: cur });
    cur = [];
    chars = 0;
  };
  for (const w of captions) {
    const text = w.text.trim();
    if (!text) continue;
    const gap = cur.length ? w.startMs - cur[cur.length - 1].endMs : 0;
    if (cur.length && (chars + text.length > 26 || gap > 700 || /[.!?]$/.test(cur[cur.length - 1].text.trim()))) flush();
    cur.push(w);
    chars += text.length + 1;
  }
  flush();
  return pages;
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export const RobotTalk: React.FC<RobotTalkProps> = ({
  footage,
  cutoutSrc,
  camera,
  captionsSrc,
  captionsOffsetSeconds,
  durationSeconds,
  safeZone,
  music,
  musicVolume,
  hookTop,
  hookBottom,
  logo,
  bot,
  cards,
  factories,
  inserts,
  tickers,
  stats,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { fs } = useFormat();
  const geo = GEO[safeZone];
  const captions = useCaptions(captionsSrc || null);
  const total = Math.round(durationSeconds * fps);
  const second = frame / fps;
  const heading = fontFamily(theme.fonts.heading);
  const mono = fontFamily(theme.fonts.mono);
  const ink = theme.colors.text;
  const accent = theme.colors.accent;
  const muted = theme.colors.muted;
  const line = theme.colors.line;
  const paper = theme.colors.primary;
  const sideL = width * SIDES;
  const sideR = width * (SIDES + geo.rightPad);
  const contentW = width - sideL - sideR;
  // Низ плашек: над субтитрами (две строки) с зазором.
  const plateBottom = height * geo.captionsBottom + fs(0.13);

  // ——— Знак на круге и робот рядом ———
  const logoD = width * logo.size;
  const logoR = logoD / 2;
  const botHpx = height * bot.sizeFraction; // рост робота в пикселях
  const botBox = botHpx / 0.65; // квадрат SVG: робот занимает 65 % высоты, ноги на 0,787
  const botWpx = botBox * 0.3;
  const headerTop = height * geo.logoTop;
  const groupW = logoD + (bot.hidden ? 0 : botWpx * 1.15);
  const groupLeft = Math.max(sideL, (width - sideR + sideL - groupW) / 2);
  const logoCx = bot.side === "right" ? groupLeft + logoR : groupLeft + groupW - logoR;
  const logoCy = headerTop + logoR;
  const homeSpot = { x: (bot.side === "right" ? logoCx + logoR + botWpx * 0.55 : logoCx - logoR - botWpx * 0.55) / width, y: (logoCy + logoR + botHpx * 0.08) / height, facing: 0, scale: 1 };

  // ——— Белый экран перечисления ———
  const listCards = cards.filter((c) => c.items.length > 0);
  const listNow = listCards.find((c) => second >= c.at && second < c.until);
  const listBotH = height * 0.42; // робот крупно
  const listSpot = { x: 0.24, y: 0.78, facing: 48, scale: listBotH / botHpx };

  // ——— Вставки: робот выдвигает карточку, бьёт, карточка на весь экран, сжимается, робот задвигает ———
  const smallW = width * 0.28;
  const smallH = smallW / 0.8;
  const smallY = height * 0.3; // в стороне от лица, на уровне головы; робот стоит снаружи от карточки, у края
  const insertGeom = (ins: (typeof inserts)[number]) => {
    const dur = ins.until - ins.at;
    const fullStart = ins.fullAfter;
    const fullEnd = Math.min(dur - SLIDE - 0.6, ins.fullAfter + ins.fullSeconds);
    const hasFull = ins.fullSeconds > 0 && fullEnd > fullStart + 0.2;
    const outStart = dur - SLIDE; // карточка уезжает
    const edgeX = ins.side === "left" ? sideL + botWpx * 0.7 : width - sideR - botWpx * 0.7 - smallW;
    const botX = ins.side === "left" ? (sideL + botWpx * 0.35) / width : (width - sideR - botWpx * 0.35) / width;
    return { dur, fullStart, fullEnd, hasFull, outStart, edgeX, botX };
  };

  // Точки, куда робот ходит: заданные руками плюс автоматические.
  type Spot = { at: number; x: number; y: number; facing: number; scale: number };
  const spots: Spot[] = [{ at: 0, ...homeSpot }, ...bot.spots.map((sp) => ({ ...sp, scale: 1 }))];
  if (bot.auto) {
    for (const c of listCards) {
      spots.push({ at: c.at, ...listSpot });
      spots.push({ at: c.until - 0.3, ...homeSpot });
    }
    for (const ins of inserts) {
      const g = insertGeom(ins);
      // К краю, где появится карточка, лицом к ней; на уходе — повернуться и толкнуть наружу.
      spots.push({ at: Math.max(0, ins.at - MOVE), x: g.botX, y: (smallY + smallH) / height + 0.01, facing: ins.side === "left" ? 60 : -60, scale: 1 });
      spots.push({ at: ins.at + g.dur - 0.2, ...homeSpot });
    }
  }
  spots.sort((a, b) => a.at - b.at);
  const next = [...spots].reverse().find((sp) => sp.at <= second) ?? spots[0];
  const from = spots.filter((sp) => sp.at < next.at).pop() ?? next;
  const moveT = next.at === 0 ? 1 : Math.min(1, Math.max(0, (second - next.at) / MOVE));
  const ease = smooth(moveT);
  const feetX = (from.x + (next.x - from.x) * ease) * width;
  const feetY = (from.y + (next.y - from.y) * ease) * height;
  const botScale = from.scale + (next.scale - from.scale) * ease;
  const moving = moveT > 0 && moveT < 1;
  const walk = moving ? Math.sin(moveT * Math.PI) : 0;
  const dir = next.x >= from.x ? 1 : -1;
  const facing = moving ? dir * 70 : next.facing;
  const box = botBox * botScale;
  const botLeft = feetX - box / 2;
  const botTop = feetY - box * 0.787;
  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });

  // Жесты: заданные руками плюс автоматические на события монтажа.
  const gestures = [...bot.gestures.map((g) => ({ at: AT(g.at, fps), kind: g.kind }))];
  if (bot.auto) {
    if (hookTop || hookBottom) gestures.push({ at: AT(0.5, fps), kind: "wave" });
    for (const c of cards) {
      if (c.items.length) for (let i = 0; i < c.items.length; i++) gestures.push({ at: AT(c.at + MOVE + 0.1 + i * ITEM_EVERY, fps), kind: "point" });
      else gestures.push({ at: AT(c.at + 0.1, fps), kind: "nod" });
    }
    for (const f of factories) gestures.push({ at: AT(f.at + 0.1, fps), kind: "scan" });
    for (const s of stats) gestures.push({ at: AT(s.at + 0.1, fps), kind: "jump" });
    for (const ins of inserts) {
      const g = insertGeom(ins);
      gestures.push({ at: AT(ins.at, fps), kind: "push" });
      if (g.hasFull) gestures.push({ at: AT(ins.at + g.fullStart - 0.35, fps), kind: "point" });
      gestures.push({ at: AT(ins.at + g.outStart - 0.1, fps), kind: "push" });
    }
    if (cta.title) gestures.push({ at: AT(cta.at + 0.3, fps), kind: "point" });
  }
  gestures.sort((a, b) => a.at - b.at);
  const look = listNow ? 0.9 : bot.look;

  // ——— Крючок ———
  const hookIn = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const hookOut = interpolate(frame, [AT(2.2, fps), AT(2.7, fps)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ——— Субтитры ———
  const pages = buildPages(captions, captionsOffsetSeconds * 1000);
  const ms = second * 1000;
  const page = pages.find((pg) => ms >= pg.from - 120 && ms < pg.to + 250);
  const capFont = fs(0.046);

  return (
    <AbsoluteFill style={{ background: "#0b0b0b", fontFamily: heading, color: ink }}>
      <Sequence durationInFrames={total}>
        <CameraFX footage={footage} cutout={cutoutSrc} moves={camera.map((m) => ({ fromFrame: AT(m.at, fps), toFrame: AT(m.until, fps), kind: m.kind, strength: m.strength, originX: m.originX, originY: m.originY, direction: m.direction }))} />
      </Sequence>

      {/* Светлая вуаль сверху: знак и робот должны читаться на любой съёмке. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(248,246,243,0.55) 0%, rgba(248,246,243,0) 26%)" }} />

      {/* ——— Вставки: карточка с видео в руках робота ——— */}
      {inserts.map((ins, k) => {
        const g = insertGeom(ins);
        const dur = AT(g.dur, fps);
        return (
          <Sequence key={`ins-${k}`} from={AT(ins.at, fps)} durationInFrames={dur} layout="none">
            <InsertCard ins={ins} g={g} smallW={smallW} smallH={smallH} smallY={smallY} />
            <Sfx src={SFX.swoosh} volume={0.3} />
            {g.hasFull ? <Sfx src={SFX.click} volume={0.5} at={AT(g.fullStart, fps)} /> : null}
            {g.hasFull ? <Sfx src={SFX.swoosh} volume={0.3} at={AT(g.fullEnd, fps)} /> : null}
            <Sfx src={SFX.swoosh} volume={0.25} at={AT(g.outStart, fps)} />
          </Sequence>
        );
      })}

      {/* ——— Белый экран перечисления: спикер уходит, робот показывает ——— */}
      {listCards.map((c, k) => {
        const dur = AT(c.until - c.at, fps);
        return (
          <Sequence key={`list-${k}`} from={AT(c.at, fps)} durationInFrames={dur} layout="none">
            <ListScene title={c.title} highlight={c.highlight} items={c.items} durationInFrames={dur} fs={fs} ink={ink} accent={accent} paper={paper} muted={muted} mono={mono} left={width * 0.46} right={sideR} top={height * 0.36} every={AT(ITEM_EVERY, fps)} start={AT(MOVE + 0.1, fps)} />
            <Sfx src={SFX.swoosh} volume={0.3} />
            {c.items.map((_, i) => (
              <Sfx key={i} src={SFX.pop} at={AT(MOVE + 0.1 + i * ITEM_EVERY, fps)} />
            ))}
          </Sequence>
        );
      })}

      {/* ——— Шапка: знак на круге с кольцом и робот ——— */}
      <div style={{ position: "absolute", inset: 0, opacity: logoIn }}>
        <AuraLogo size={logoD} cx={logoCx} cy={logoCy} ink={ink} accent={accent} ring={logo.ring} ringSecondsPerTurn={logo.ringSecondsPerTurn} reassembleEverySeconds={logo.reassembleEverySeconds} shineEverySeconds={logo.shineEverySeconds} font={theme.fonts.heading} />
      </div>
      {bot.hidden ? null : (
        <div style={{ position: "absolute", left: botLeft, top: botTop, width: box, height: box, opacity: logoIn, pointerEvents: "none" }}>
          <AuraBot3D gestures={gestures} look={look} facing={facing} walk={walk} light={theme.colors.primary} dark={ink} accent={accent} jumpHeight={0.5} />
        </div>
      )}

      {/* ——— Крючок: внизу над субтитрами, белая и жёлтая плашки ——— */}
      {hookTop || hookBottom ? (
        <div style={{ position: "absolute", left: sideL, bottom: plateBottom, width: contentW, opacity: Math.min(hookIn, hookOut), transform: `translateY(${(1 - hookIn) * fs(0.06)}px)`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs(0.012) }}>
          {hookTop ? <div style={{ background: "#ffffff", color: ink, fontWeight: 800, fontSize: fs(0.062), lineHeight: 1.12, padding: `${fs(0.012)}px ${fs(0.026)}px`, borderRadius: fs(0.018), letterSpacing: "-0.01em" }}>{hookTop}</div> : null}
          {hookBottom ? <div style={{ background: accent, color: ink, fontWeight: 800, fontSize: fs(0.062), lineHeight: 1.12, padding: `${fs(0.012)}px ${fs(0.026)}px`, borderRadius: fs(0.018), letterSpacing: "-0.01em" }}>{hookBottom}</div> : null}
        </div>
      ) : null}

      {/* ——— Карточки фактов 01/02/03: внизу над субтитрами ——— */}
      {cards
        .filter((c) => c.items.length === 0)
        .map((c, k) => {
          const dur = AT(c.until - c.at, fps);
          return (
            <Sequence key={`card-${k}`} from={AT(c.at, fps)} durationInFrames={dur} layout="none">
              <Card bottom={plateBottom} left={sideL} width={contentW} durationInFrames={dur} fs={fs} line={line}>
                {c.index ? <div style={{ fontFamily: mono, fontSize: fs(0.026), color: muted, letterSpacing: "0.08em" }}>{c.index}</div> : null}
                <div style={{ fontWeight: 700, fontSize: fs(0.05), lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                  <Marked text={c.title} highlight={c.highlight} accent={accent} />
                </div>
                {c.text ? <div style={{ fontSize: fs(0.032), lineHeight: 1.3, color: muted }}>{c.text}</div> : null}
              </Card>
              <Sfx src={SFX.pop} />
            </Sequence>
          );
        })}

      {/* ——— Карточки заводов: логотип, название, город ——— */}
      {factories.map((f, k) => {
        const dur = AT(f.until - f.at, fps);
        const tile = fs(0.17);
        return (
          <Sequence key={`fac-${k}`} from={AT(f.at, fps)} durationInFrames={dur} layout="none">
            <Card bottom={plateBottom} left={sideL} width={contentW} durationInFrames={dur} fs={fs} line={line} row>
              <div style={{ width: tile, height: tile, borderRadius: fs(0.02), border: `2px solid ${line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Img src={staticFile(f.logo)} style={{ maxWidth: tile * 0.74, maxHeight: tile * 0.6, objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: fs(0.006) }}>
                <div style={{ fontWeight: 700, fontSize: fs(0.05), lineHeight: 1.1, letterSpacing: "-0.01em" }}>{f.name}</div>
                <div style={{ fontSize: fs(0.03), color: muted }}>{f.city}</div>
                {f.note ? <div style={{ fontSize: fs(0.03), lineHeight: 1.3, marginTop: fs(0.006) }}>{f.note}</div> : null}
              </div>
            </Card>
            <Sfx src={SFX.pop} />
          </Sequence>
        );
      })}

      {/* ——— Бегущая строка заводов ——— */}
      {tickers.map((tk, k) => (
        <Sequence key={`tick-${k}`} from={AT(tk.at, fps)} durationInFrames={AT(tk.until - tk.at, fps)} layout="none">
          <TickerStrip items={tk.items} y={0.6} heightFraction={0.052} speed={150} background={ink} accent={accent} durationInFrames={AT(tk.until - tk.at, fps)} />
          <Sfx src={SFX.swoosh} volume={0.25} />
        </Sequence>
      ))}

      {/* ——— Тёмная полоса с цифрой, как блок «Более 100 производителей» ——— */}
      {stats.map((s, k) => (
        <Sequence key={`stat-${k}`} from={AT(s.at, fps)} durationInFrames={AT(s.until - s.at, fps)} layout="none">
          <StatBand prefix={s.prefix} value={s.value} suffix={s.suffix} label={s.label} durationInFrames={AT(s.until - s.at, fps)} fs={fs} ink={ink} accent={accent} muted="#bdbab6" sideL={sideL} />
          <Sfx src={SFX.counter} volume={0.35} />
        </Sequence>
      ))}

      {/* ——— Призыв: жёлтый блок и чёрная пилюля, внизу над субтитрами ——— */}
      {cta.title ? (
        <Sequence from={AT(cta.at, fps)} durationInFrames={Math.max(1, total - AT(cta.at, fps))} layout="none">
          <Cta title={cta.title} button={cta.button} url={cta.url} fs={fs} ink={ink} accent={accent} bottom={plateBottom} left={sideL} width={contentW} />
          <Sfx src={SFX.notify} volume={0.35} />
        </Sequence>
      ) : null}

      {/* ——— Субтитры: белая плашка, слово под маркером ——— */}
      {page ? (
        <div style={{ position: "absolute", left: sideL, right: sideR, bottom: height * geo.captionsBottom, display: "flex", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: fs(0.02), padding: `${fs(0.014)}px ${fs(0.024)}px`, fontWeight: 700, fontSize: capFont, lineHeight: 1.25, textAlign: "center", boxShadow: "0 10px 26px rgba(0,0,0,0.25)", letterSpacing: "-0.01em" }}>
            {page.words.map((w, i) => {
              const on = ms >= w.startMs - captionsOffsetSeconds * 1000;
              const cur = on && ms < w.endMs - captionsOffsetSeconds * 1000 + 80;
              return (
                <span key={i} style={{ background: cur ? accent : "transparent", borderRadius: "0.12em", padding: "0 0.08em", color: ink, opacity: on ? 1 : 0.55 }}>
                  {w.text.trim()}
                  {i < page.words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {music ? (
        <Sequence durationInFrames={total}>
          <Audio
            src={staticFile(music)}
            loop
            volume={(f) =>
              musicVolume *
              Math.min(
                interpolate(f, [0, AT(1.2, fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                interpolate(f, [total - AT(2, fps), total - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              )
            }
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** Карточка-вставка: выезжает сбоку (её толкает робот), по удару раскрывается на весь экран, сжимается, уезжает. */
const InsertCard: React.FC<{
  ins: RobotTalkProps["inserts"][number];
  g: { dur: number; fullStart: number; fullEnd: number; hasFull: boolean; outStart: number; edgeX: number; botX: number };
  smallW: number;
  smallH: number;
  smallY: number;
}> = ({ ins, g, smallW, smallH, smallY }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const offX = ins.side === "left" ? -smallW * 1.1 : width + smallW * 0.1;
  // Фазы: выезд → (раскрытие → полный экран → сжатие) → выезд обратно.
  const slideIn = smooth(t / SLIDE);
  const slideOut = t >= g.outStart ? smooth((t - g.outStart) / SLIDE) : 0;
  const open = g.hasFull ? interpolate(t, [g.fullStart, g.fullStart + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) }) : 0;
  const close = g.hasFull ? interpolate(t, [g.fullEnd, g.fullEnd + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;
  const full = Math.max(0, Math.min(1, open - close));
  const smallX = g.edgeX + (offX - g.edgeX) * (1 - slideIn) + (offX - g.edgeX) * slideOut;
  const x = smallX + (0 - smallX) * full;
  const y = smallY + (0 - smallY) * full;
  const w = smallW + (width - smallW) * full;
  const h = smallH + (height - smallH) * full;
  const tilt = (ins.side === "left" ? 14 : -14) * (1 - full);
  return <GridCard src={ins.src} kind={ins.kind} label={ins.label} trimBefore={Math.round(ins.trimBefore * fps)} rect={{ x, y, w, h, tilt, opacity: 1 }} />;
};

/** Белый экран с перечислением: заголовок и пункты справа, место под робота слева. */
const ListScene: React.FC<{
  title: string;
  highlight: string;
  items: string[];
  durationInFrames: number;
  fs: (f: number) => number;
  ink: string;
  accent: string;
  paper: string;
  muted: string;
  mono: string;
  left: number;
  right: number;
  top: number;
  every: number;
  start: number;
}> = ({ title, highlight, items, durationInFrames, fs, ink, accent, paper, muted, mono, left, right, top, every, start }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const inW = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outW = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const reveal = Math.min(inW, outW);
  const cell = Math.round(width / 18);
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)` }}>
      <AbsoluteFill style={{ background: paper }}>
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.7 }}>
          <defs>
            <pattern id="list-grid" width={cell} height={cell} patternUnits="userSpaceOnUse">
              <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke="#e6e3df" strokeWidth={1.5} />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#list-grid)" />
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", left, right, top, display: "flex", flexDirection: "column", gap: fs(0.03) }}>
        <div style={{ fontFamily: mono, fontSize: fs(0.026), color: muted, letterSpacing: "0.08em" }}>{String(items.length).padStart(2, "0")} ПУНКТА</div>
        <div style={{ fontWeight: 800, fontSize: fs(0.058), lineHeight: 1.1, letterSpacing: "-0.015em", color: ink }}>
          <Marked text={title} highlight={highlight} accent={accent} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: fs(0.02), marginTop: fs(0.01) }}>
          {items.map((it, i) => {
            const s = spring({ frame: frame - start - i * every, fps, config: { damping: 14, stiffness: 140 } });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: fs(0.022), opacity: s, transform: `translateX(${(1 - s) * -fs(0.06)}px)` }}>
                <span style={{ fontFamily: mono, fontSize: fs(0.026), color: muted, width: fs(0.05) }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ background: "#ffffff", border: "2px solid #d9d7d5", borderRadius: fs(0.02), padding: `${fs(0.016)}px ${fs(0.026)}px`, fontWeight: 700, fontSize: fs(0.042), lineHeight: 1.2, color: ink, boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}>{it}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Белая карточка с рамкой, как карточки «Чем мы занимаемся» на сайте; якорь — низ. */
const Card: React.FC<{
  bottom: number;
  left: number;
  width: number;
  durationInFrames: number;
  fs: (f: number) => number;
  line: string;
  row?: boolean;
  children: React.ReactNode;
}> = ({ bottom, left, width, durationInFrames, fs, line, row, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 130, mass: 0.8 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom,
        width,
        background: "#ffffff",
        border: `2px solid ${line}`,
        borderRadius: fs(0.03),
        padding: `${fs(0.028)}px ${fs(0.036)}px`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: row ? "row" : "column",
        alignItems: row ? "center" : "flex-start",
        gap: row ? fs(0.03) : fs(0.01),
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        opacity: Math.min(s, out),
        transform: `translateY(${(1 - s) * fs(0.08)}px) scale(${0.96 + 0.04 * s})`,
        transformOrigin: "bottom center",
      }}
    >
      {children}
    </div>
  );
};

const StatBand: React.FC<{ prefix: string; value: number; suffix: string; label: string; durationInFrames: number; fs: (f: number) => number; ink: string; accent: string; muted: string; sideL: number }> = ({ prefix, value, suffix, label, durationInFrames, fs, ink, accent, muted, sideL }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const reveal = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const n = Math.round(interpolate(frame, [4, AT(1.1, fps)], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  const bandH = height * 0.15;
  return (
    <div style={{ position: "absolute", left: 0, top: height * 0.56, width, height: bandH, background: ink, color: "#fff", transform: `scaleY(${reveal})`, transformOrigin: "center", opacity: out, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: sideL, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: fs(0.02) }}>
        {prefix ? <span style={{ fontSize: fs(0.05), fontWeight: 500 }}>{prefix}</span> : null}
        <span style={{ fontSize: fs(0.11), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {n}
          {suffix}
        </span>
      </div>
      <div style={{ fontSize: fs(0.03), color: muted, marginTop: fs(0.008) }}>
        <span style={{ display: "inline-block", width: fs(0.04), height: fs(0.006), background: accent, marginRight: fs(0.012), verticalAlign: "middle" }} />
        {label}
      </div>
    </div>
  );
};

const Cta: React.FC<{ title: string; button: string; url: string; fs: (f: number) => number; ink: string; accent: string; bottom: number; left: number; width: number }> = ({ title, button, url, fs, ink, accent, bottom, left, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const b = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", left, bottom, width, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs(0.018), opacity: s, transform: `translateY(${(1 - s) * fs(0.06)}px)` }}>
      <div style={{ background: accent, color: ink, fontWeight: 800, fontSize: fs(0.05), lineHeight: 1.12, padding: `${fs(0.016)}px ${fs(0.028)}px`, borderRadius: fs(0.02), letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: fs(0.02), transform: `scale(${Math.max(0, b)})`, transformOrigin: "left center" }}>
        <div style={{ background: ink, color: "#fff", fontWeight: 600, fontSize: fs(0.036), padding: `${fs(0.016)}px ${fs(0.034)}px`, borderRadius: fs(0.06), boxShadow: "0 10px 20px rgba(0,0,0,0.3)" }}>{button}</div>
        {url ? <div style={{ background: "#fff", color: ink, fontWeight: 600, fontSize: fs(0.03), padding: `${fs(0.012)}px ${fs(0.022)}px`, borderRadius: fs(0.06) }}>{url}</div> : null}
      </div>
    </div>
  );
};

export default RobotTalk;

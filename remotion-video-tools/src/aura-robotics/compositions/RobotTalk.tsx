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
import { AuraBot3D, auraBot3DGestureSchema, CameraFX, cameraFxKindSchema, GridCard, TickerStrip, type CameraFxMove } from "../../shared/components/effects";
import { AuraLogo } from "../components/AuraLogo";
import { useCaptions } from "../../shared/useCaptions";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * Aura Head (`Aura-Head`) — говорящая голова в стиле сайта aura-robotics.ru.
 *
 * Монтаж из нескольких отрезков съёмки (`segments`): фронтальный ракурс и
 * боковой чередуются, между ними — отмах камеры (whip pan). Правила владельца
 * 03.10: лицо не перекрывается ничем. Плашки (крючок, карточки, заводы,
 * призыв) живут только на фронтальных отрезках, внизу над субтитрами; на
 * боковых — только субтитры, бегущая строка и полоса с цифрой на уровне
 * груди. Перечисление — белый экран: спикер уходит, робот показывает на
 * пункты. Видео-вставка — сюжет с роботом: он подходит к краю, тянет карточку
 * с видео в кадр, бьёт по ней, карточка раскрывается на весь экран (речь за
 * кадром), сжимается, робот выталкивает её обратно. Правила — docs/aura-head.md.
 */
const secondsAt = z.number().min(0);
const gestureSchema = z.object({ at: secondsAt, kind: auraBot3DGestureSchema });

export const robotTalkSchema = z.object({
  segments: z
    .array(
      z.object({
        src: z.string().describe("Съёмка внутри public"),
        from: secondsAt.describe("С какой секунды съёмки"),
        to: secondsAt.describe("По какую секунду съёмки"),
        layout: z.enum(["front", "side"]).describe("front — спикер по центру, есть место под плашки; side — профиль, плашек нет"),
        captionsSrc: z.string().describe("Пословные субтитры этой съёмки"),
        cutout: z.string().describe("Вырезка спикера для dollyZoom и orbit; пусто — без неё"),
        whipIn: z.boolean().describe("Отмах камеры на входе в отрезок"),
      }),
    )
    .describe("Отрезки монтажа по порядку; пусто — один ролик footage"),
  footage: z.string().describe("Съёмка одним куском, если нет segments"),
  cutoutSrc: z.string(),
  captionsSrc: z.string(),
  captionsOffsetSeconds: z.number(),
  durationSeconds: z.number().min(1).describe("Длительность для режима одного куска"),
  camera: z
    .array(
      z.object({
        at: secondsAt,
        until: secondsAt,
        kind: cameraFxKindSchema,
        strength: z.number().min(0).max(2),
        originX: z.number().min(0).max(1),
        originY: z.number().min(0).max(1),
        direction: z.enum(["left", "right"]),
      }),
    )
    .describe("Приёмы камеры в секундах монтажа"),
  safeZone: z.enum(["stories", "reels"]),
  music: z.string(),
  musicVolume: z.number().min(0).max(1),
  hookTop: z.string(),
  hookBottom: z.string(),
  logo: z.object({
    size: z.number().min(0.12).max(0.5),
    ring: z.boolean(),
    ringSecondsPerTurn: z.number().min(3).max(120),
    reassembleEverySeconds: z.number().min(2).max(120),
    shineEverySeconds: z.number().min(1).max(120),
  }),
  bot: z.object({
    side: z.enum(["right", "left"]),
    sizeFraction: z.number().min(0.08).max(0.4),
    look: z.number().min(-1).max(1),
    gestures: z.array(gestureSchema),
    auto: z.boolean(),
    hidden: z.boolean(),
    spots: z.array(z.object({ at: secondsAt, x: z.number().min(0).max(1), y: z.number().min(0).max(1), facing: z.number() })),
  }),
  cards: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      index: z.string(),
      title: z.string(),
      highlight: z.string(),
      text: z.string(),
      items: z.array(z.string()).describe("Пункты: белый экран с роботом"),
    }),
  ),
  factories: z.array(z.object({ at: secondsAt, until: secondsAt, logo: z.string(), name: z.string(), city: z.string(), note: z.string() })),
  inserts: z.array(
    z.object({
      at: secondsAt,
      until: secondsAt,
      src: z.string(),
      kind: z.enum(["image", "video"]),
      label: z.string(),
      side: z.enum(["left", "right"]),
      fullAfter: z.number().min(0).describe("Через сколько секунд робот бьёт по карточке и она раскрывается"),
      fullSeconds: z.number().min(0).describe("Сколько держится на весь экран; 0 — не раскрывать"),
      trimBefore: z.number().min(0),
    }),
  ),
  tickers: z.array(z.object({ at: secondsAt, until: secondsAt, items: z.array(z.object({ name: z.string(), city: z.string() })) })),
  stats: z.array(z.object({ at: secondsAt, until: secondsAt, prefix: z.string(), value: z.number(), suffix: z.string(), label: z.string() })),
  cta: z.object({ at: secondsAt, title: z.string(), button: z.string(), url: z.string() }),
});

export type RobotTalkProps = z.infer<typeof robotTalkSchema>;

const totalSeconds = (p: RobotTalkProps) => (p.segments.length ? p.segments.reduce((a, s) => a + Math.max(0, s.to - s.from), 0) : p.durationSeconds);

export const calculateRobotTalkMetadata: CalculateMetadataFunction<RobotTalkProps> = ({ props }) => ({
  durationInFrames: Math.ceil(totalSeconds(props) * 30),
});

const GEO = {
  stories: { logoTop: 0.09, captionsBottom: 0.16, rightPad: 0 },
  reels: { logoTop: 0.1, captionsBottom: 0.22, rightPad: 0.16 },
};
const SIDES = 0.07;
const AT = (seconds: number, fps: number) => Math.round(seconds * fps);
const SFX = { pop: "audio/sfx/pop.wav", swoosh: "audio/sfx/swoosh.wav", counter: "audio/sfx/counter.wav", notify: "audio/sfx/notify.wav", click: "audio/sfx/click.wav" };
const ITEM_EVERY = 0.9;
const MOVE = 0.9; // переход робота между точками
const PULL = 1.6; // робот тянет карточку в кадр
const SHOVE = 1.2; // робот выталкивает карточку
const WHIP = 0.22; // половина отмаха, секунд

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const Sfx: React.FC<{ src: string; volume?: number; at?: number }> = ({ src, volume = 0.4, at = 0 }) => (
  <Sequence from={at} durationInFrames={30} layout="none">
    <Audio src={staticFile(src)} volume={() => volume} />
  </Sequence>
);

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

/** Страницы субтитров: 2–4 слова, не длиннее 22 знаков, разрыв на паузе и точке. */
const buildPages = (captions: Caption[]) => {
  const pages: { from: number; to: number; words: Caption[] }[] = [];
  let cur: Caption[] = [];
  let chars = 0;
  const flush = () => {
    if (!cur.length) return;
    pages.push({ from: cur[0].startMs, to: cur[cur.length - 1].endMs, words: cur });
    cur = [];
    chars = 0;
  };
  for (const w of captions) {
    const text = w.text.trim();
    if (!text) continue;
    const gap = cur.length ? w.startMs - cur[cur.length - 1].endMs : 0;
    if (cur.length && (chars + text.length > 22 || gap > 650 || /[.!?]$/.test(cur[cur.length - 1].text.trim()))) flush();
    cur.push(w);
    chars += text.length + 1;
  }
  flush();
  return pages;
};

export const RobotTalk: React.FC<RobotTalkProps> = (props) => {
  const { segments, footage, cutoutSrc, captionsSrc, captionsOffsetSeconds, camera, safeZone, music, musicVolume, hookTop, hookBottom, logo, bot, cards, factories, inserts, tickers, stats, cta } = props;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { fs } = useFormat();
  const geo = GEO[safeZone];
  const total = Math.round(totalSeconds(props) * fps);
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
  const plateBottom = height * geo.captionsBottom + fs(0.14);

  // ——— Отрезки монтажа ———
  type Seg = RobotTalkProps["segments"][number] & { start: number; len: number };
  const segs: Seg[] = [];
  if (segments.length) {
    let acc = 0;
    for (const s of segments) {
      const len = Math.max(0, s.to - s.from);
      segs.push({ ...s, start: acc, len });
      acc += len;
    }
  } else {
    segs.push({ src: footage, from: captionsOffsetSeconds, to: captionsOffsetSeconds + totalSeconds(props), layout: "front", captionsSrc, cutout: cutoutSrc, whipIn: false, start: 0, len: totalSeconds(props) });
  }
  const segAt = (s: number) => segs.find((g) => s >= g.start && s < g.start + g.len) ?? segs[segs.length - 1];
  const frontAt = (s: number) => segAt(s).layout === "front";

  // ——— Знак и домашняя точка робота ———
  const logoD = width * logo.size;
  const logoR = logoD / 2;
  const botHpx = height * bot.sizeFraction;
  const botBox = botHpx / 0.65;
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
  const listSpot = { x: 0.24, y: 0.78, facing: 48, scale: (height * 0.42) / botHpx };

  // ——— Вставки: сюжет с роботом ———
  const smallW = width * 0.26;
  const smallH = smallW / 0.8;
  const smallY = height * 0.27;
  const insertGeom = (ins: (typeof inserts)[number]) => {
    const dur = ins.until - ins.at;
    const fullStart = Math.max(PULL + 0.5, ins.fullAfter);
    const outStart = dur - SHOVE;
    const fullEnd = Math.min(outStart - 0.7, fullStart + ins.fullSeconds);
    const hasFull = ins.fullSeconds > 0 && fullEnd > fullStart + 0.3;
    const right = ins.side === "right";
    const cardX = right ? width - sideR - botWpx * 0.45 - smallW : sideL + botWpx * 0.45; // где карточка стоит, в стороне от лица
    const edgeX = right ? (width - botWpx * 0.1) / width : (botWpx * 0.1) / width; // робот у самого края
    const pullX = right ? (width - sideR - botWpx * 0.35) / width : (sideL + botWpx * 0.35) / width; // куда отходит, тянув
    const feetY = (smallY + smallH) / height + 0.01;
    return { dur, fullStart, fullEnd, hasFull, outStart, cardX, edgeX, pullX, feetY, right };
  };

  // ——— Маршрут робота ———
  type Spot = { at: number; x: number; y: number; facing: number; scale: number; dur: number };
  const spots: Spot[] = [{ at: 0, ...homeSpot, dur: MOVE }, ...bot.spots.map((sp) => ({ ...sp, scale: 1, dur: MOVE }))];
  if (bot.auto) {
    for (const c of listCards) {
      spots.push({ at: c.at, ...listSpot, dur: MOVE });
      spots.push({ at: c.until - 0.3, ...homeSpot, dur: MOVE });
    }
    for (const ins of inserts) {
      const g = insertGeom(ins);
      const face = g.right ? -60 : 60; // лицом к карточке
      spots.push({ at: Math.max(0, ins.at - MOVE - 0.2), x: g.edgeX, y: g.feetY, facing: face, scale: 1, dur: MOVE });
      spots.push({ at: ins.at, x: g.pullX, y: g.feetY, facing: face, scale: 1, dur: PULL }); // тянет
      spots.push({ at: ins.at + g.outStart, x: g.edgeX, y: g.feetY, facing: face, scale: 1, dur: SHOVE }); // выталкивает
      spots.push({ at: ins.at + g.dur - 0.1, ...homeSpot, dur: MOVE });
    }
  }
  spots.sort((a, b) => a.at - b.at);
  const next = [...spots].reverse().find((sp) => sp.at <= second) ?? spots[0];
  const from = spots.filter((sp) => sp.at < next.at).pop() ?? next;
  const moveT = next.at === 0 ? 1 : Math.min(1, Math.max(0, (second - next.at) / next.dur));
  const ease = smooth(moveT);
  const feetX = (from.x + (next.x - from.x) * ease) * width;
  const feetY = (from.y + (next.y - from.y) * ease) * height;
  const botScale = from.scale + (next.scale - from.scale) * ease;
  const moving = moveT > 0 && moveT < 1;
  const walk = moving ? Math.sin(moveT * Math.PI) : 0;
  const dirX = next.x >= from.x ? 1 : -1;
  // Тянет и толкает — боком, лицом к карточке; обычные переходы — по ходу движения.
  const facing = moving && next.dur === MOVE ? dirX * 70 : next.facing;
  const box = botBox * botScale;
  const botLeft = feetX - box / 2;
  const botTop = feetY - box * 0.787;
  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });

  // ——— Жесты ———
  const gestures = [...bot.gestures.map((g) => ({ at: AT(g.at, fps), kind: g.kind }))];
  if (bot.auto) {
    if (hookTop || hookBottom) gestures.push({ at: AT(0.5, fps), kind: "wave" });
    for (const c of cards) {
      if (c.items.length) for (let i = 0; i < c.items.length; i++) gestures.push({ at: AT(c.at + MOVE + 0.1 + i * ITEM_EVERY, fps), kind: "point" });
      else if (frontAt(c.at)) gestures.push({ at: AT(c.at + 0.1, fps), kind: "nod" });
    }
    for (const f of factories) if (frontAt(f.at)) gestures.push({ at: AT(f.at + 0.1, fps), kind: "scan" });
    for (const s of stats) gestures.push({ at: AT(s.at + 0.1, fps), kind: "jump" });
    for (const ins of inserts) {
      const g = insertGeom(ins);
      gestures.push({ at: AT(ins.at - 0.1, fps), kind: "point" }); // хватает и тянет
      if (g.hasFull) gestures.push({ at: AT(ins.at + g.fullStart - 0.3, fps), kind: "push" }); // удар
      gestures.push({ at: AT(ins.at + g.outStart - 0.05, fps), kind: "push" }); // выталкивает
    }
    if (cta.title) gestures.push({ at: AT(cta.at + 0.3, fps), kind: "point" });
  }
  gestures.sort((a, b) => a.at - b.at);
  const look = listNow ? 0.9 : bot.look;

  // ——— Приёмы камеры: заданные + отмахи на стыках отрезков ———
  const movesFor = (seg: Seg): CameraFxMove[] => {
    const out: CameraFxMove[] = camera
      .filter((m) => m.until > seg.start && m.at < seg.start + seg.len)
      .map((m) => ({ fromFrame: AT(m.at - seg.start, fps), toFrame: AT(m.until - seg.start, fps), kind: m.kind, strength: m.strength, originX: m.originX, originY: m.originY, direction: m.direction }));
    const idx = segs.indexOf(seg);
    const nextSeg = segs[idx + 1];
    const w = AT(WHIP, fps);
    if (seg.whipIn && idx > 0) out.push({ fromFrame: -w, toFrame: w, kind: "whipPan", strength: 1, originX: 0.5, originY: 0.5, direction: "right" });
    if (nextSeg?.whipIn) out.push({ fromFrame: AT(seg.len, fps) - w, toFrame: AT(seg.len, fps) + w, kind: "whipPan", strength: 1, originX: 0.5, originY: 0.5, direction: "right" });
    return out;
  };

  // ——— Крючок ———
  const hookIn = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const hookOut = interpolate(frame, [AT(2.2, fps), AT(2.7, fps)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0b0b0b", fontFamily: heading, color: ink }}>
      {/* ——— Съёмка по отрезкам, с приёмами камеры ——— */}
      {segs.map((seg, i) => (
        <Sequence key={`seg-${i}`} from={AT(seg.start, fps)} durationInFrames={Math.max(1, AT(seg.len, fps))} layout="none">
          <CameraFX footage={seg.src} cutout={seg.cutout} trimBefore={AT(seg.from, fps)} moves={movesFor(seg)} />
          {seg.whipIn && i > 0 ? <Sfx src={SFX.swoosh} volume={0.45} /> : null}
        </Sequence>
      ))}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(248,246,243,0.55) 0%, rgba(248,246,243,0) 26%)" }} />

      {/* ——— Вставки ——— */}
      {inserts.map((ins, k) => {
        const g = insertGeom(ins);
        const dur = AT(g.dur, fps);
        return (
          <Sequence key={`ins-${k}`} from={AT(ins.at, fps)} durationInFrames={dur} layout="none">
            <InsertCard ins={ins} g={g} smallW={smallW} smallH={smallH} smallY={smallY} />
            <Sfx src={SFX.swoosh} volume={0.25} />
            {g.hasFull ? <Sfx src={SFX.click} volume={0.5} at={AT(g.fullStart, fps)} /> : null}
            {g.hasFull ? <Sfx src={SFX.swoosh} volume={0.3} at={AT(g.fullEnd, fps)} /> : null}
            <Sfx src={SFX.swoosh} volume={0.25} at={AT(g.outStart, fps)} />
          </Sequence>
        );
      })}

      {/* ——— Белый экран перечисления ——— */}
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

      {/* ——— Шапка: знак и робот ——— */}
      <div style={{ position: "absolute", inset: 0, opacity: logoIn }}>
        <AuraLogo size={logoD} cx={logoCx} cy={logoCy} ink={ink} accent={accent} ring={logo.ring} ringSecondsPerTurn={logo.ringSecondsPerTurn} reassembleEverySeconds={logo.reassembleEverySeconds} shineEverySeconds={logo.shineEverySeconds} font={theme.fonts.heading} />
      </div>
      {bot.hidden ? null : (
        <div style={{ position: "absolute", left: botLeft, top: botTop, width: box, height: box, opacity: logoIn, pointerEvents: "none" }}>
          <AuraBot3D gestures={gestures} look={look} facing={facing} walk={walk} light={theme.colors.primary} dark={ink} accent={accent} jumpHeight={0.5} />
        </div>
      )}

      {/* ——— Плашки: только на фронтальных отрезках ——— */}
      {(hookTop || hookBottom) && frontAt(0.1) ? (
        <div style={{ position: "absolute", left: sideL, bottom: plateBottom, width: contentW, opacity: Math.min(hookIn, hookOut), transform: `translateY(${(1 - hookIn) * fs(0.06)}px)`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs(0.012) }}>
          {hookTop ? <div style={{ background: "#ffffff", color: ink, fontWeight: 800, fontSize: fs(0.062), lineHeight: 1.12, padding: `${fs(0.012)}px ${fs(0.026)}px`, borderRadius: fs(0.018), letterSpacing: "-0.01em" }}>{hookTop}</div> : null}
          {hookBottom ? <div style={{ background: accent, color: ink, fontWeight: 800, fontSize: fs(0.062), lineHeight: 1.12, padding: `${fs(0.012)}px ${fs(0.026)}px`, borderRadius: fs(0.018), letterSpacing: "-0.01em" }}>{hookBottom}</div> : null}
        </div>
      ) : null}

      {cards
        .filter((c) => c.items.length === 0 && frontAt(c.at))
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

      {factories
        .filter((f) => frontAt(f.at))
        .map((f, k) => {
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

      {/* ——— Бегущая строка и полоса с цифрой — на уровне груди ——— */}
      {tickers.map((tk, k) => (
        <Sequence key={`tick-${k}`} from={AT(tk.at, fps)} durationInFrames={AT(tk.until - tk.at, fps)} layout="none">
          <TickerStrip items={tk.items} y={0.66} heightFraction={0.052} speed={150} background={ink} accent={accent} durationInFrames={AT(tk.until - tk.at, fps)} />
          <Sfx src={SFX.swoosh} volume={0.25} />
        </Sequence>
      ))}
      {stats.map((s, k) => (
        <Sequence key={`stat-${k}`} from={AT(s.at, fps)} durationInFrames={AT(s.until - s.at, fps)} layout="none">
          <StatBand prefix={s.prefix} value={s.value} suffix={s.suffix} label={s.label} durationInFrames={AT(s.until - s.at, fps)} fs={fs} ink={ink} accent={accent} muted="#bdbab6" sideL={sideL} />
          <Sfx src={SFX.counter} volume={0.35} />
        </Sequence>
      ))}

      {cta.title && frontAt(cta.at) ? (
        <Sequence from={AT(cta.at, fps)} durationInFrames={Math.max(1, total - AT(cta.at, fps))} layout="none">
          <Cta title={cta.title} button={cta.button} url={cta.url} fs={fs} ink={ink} accent={accent} bottom={plateBottom} left={sideL} width={contentW} />
          <Sfx src={SFX.notify} volume={0.35} />
        </Sequence>
      ) : null}

      {/* ——— Субтитры по отрезкам ——— */}
      {segs.map((seg, i) => (
        <Sequence key={`cap-${i}`} from={AT(seg.start, fps)} durationInFrames={Math.max(1, AT(seg.len, fps))} layout="none">
          <SegmentCaptions src={seg.captionsSrc} offsetSeconds={seg.from} bottom={height * geo.captionsBottom} left={sideL} right={sideR} fs={fs} ink={ink} accent={accent} />
        </Sequence>
      ))}

      {music ? (
        <Sequence durationInFrames={total}>
          <Audio src={staticFile(music)} loop volume={(f) => musicVolume * Math.min(interpolate(f, [0, AT(1.2, fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), interpolate(f, [total - AT(2, fps), total - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** Субтитры одного отрезка: белая плашка, чёрный Inter, текущее слово под маркером. */
const SegmentCaptions: React.FC<{ src: string; offsetSeconds: number; bottom: number; left: number; right: number; fs: (f: number) => number; ink: string; accent: string }> = ({ src, offsetSeconds, bottom, left, right, fs, ink, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captions = useCaptions(src || null);
  const pages = buildPages(captions);
  const ms = (frame / fps + offsetSeconds) * 1000;
  const page = pages.find((pg) => ms >= pg.from - 120 && ms < pg.to + 260);
  if (!page) return null;
  const pin = interpolate(ms, [page.from - 120, page.from + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left, right, bottom, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(255,255,255,0.94)", borderRadius: fs(0.022), padding: `${fs(0.016)}px ${fs(0.028)}px`, fontWeight: 800, fontSize: fs(0.052), lineHeight: 1.22, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.3)", letterSpacing: "-0.012em", transform: `scale(${0.92 + 0.08 * pin})`, opacity: pin }}>
        {page.words.map((w, i) => {
          const cur = ms >= w.startMs && ms < w.endMs + 90;
          return (
            <span key={i} style={{ background: cur ? accent : "transparent", borderRadius: "0.12em", padding: "0 0.08em", color: ink }}>
              {w.text.trim()}
              {i < page.words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Карточка-вставка: робот тянет её в кадр (едет вместе с ним), по удару — весь экран, потом робот выталкивает. */
const InsertCard: React.FC<{
  ins: RobotTalkProps["inserts"][number];
  g: { dur: number; fullStart: number; fullEnd: number; hasFull: boolean; outStart: number; cardX: number; right: boolean };
  smallW: number;
  smallH: number;
  smallY: number;
}> = ({ ins, g, smallW, smallH, smallY }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const offX = g.right ? width + smallW * 0.05 : -smallW * 1.05;
  const pull = smooth(t / PULL); // та же кривая, что у шага робота: карточка идёт за рукой
  const shove = t >= g.outStart ? smooth((t - g.outStart) / SHOVE) : 0;
  const open = g.hasFull ? interpolate(t, [g.fullStart, g.fullStart + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.1)) }) : 0;
  const close = g.hasFull ? interpolate(t, [g.fullEnd, g.fullEnd + 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;
  const full = Math.max(0, Math.min(1, open - close));
  const smallX = offX + (g.cardX - offX) * pull + (offX - g.cardX) * shove;
  const x = smallX + (0 - smallX) * full;
  const y = smallY + (0 - smallY) * full;
  const w = smallW + (width - smallW) * full;
  const h = smallH + (height - smallH) * full;
  // Пока тянут — карточка чуть наклонена «за рукой», в покое — лёгкий 3D-наклон к спикеру.
  const tilt = ((g.right ? -14 : 14) + (g.right ? 10 : -10) * (1 - pull) * (1 - shove) + (g.right ? -8 : 8) * shove) * (1 - full);
  const bob = Math.sin(t * 9) * 4 * Math.sin(pull * Math.PI) * (1 - full); // лёгкая тряска при протаскивании
  return <GridCard src={ins.src} kind={ins.kind} label={ins.label} trimBefore={Math.round(ins.trimBefore * fps)} rect={{ x, y: y + bob, w, h, tilt, opacity: 1 }} />;
};

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

const Card: React.FC<{ bottom: number; left: number; width: number; durationInFrames: number; fs: (f: number) => number; line: string; row?: boolean; children: React.ReactNode }> = ({ bottom, left, width, durationInFrames, fs, line, row, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 130, mass: 0.8 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  return (
    <div style={{ position: "absolute", left, bottom, width, background: "#ffffff", border: `2px solid ${line}`, borderRadius: fs(0.03), padding: `${fs(0.028)}px ${fs(0.036)}px`, boxSizing: "border-box", display: "flex", flexDirection: row ? "row" : "column", alignItems: row ? "center" : "flex-start", gap: row ? fs(0.03) : fs(0.01), boxShadow: "0 18px 40px rgba(0,0,0,0.22)", opacity: Math.min(s, out), transform: `translateY(${(1 - s) * fs(0.08)}px) scale(${0.96 + 0.04 * s})`, transformOrigin: "bottom center" }}>
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
  const bandH = height * 0.14;
  return (
    <div style={{ position: "absolute", left: 0, top: height * 0.6, width, height: bandH, background: ink, color: "#fff", transform: `scaleY(${reveal})`, transformOrigin: "center", opacity: out, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: sideL, boxSizing: "border-box" }}>
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

import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * ScreenCapture — запись экрана сайта в макете ноутбука или телефона.
 *
 * Запись приходит одним длинным видео реального сеанса, а в ролик идут
 * куски: каждый — со своего места записи и со своей скоростью, чтобы
 * уложиться в реплику. Загрузки страниц между кусками вырезаны.
 *
 * ——— Курсор ———
 *
 * Курсор рисуется здесь, а не записан в видео. В headless-браузере
 * системного курсора нет, а пошаговое движение настоящей мыши на
 * тяжёлых страницах (WebGL-фон) растягивало запись в десять раз. При
 * записи настоящая мышь прыгает в точку наведения — hover-эффекты сайта
 * живые, — а плавный путь до неё хранится списком событий и рисуется по
 * времени записи. Поэтому курсор всегда совпадает с тем, что под ним
 * подсвечено, и при любой скорости куска.
 *
 * ——— Камера ———
 *
 * Страница шириной 1440 в вертикальном кадре мелкая. Камера плавно
 * наезжает к курсору и держит его ближе к центру, как в Screen Studio:
 * наезд в начале каждого блока, отъезд в конце.
 */
export const captureSegmentSchema = z.object({
  from: z.number().int().describe("Кадр ролика, с которого идёт кусок"),
  to: z.number().int().describe("Кадр ролика, на котором кусок кончается"),
  rec: z.number().describe("Секунда записи, с которой начинается кусок"),
  rate: z.number().describe("Скорость записи в куске"),
});
export const cursorEventSchema = z.object({
  t: z.number().describe("Секунда записи"),
  x: z.number(),
  y: z.number(),
  kind: z.enum(["from", "to", "click"]),
});

export const laptopCaptureSchema = z.object({
  src: z.string().describe("Запись экрана внутри public"),
  screenW: z.number().describe("Ширина вьюпорта записи"),
  screenH: z.number().describe("Высота вьюпорта записи"),
  segments: z.array(captureSegmentSchema),
  cursor: z.array(cursorEventSchema),
  url: z.string().describe("Адрес в строке браузера"),
  typing: z
    .object({ from: z.number().int(), to: z.number().int() })
    .describe("Кадры, когда адрес печатается"),
  zoom: z.number().min(1).max(2).describe("Наезд камеры к курсору"),
  centerY: z.number().describe("Где центр ноутбука по высоте кадра, доля"),
});
export type LaptopCaptureParams = z.infer<typeof laptopCaptureSchema>;
export type CaptureSegment = z.infer<typeof captureSegmentSchema>;
export type CursorEvent = z.infer<typeof cursorEventSchema>;

const FPS = 30;
const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Секунда записи для кадра ролика; null — кадр вне кусков. */
export const recTimeAt = (segments: CaptureSegment[], frame: number) => {
  const s = segments.find((x) => frame >= x.from && frame < x.to);
  return s ? s.rec + ((frame - s.from) / FPS) * s.rate : null;
};

/** Где курсор в момент записи t. */
export const cursorAt = (events: CursorEvent[], t: number, W: number, H: number) => {
  let pos = { x: W / 2, y: H * 0.58 };
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.t > t) break;
    if (e.kind === "from") {
      const to = events.slice(i + 1).find((x) => x.kind === "to");
      if (to && t < to.t) {
        const k = ease((t - e.t) / Math.max(0.001, to.t - e.t));
        return { x: e.x + (to.x - e.x) * k, y: e.y + (to.y - e.y) * k };
      }
    } else if (e.kind === "to") {
      pos = { x: e.x, y: e.y };
    }
  }
  return pos;
};

const CHROME = 58;

const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <>
    {press > 0 ? (
      <div
        style={{
          position: "absolute",
          left: x - 26,
          top: y - 26,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(37,99,235,0.35)",
          transform: `scale(${0.6 + press * 1.2})`,
          opacity: 1 - press,
        }}
      />
    ) : null}
    <svg
      width={30}
      height={38}
      viewBox="0 0 26 34"
      style={{
        position: "absolute",
        left: x - 3,
        top: y - 2,
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))",
      }}
    >
      <path
        d="M2 2 L2 27 L8.5 21 L13 31 L17.5 29 L13 19.5 L22 19.5 Z"
        fill="#111"
        stroke="#fff"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  </>
);

export const LaptopCapture: React.FC<LaptopCaptureParams> = ({
  src,
  screenW,
  screenH,
  segments,
  cursor,
  url,
  typing,
  zoom,
  centerY,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = recTimeAt(segments, frame);
  if (t === null) return null;

  // Ноутбук вписан по ширине кадра.
  const screenWpx = width * 0.92;
  const s0 = screenWpx / screenW;
  const innerH = (screenH + CHROME) * s0;
  const bezel = 18;
  const lidW = screenWpx + bezel * 2;
  const lidH = innerH + bezel * 2;
  const lidX = (width - lidW) / 2;
  const lidY = height * centerY - lidH / 2;

  // Блок — непрерывная цепочка кусков; наезд идёт от начала блока.
  const block = segments.reduce<{ from: number; to: number } | null>((acc, s) => {
    if (acc) return acc;
    let from = s.from, to = s.to;
    for (const x of segments) {
      if (x.to === from) from = x.from;
    }
    for (const x of segments) {
      if (x.from === to) to = x.to;
    }
    return frame >= from && frame < to ? { from, to } : null;
  }, null) ?? { from: frame, to: frame + 1 };
  let blockFrom = block.from, blockTo = block.to;
  // Цепочка могла оборваться на первом найденном куске — дотягиваем.
  let grew = true;
  while (grew) {
    grew = false;
    for (const x of segments) {
      if (x.to === blockFrom) { blockFrom = x.from; grew = true; }
      if (x.from === blockTo) { blockTo = x.to; grew = true; }
    }
  }
  const z = interpolate(
    frame,
    [blockFrom, blockFrom + 18, blockTo - 12, blockTo],
    [1, zoom, zoom, 1.02],
    { ...clamp, easing: ease },
  );
  // Фокус камеры — курсор, сглаженный по последним кадрам: камера
  // догоняет его, а не дёргается следом.
  let fx = 0, fy = 0, n = 0;
  for (let k = 0; k < 14; k++) {
    const tk = recTimeAt(segments, Math.max(blockFrom, frame - k));
    if (tk === null) continue;
    const p = cursorAt(cursor, tk, screenW, screenH);
    fx += p.x; fy += p.y; n++;
  }
  fx /= n; fy /= n;
  const focusX = lidX + bezel + fx * s0;
  const focusY = lidY + bezel + (CHROME + fy) * s0;
  // Точка фокуса едет к центру кадра по мере наезда.
  const k = (z - 1) / Math.max(0.001, zoom - 1);
  const shiftX = (width / 2 - focusX) * 0.55 * k;
  const shiftY = (height * centerY - focusY) * 0.45 * k;

  const cur = cursorAt(cursor, t, screenW, screenH);
  const lastClick = [...cursor].reverse().find((c) => c.kind === "click" && c.t <= t);
  const press = lastClick && t - lastClick.t < 0.45 ? (t - lastClick.t) / 0.45 : 0;

  const chars = Math.round(interpolate(frame, [typing.from + 4, typing.to - 4], [0, url.length], clamp));
  const typed = frame < typing.to ? url.slice(0, chars) : url;
  const caret = frame < typing.to + 10 && Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${shiftX}px, ${shiftY}px) scale(${z})`,
        transformOrigin: `${focusX}px ${focusY}px`,
      }}
    >
      {/* Крышка ноутбука */}
      <div
        style={{
          position: "absolute",
          left: lidX,
          top: lidY,
          width: lidW,
          height: lidH,
          borderRadius: 26,
          background: "linear-gradient(180deg,#1b1e26,#0c0e13)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.08)",
        }}
      />
      {/* Основание */}
      <div
        style={{
          position: "absolute",
          left: lidX - 40,
          top: lidY + lidH - 4,
          width: lidW + 80,
          height: 26,
          borderRadius: "0 0 22px 22px",
          background: "linear-gradient(180deg,#c9ccd4,#8d919b)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lidX + bezel,
          top: lidY + bezel,
          width: screenW,
          height: screenH + CHROME,
          transform: `scale(${s0})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          borderRadius: 10,
          background: "#fff",
        }}
      >
        {/* Строка браузера */}
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            height: CHROME,
            background: "#eceef2",
            borderBottom: "1px solid #d7d9df",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 20px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 26,
              flex: 1,
              maxWidth: 760,
              height: 36,
              borderRadius: 18,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              fontSize: 20,
              color: "#1f2330",
              gap: 8,
            }}
          >
            <span style={{ color: "#8a8f9c", fontSize: 18 }}>🔒</span>
            {typed}
            {caret ? <span style={{ width: 2, height: 22, background: "#2563eb" }} /> : null}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, top: CHROME, width: screenW, height: screenH, overflow: "hidden" }}>
          {segments.map((s) => (
            <Sequence key={`seg-${s.from}`} from={s.from} durationInFrames={s.to - s.from} layout="none">
              <OffthreadVideo
                src={staticFile(src)}
                muted
                trimBefore={Math.round(s.rec * FPS)}
                playbackRate={s.rate}
                style={{ width: screenW, height: screenH, display: "block" }}
              />
            </Sequence>
          ))}
          <Cursor x={cur.x} y={cur.y} press={press} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const phoneCaptureSchema = z.object({
  src: z.string().describe("Запись экрана телефона внутри public"),
  rec: z.number().describe("Секунда записи, с которой начать"),
  rate: z.number().describe("Скорость записи"),
  heightFraction: z.number().describe("Высота телефона, доля кадра"),
});
export type PhoneCaptureParams = z.infer<typeof phoneCaptureSchema>;

/** Телефон с записью экрана: въезжает снизу с лёгким поворотом. */
export const PhoneCapture: React.FC<PhoneCaptureParams> = ({ src, rec, rate, heightFraction }) => {
  const frame = useCurrentFrame();
  const { height, width, durationInFrames } = useVideoConfig();
  const h = height * heightFraction;
  const w = h * (390 / 844) + 28;
  const enter = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: ease });
  const leave = interpolate(frame, [durationInFrames - 8, durationInFrames], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: w,
          height: h + 28,
          borderRadius: 64,
          padding: 14,
          background: "#0b0d12",
          boxShadow: "0 50px 110px rgba(0,0,0,0.6), inset 0 0 0 3px rgba(255,255,255,0.12)",
          transform: `translateY(${(1 - enter) * height * 0.25 + leave * 30}px) rotate(${(1 - enter) * -6}deg) scale(${0.92 + 0.08 * enter})`,
          opacity: Math.min(enter, 1 - leave),
          position: "relative",
          left: (width - width) / 2,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 50, overflow: "hidden", position: "relative", background: "#fff" }}>
          <OffthreadVideo
            src={staticFile(src)}
            muted
            trimBefore={Math.round(rec * FPS)}
            playbackRate={rate}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              width: 120,
              height: 34,
              marginLeft: -60,
              borderRadius: 17,
              background: "#000",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

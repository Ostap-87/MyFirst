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
 * Ноутбук при обычном плане виден целиком. Камера за курсором не ездит —
 * первая версия так делала, и при наезде ноутбук мотало по кадру. Вместо
 * этого планы: в каждом блоке общий план, затем наезд к тому, о чём
 * говорят (карточки, карта маршрута), и отъезд к концу блока.
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

export const cameraShotSchema = z.object({
  frame: z.number().int().describe("Кадр ролика"),
  scale: z.number().min(1).max(2.5).describe("Приближение: 1 — ноутбук целиком"),
  fx: z.number().min(0).max(1).describe("Куда смотрим по ширине экрана, доля"),
  fy: z.number().min(0).max(1).describe("Куда смотрим по высоте экрана, доля"),
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
  shots: z
    .array(cameraShotSchema)
    .describe("Планы камеры по кадрам: между ними — плавный наезд или отъезд"),
  centerY: z.number().describe("Где центр ноутбука по высоте кадра, доля"),
  enterFrame: z.number().int().describe("Кадр, когда ноутбук въезжает в кадр"),
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
  shots,
  centerY,
  enterFrame,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = recTimeAt(segments, frame);
  if (t === null) return null;

  // Ноутбук целиком в кадре: крышка на 86% ширины, основание чуть шире.
  const bezel = 14;
  const lidW = width * 0.86;
  const screenWpx = lidW - bezel * 2;
  const s0 = screenWpx / screenW;
  const innerH = (screenH + CHROME) * s0;
  const lidH = innerH + bezel * 2 + 10;
  const lidX = (width - lidW) / 2;
  const lidY = height * centerY - lidH / 2;
  const screenX = lidX + bezel;
  const screenY = lidY + bezel + 6;

  // ——— Камера: планы из пропсов, между ними — плавный переход ———
  // Никакого слежения за курсором: камера стоит, пока план не сменится,
  // и ездит только наездом к заданной точке и отъездом обратно.
  const sorted = [...shots].sort((x, y) => x.frame - y.frame);
  const prev = [...sorted].reverse().find((x) => x.frame <= frame) ?? { frame: 0, scale: 1, fx: 0.5, fy: 0.5 };
  // Переход к плану занимает до 24 кадров от его начала, дальше план стоит.
  const from = sorted[sorted.indexOf(prev) - 1] ?? prev;
  const nextShot = sorted.find((x) => x.frame > prev.frame);
  const span = Math.min(24, nextShot ? nextShot.frame - prev.frame : 24);
  const kIn = ease(Math.min(1, (frame - prev.frame) / Math.max(1, span)));
  const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
  const z = lerp(from.scale, prev.scale, kIn);
  const fx = lerp(from.fx, prev.fx, kIn);
  const fy = lerp(from.fy, prev.fy, kIn);
  // Точка на экране, куда смотрим, при приближении встаёт в центр кадра.
  const px = screenX + fx * screenWpx;
  const py = screenY + (CHROME * s0) + fy * screenH * s0;
  const m = Math.min(1, (z - 1) / 0.35);
  const tx = (width / 2 - px) * m;
  const ty = (height * centerY - py) * m;

  // Въезд: снизу, с наклоном крышки на себя.
  const enter = interpolate(frame, [enterFrame, enterFrame + 22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  const cur = cursorAt(cursor, t, screenW, screenH);
  const lastClick = [...cursor].reverse().find((c) => c.kind === "click" && c.t <= t);
  const press = lastClick && t - lastClick.t < 0.45 ? (t - lastClick.t) / 0.45 : 0;

  const chars = Math.round(interpolate(frame, [typing.from + 4, typing.to - 4], [0, url.length], clamp));
  const typed = frame < typing.to ? url.slice(0, chars) : url;
  const caret = frame < typing.to + 10 && Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${tx}px, ${ty + (1 - enter) * height * 0.18}px) scale(${z})`,
        transformOrigin: `${px}px ${py}px`,
        opacity: enter,
      }}
    >
      {/* Свечение и отражение под ноутбуком */}
      <div
        style={{
          position: "absolute",
          left: lidX - width * 0.1,
          top: lidY - lidH * 0.25,
          width: lidW + width * 0.2,
          height: lidH * 1.5,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(37,99,235,0.32), rgba(37,99,235,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lidX,
          top: lidY + lidH + 30,
          width: lidW,
          height: 60,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,0,0,0.65), rgba(0,0,0,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `perspective(2200px) rotateX(${(1 - enter) * 14}deg)`,
          transformOrigin: `50% ${lidY + lidH}px`,
        }}
      >
        {/* Крышка */}
        <div
          style={{
            position: "absolute",
            left: lidX,
            top: lidY,
            width: lidW,
            height: lidH,
            borderRadius: 30,
            background: "linear-gradient(180deg,#23262e 0%,#0d0f14 100%)",
            boxShadow: "0 50px 100px rgba(0,0,0,0.6), inset 0 0 0 1.5px rgba(255,255,255,0.14), inset 0 2px 0 rgba(255,255,255,0.18)",
          }}
        />
        {/* Камера */}
        <div style={{ position: "absolute", left: width / 2 - 4, top: lidY + 6, width: 8, height: 8, borderRadius: 4, background: "#1c2433", boxShadow: "inset 0 0 0 2px #2f3a4d" }} />
        {/* Основание */}
        <div
          style={{
            position: "absolute",
            left: lidX - width * 0.035,
            top: lidY + lidH - 2,
            width: lidW + width * 0.07,
            height: 22,
            borderRadius: "4px 4px 26px 26px",
            background: "linear-gradient(180deg,#e4e6eb 0%,#b7bbc4 55%,#8c909a 100%)",
            boxShadow: "0 22px 40px rgba(0,0,0,0.5)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: width / 2 - 70,
            top: lidY + lidH - 2,
            width: 140,
            height: 9,
            borderRadius: "0 0 10px 10px",
            background: "linear-gradient(180deg,#a3a7b0,#c9ccd3)",
          }}
        />
        {/* Экран */}
        <div
          style={{
            position: "absolute",
            left: screenX,
            top: screenY,
            width: screenW,
            height: screenH + CHROME,
            transform: `scale(${s0})`,
            transformOrigin: "0 0",
            overflow: "hidden",
            borderRadius: 12,
            background: "#fff",
          }}
        >
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
            {segments.map((sg) => (
              <Sequence key={`seg-${sg.from}`} from={sg.from} durationInFrames={sg.to - sg.from} layout="none">
                <OffthreadVideo
                  src={staticFile(src)}
                  muted
                  trimBefore={Math.round(sg.rec * FPS)}
                  playbackRate={sg.rate}
                  style={{ width: screenW, height: screenH, display: "block" }}
                />
              </Sequence>
            ))}
            <Cursor x={cur.x} y={cur.y} press={press} />
          </div>
          {/* Блик на стекле */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)", pointerEvents: "none" }} />
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

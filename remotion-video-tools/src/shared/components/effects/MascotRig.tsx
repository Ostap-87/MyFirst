import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";
import { fontFamily } from "../../fonts";

/**
 * MascotRig — оживляет плоскую фигурку-стикер: лапка ходит вниз-вверх,
 * предплечье тянется за ней, глаза моргают заплатками.
 *
 * Фигурка приходит слоями, нарезанными заранее (PIL, `docs/process.md`):
 * `body` — тело без лапки и предплечья, с дорисованным краем; `paw` —
 * ладошка с прозрачностью; `eyesHalf` и `eyesClosed` — заплатки поверх
 * открытых глаз. Всё одного размера с исходником; слои кладутся друг на
 * друга «как есть», картинка вписывается в кадр целиком.
 *
 * ——— Как движется ———
 *
 * Ладошка: сдвиг = (slideDx, slideDy) · ½(1 − cos 2πt/T) — из верхнего
 * положения вниз и обратно, без остановок на концах: так манит настоящий
 * манэки-нэко (ладонь наружу, лапа ходит вниз-вверх). Внизу она ещё
 * наклонена на `tiltDeg` вокруг запястья (`pivotX/Y`) — рука в перспективе
 * идёт к зрителю, а не соскальзывает. Предплечье — не
 * картинка, а SVG-четырёхугольник между плечом (`limbA1`, `limbA2`,
 * неподвижны) и ладошкой (`limbB1`, `limbB2` едут вместе с ней): белая
 * заливка, чёрные штрихи по длинным сторонам, красная кайма снаружи. Его
 * перерисовка на каждом кадре и есть причина, по которой графика не рвётся:
 * вращать или двигать растровое предплечье значило бы отрывать его от плеча.
 *
 * Моргание: каждые `blinkEvery` секунд веко опускается на полкадра
 * (1 кадр `eyesHalf`), держится закрытым `blinkFrames`, поднимается.
 * Второе короткое моргание через 0,35 с на каждом третьем — чтобы глаза
 * не тикали по метроному.
 *
 * `markText` — знак на груди (например, 錢), рисуется поверх тела шрифтом
 * с иероглифами; координаты и размер — в долях картинки.
 */
const point = z.object({ x: z.number(), y: z.number() });

export const mascotRigSchema = z.object({
  body: z.string().describe("Тело без лапки, внутри public"),
  paw: z.string().describe("Ладошка с прозрачностью, внутри public"),
  eyesHalf: z.string().describe("Полуприкрытые глаза (заплатка), пусто — без"),
  eyesClosed: z.string().describe("Закрытые глаза (заплатка), пусто — без моргания"),
  shoulder: z
    .string()
    .describe("Штрихи плеча (голова, воротник) — слой поверх заливки предплечья, чтобы она их не резала; пусто — без"),
  imageWidth: z.number().int().min(1).describe("Ширина исходника, px"),
  imageHeight: z.number().int().min(1).describe("Высота исходника, px"),
  slideDx: z.number().describe("Сдвиг ладошки по X в нижней точке, px исходника"),
  slideDy: z.number().describe("Сдвиг ладошки по Y в нижней точке, px исходника"),
  wavePeriodSeconds: z.number().min(0.2).describe("Период взмаха, с"),
  tiltDeg: z.number().describe("Наклон ладошки в нижней точке, градусы; плюс — по часовой"),
  pivotX: z.number().describe("Ось наклона (запястье) по X, px исходника"),
  pivotY: z.number().describe("Ось наклона по Y, px исходника"),
  limbA1: point.describe("Плечо, верхняя сторона предплечья, px исходника"),
  limbA2: point.describe("Плечо, нижняя сторона предплечья"),
  limbB1: point.describe("Ладошка, верхняя сторона (в покое)"),
  limbB2: point.describe("Ладошка, нижняя сторона (в покое)"),
  limbStroke: z.number().min(0).describe("Толщина чёрного штриха предплечья, px исходника; 0 — без предплечья"),
  limbOuter: z.number().min(0).describe("Ширина красной каймы снаружи, px исходника"),
  limbColor: z.string().describe("Цвет каймы"),
  markText: z.string().describe("Знак на груди; пусто — без него"),
  markX: z.number().min(0).max(1).describe("Центр знака по X, доля картинки"),
  markY: z.number().min(0).max(1).describe("Центр знака по Y, доля картинки"),
  markSize: z.number().min(0).max(1).describe("Кегль знака, доля ширины картинки"),
  markColor: z.string().describe("Цвет знака"),
  blinkEverySeconds: z.number().min(0.5).describe("Как часто моргать, с"),
  blinkFrames: z.number().int().min(1).describe("Сколько кадров глаза закрыты"),
  background: z.string().describe("Цвет фона кадра"),
});

export type MascotRigParams = z.infer<typeof mascotRigSchema>;
export type MascotRigProps = Partial<MascotRigParams>;

export const mascotRigDefaults: MascotRigParams = {
  body: "",
  paw: "",
  eyesHalf: "",
  eyesClosed: "",
  shoulder: "",
  imageWidth: 1000,
  imageHeight: 1000,
  slideDx: 0,
  slideDy: 60,
  wavePeriodSeconds: 1.25,
  tiltDeg: 0,
  pivotX: 0,
  pivotY: 0,
  limbA1: { x: 0, y: 0 },
  limbA2: { x: 0, y: 0 },
  limbB1: { x: 0, y: 0 },
  limbB2: { x: 0, y: 0 },
  limbStroke: 0,
  limbOuter: 0,
  limbColor: "#e61e24",
  markText: "",
  markX: 0.5,
  markY: 0.68,
  markSize: 0.13,
  markColor: "#e61e24",
  blinkEverySeconds: 2.5,
  blinkFrames: 3,
  background: "#ffffff",
};

export const MascotRig: React.FC<MascotRigProps> = (params) => {
  const p = withDefaults(mascotRigDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!p.body) return null;

  // Картинка вписывается целиком; слои — в одном боксе, поэтому совпадают.
  const scale = Math.min(width / p.imageWidth, height / p.imageHeight);
  const boxW = p.imageWidth * scale;
  const boxH = p.imageHeight * scale;
  const box: React.CSSProperties = {
    position: "absolute",
    left: (width - boxW) / 2,
    top: (height - boxH) / 2,
    width: boxW,
    height: boxH,
  };
  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };

  const t = frame / fps;
  const k = 0.5 * (1 - Math.cos((2 * Math.PI * t) / p.wavePeriodSeconds));
  const dx = p.slideDx * k;
  const dy = p.slideDy * k;

  // Моргание: фаза внутри цикла blinkEvery; второе короткое — на каждом третьем.
  const cycleFrames = Math.round(p.blinkEverySeconds * fps);
  const cycle = Math.floor(frame / cycleFrames);
  const local = frame - cycle * cycleFrames;
  const blinkAt = (start: number) => {
    if (local === start || local === start + p.blinkFrames + 1) return "half";
    if (local > start && local <= start + p.blinkFrames) return "closed";
    return null;
  };
  const eyes =
    blinkAt(Math.round(cycleFrames * 0.6)) ??
    (cycle % 3 === 2 ? blinkAt(Math.round(cycleFrames * 0.6 + 0.35 * fps)) : null);
  const eyesSrc = eyes === "closed" ? p.eyesClosed : eyes === "half" ? p.eyesHalf || p.eyesClosed : "";

  // Лёгкое «дыхание» тела в такт взмаху — иначе двигается только лапка.
  const bob = interpolate(k, [0, 1], [1, 1.006]);

  // Предплечье: A — плечо, B — ладошка со сдвигом. Красная кайма — линия,
  // отнесённая наружу от верхней стороны на половину своей ширины.
  // Ладошка чуть наклоняется, опускаясь: рука в перспективе идёт к зрителю,
  // а не соскальзывает вниз как отдельная деталь. Концы предплечья едут за
  // теми же точками запястья, поэтому стык остаётся под чёрным штрихом.
  const theta = (p.tiltDeg * k * Math.PI) / 180;
  const turn = (q: { x: number; y: number }) => {
    const rx = q.x - p.pivotX;
    const ry = q.y - p.pivotY;
    return {
      x: p.pivotX + rx * Math.cos(theta) - ry * Math.sin(theta) + dx,
      y: p.pivotY + rx * Math.sin(theta) + ry * Math.cos(theta) + dy,
    };
  };
  const b1r = turn(p.limbB1);
  const b2r = turn(p.limbB2);
  const len = Math.hypot(b1r.x - p.limbA1.x, b1r.y - p.limbA1.y) || 1;
  // Нормаль к верхней стороне, смотрящая от нижней стороны (наружу).
  let nx = -(b1r.y - p.limbA1.y) / len;
  let ny = (b1r.x - p.limbA1.x) / len;
  const toInside = (p.limbA2.x - p.limbA1.x) * nx + (p.limbA2.y - p.limbA1.y) * ny;
  if (toInside > 0) {
    nx = -nx;
    ny = -ny;
  }
  const off = p.limbStroke / 2 + p.limbOuter / 2;
  // Кайма и штрихи заходят за свои концы: у плеча — под растровую кайму и
  // штрих головы, у ладошки — под саму ладошку (она рисуется сверху).
  // Так на стыке нет ни излома, ни ступеньки.
  const ux = (b1r.x - p.limbA1.x) / len;
  const uy = (b1r.y - p.limbA1.y) / len;
  const ext = p.limbOuter;
  const deep = p.limbStroke * 0.9;
  const b1 = { x: b1r.x + ux * deep, y: b1r.y + uy * deep };
  const b2 = { x: b2r.x + ux * deep, y: b2r.y + uy * deep };
  const o1 = { x: p.limbA1.x + nx * off - ux * ext, y: p.limbA1.y + ny * off - uy * ext };
  const o2 = { x: b1.x + nx * off + ux * ext, y: b1.y + ny * off + uy * ext };
  const back = p.limbStroke * 0.2;
  const a1 = { x: p.limbA1.x - ux * back, y: p.limbA1.y - uy * back };
  const a2 = { x: p.limbA2.x - ux * back, y: p.limbA2.y - uy * back };

  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <div style={{ ...box, transform: `scaleY(${bob})`, transformOrigin: "50% 100%" }}>
        <Img src={staticFile(p.body)} style={layer} />
        {p.markText ? (
          <div
            style={{
              position: "absolute",
              left: `${p.markX * 100}%`,
              top: `${p.markY * 100}%`,
              transform: "translate(-50%, -50%)",
              fontFamily: fontFamily("Noto Sans SC"),
              fontWeight: 700,
              fontSize: boxW * p.markSize,
              lineHeight: 1,
              color: p.markColor,
            }}
          >
            {p.markText}
          </div>
        ) : null}
        {eyesSrc ? <Img src={staticFile(eyesSrc)} style={layer} /> : null}
        {p.limbStroke > 0 ? (
          <svg
            viewBox={`0 0 ${p.imageWidth} ${p.imageHeight}`}
            style={layer}
            preserveAspectRatio="none"
          >
            <line
              x1={o1.x}
              y1={o1.y}
              x2={o2.x}
              y2={o2.y}
              stroke={p.limbColor}
              strokeWidth={p.limbOuter}
              strokeLinecap="round"
            />
            <polygon
              points={`${a1.x},${a1.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${a2.x},${a2.y}`}
              fill="#fff"
            />
            {p.shoulder ? (
              <image href={staticFile(p.shoulder)} x={0} y={0} width={p.imageWidth} height={p.imageHeight} />
            ) : null}
            <line
              x1={a1.x}
              y1={a1.y}
              x2={b1.x}
              y2={b1.y}
              stroke="#000"
              strokeWidth={p.limbStroke}
              strokeLinecap="round"
            />
            <line
              x1={a2.x}
              y1={a2.y}
              x2={b2.x}
              y2={b2.y}
              stroke="#000"
              strokeWidth={p.limbStroke}
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        {p.paw ? (
          <Img
            src={staticFile(p.paw)}
            style={{
              ...layer,
              transform: `translate(${(dx / p.imageWidth) * 100}%, ${(dy / p.imageHeight) * 100}%) rotate(${p.tiltDeg * k}deg)`,
              transformOrigin: `${(p.pivotX / p.imageWidth) * 100}% ${(p.pivotY / p.imageHeight) * 100}%`,
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

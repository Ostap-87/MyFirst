import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";
import { fontFamily } from "../../fonts";

/**
 * MascotRig — оживляет плоскую фигурку-стикер: лапка ходит вниз-вверх,
 * предплечье тянется за ней, глаза моргают.
 *
 * Фигурка целиком векторная: контуры обведены по маскам исходника
 * (скрипт `catvec.py`, skimage) и разложены на три SVG — красный силуэт,
 * белая внутренность, чёрные штрихи — плюс отдельный SVG ладошки и SVG
 * заплаток глаз. Растра нет вовсе: раньше любой стык растрового штриха с
 * векторным предплечьем был виден как ступенька из-за разного сглаживания.
 *
 * ——— Порядок слоёв ———
 *
 * силуэт (красный) → [кайма предплечья] → белая заплатка под окном → край
 * тела под лапой → РУКА (palm) → белая внутренность тела (с окном под
 * ладошку) → [заливка предплечья] → знак на груди → чёрные штрихи тела →
 * [штрихи предплечья] → глаза.
 * Рука лежит под белой внутренностью и чёрными штрихами тела: всё, что она
 * заносит внутрь тела при движении, прячется, а голова и воротник закрывают
 * место входа. Видна только ладошка — для неё в белом оставлено окно. Векторное предплечье (limb*) —
 * запасной режим, когда рука в palm без предплечья; при limbStroke 0 его нет.
 *
 * ——— Как движется ———
 *
 * Рука — цельная деталь из исходника (ладошка + предплечье + кайма), она
 * не деформируется. Сдвиг = (slideDx, slideDy) · ½(1 − cos 2πt/T) — из
 * верхнего положения вниз и обратно, без остановок на концах: так манит
 * настоящий манэки-нэко. Направление сдвига — ВДОЛЬ штриха головы, к
 * которому рука примыкает: тогда линия стыка параллельна движению, рука
 * скользит по ней и щели не открывается. `tiltDeg` — наклон вокруг
 * `pivotX/Y`; для цельной детали обычно 0. Предплечье — четырёхугольник между
 * плечом (`limbA1`, `limbA2`, неподвижны) и ладошкой (`limbB1`, `limbB2`
 * едут вместе с ней): белая заливка, чёрные штрихи по длинным сторонам,
 * красная кайма снаружи; концы уходят под плечо и под ладошку.
 *
 * Моргание: каждые `blinkEvery` секунд веко опускается на полкадра
 * (1 кадр `eyesHalf`), держится закрытым `blinkFrames`, поднимается.
 * Второе короткое моргание через 0,35 с на каждом третьем — чтобы глаза
 * не тикали по метроному.
 */
const point = z.object({ x: z.number(), y: z.number() });

export const mascotRigSchema = z.object({
  bodyRed: z.string().describe("SVG: красный силуэт тела, внутри public"),
  bodyWhite: z.string().describe("SVG: белая внутренность тела"),
  bodyBlack: z.string().describe("SVG: чёрные штрихи тела"),
  bodyEdge: z.string().describe("SVG: край тела под лапой — лежит под рукой; пусто — без"),
  bodyUnder: z.string().describe("SVG: белая заплатка тела под окном для ладошки; пусто — без"),
  palm: z.string().describe("SVG ладошки (кайма, заливка, штрих)"),
  eyesHalf: z.string().describe("SVG полуприкрытых глаз; пусто — без"),
  eyesClosed: z.string().describe("SVG закрытых глаз; пусто — без моргания"),
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
  bodyRed: "",
  bodyWhite: "",
  bodyBlack: "",
  bodyEdge: "",
  bodyUnder: "",
  palm: "",
  eyesHalf: "",
  eyesClosed: "",
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
  if (!p.bodyBlack) return null;

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
  const svgLayer = (src: string, style?: React.CSSProperties) => (
    <Img src={staticFile(src)} style={{ ...layer, ...style }} />
  );

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

  // Ладошка чуть наклоняется, опускаясь. Концы предплечья едут за теми же
  // точками запястья, поэтому стык всегда под ладошкой.
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
  const ux = (b1r.x - p.limbA1.x) / len;
  const uy = (b1r.y - p.limbA1.y) / len;
  // Нормаль к верхней стороне, смотрящая от нижней стороны (наружу).
  let nx = -uy;
  let ny = ux;
  const toInside = (p.limbA2.x - p.limbA1.x) * nx + (p.limbA2.y - p.limbA1.y) * ny;
  if (toInside > 0) {
    nx = -nx;
    ny = -ny;
  }
  // Концы заходят за свои точки: у плеча — под штрих головы и воротник,
  // у ладошки — под саму ладошку (она рисуется последней).
  const back = p.limbStroke * 0.6;
  const deep = p.limbStroke * 1.2;
  const a1 = { x: p.limbA1.x - ux * back, y: p.limbA1.y - uy * back };
  const a2 = { x: p.limbA2.x - ux * back, y: p.limbA2.y - uy * back };
  const b1 = { x: b1r.x + ux * deep, y: b1r.y + uy * deep };
  const b2 = { x: b2r.x + ux * deep, y: b2r.y + uy * deep };
  const off = p.limbStroke / 2 + p.limbOuter / 2;
  const ext = p.limbOuter * 2;
  const o1 = { x: p.limbA1.x + nx * off - ux * ext, y: p.limbA1.y + ny * off - uy * ext };
  const o2 = { x: b1r.x + nx * off + ux * ext, y: b1r.y + ny * off + uy * ext };

  const limb = p.limbStroke > 0;
  const svgProps = {
    viewBox: `0 0 ${p.imageWidth} ${p.imageHeight}`,
    style: layer,
    preserveAspectRatio: "none" as const,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <div style={{ ...box, transform: `scaleY(${bob})`, transformOrigin: "50% 100%" }}>
        {p.bodyRed ? svgLayer(p.bodyRed) : null}
        {limb ? (
          <svg {...svgProps}>
            <line
              x1={o1.x}
              y1={o1.y}
              x2={o2.x}
              y2={o2.y}
              stroke={p.limbColor}
              strokeWidth={p.limbOuter}
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        {p.bodyUnder ? svgLayer(p.bodyUnder) : null}
        {p.bodyEdge ? svgLayer(p.bodyEdge) : null}
        {p.palm
          ? svgLayer(p.palm, {
              transform: `translate(${(dx / p.imageWidth) * 100}%, ${(dy / p.imageHeight) * 100}%) rotate(${p.tiltDeg * k}deg)`,
              transformOrigin: `${(p.pivotX / p.imageWidth) * 100}% ${(p.pivotY / p.imageHeight) * 100}%`,
            })
          : null}
        {p.bodyWhite ? svgLayer(p.bodyWhite) : null}
        {limb ? (
          <svg {...svgProps}>
            <polygon points={`${a1.x},${a1.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${a2.x},${a2.y}`} fill="#fff" />
          </svg>
        ) : null}
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
        {svgLayer(p.bodyBlack)}
        {limb ? (
          <svg {...svgProps}>
            <line x1={a1.x} y1={a1.y} x2={b1.x} y2={b1.y} stroke="#000" strokeWidth={p.limbStroke} strokeLinecap="round" />
            <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke="#000" strokeWidth={p.limbStroke} strokeLinecap="round" />
          </svg>
        ) : null}
        {eyesSrc ? svgLayer(eyesSrc) : null}
      </div>
    </AbsoluteFill>
  );
};

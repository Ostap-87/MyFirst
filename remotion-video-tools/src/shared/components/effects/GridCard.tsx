import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * GridCard — «лист в клетку» с сайта aura-robotics.ru: белая карточка с
 * тонкой рамкой, сеткой и крестиком в центре, слегка развёрнутая в 3D.
 * Внутри — фото или видео (робот, цех, экран). Въезжает с пружиной сбоку,
 * уходит растворяясь. Для показа «вот этот робот» рядом со спикером.
 */
export const gridCardSchema = z.object({
  src: z.string().describe("Картинка или видео внутри public"),
  kind: z.enum(["image", "video"]),
  label: z.string().describe("Подпись в углу, как на сайте («Роботы-курьеры»)"),
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  widthFraction: z.number().min(0.2).max(1),
  aspect: z.number().min(0.4).max(2.5).describe("ширина/высота карточки"),
  tilt: z.number().min(-30).max(30).describe("Поворот вокруг вертикали, градусы"),
  fromSide: z.enum(["left", "right"]),
  outFrames: z.number().int().min(0).describe("Сколько кадров до конца Sequence занимает уход"),
  durationInFrames: z.number().int().min(1),
  line: z.string(),
  grid: z.string(),
  font: z.string(),
  trimBefore: z.number().int().min(0),
});
export type GridCardParams = z.infer<typeof gridCardSchema>;
export type GridCardProps = Partial<GridCardParams> & {
  /** Ручное положение карточки (px) — для хореографии снаружи; встроенный въезд и уход тогда не работают. */
  rect?: { x: number; y: number; w: number; h: number; tilt: number; opacity: number };
};

export const gridCardDefaults: GridCardParams = {
  src: "",
  kind: "image",
  label: "",
  cx: 0.72,
  cy: 0.32,
  widthFraction: 0.46,
  aspect: 0.8,
  tilt: -14,
  fromSide: "right",
  outFrames: 10,
  durationInFrames: 150,
  line: "#d9d7d5",
  grid: "#e6e3df",
  font: "Inter",
  trimBefore: 0,
};

export const GridCard: React.FC<GridCardProps> = ({ rect, ...params }) => {
  const p = withDefaults(gridCardDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const w = rect ? rect.w : width * p.widthFraction;
  const h = rect ? rect.h : w / p.aspect;
  const inS = spring({ frame, fps, config: { damping: 16, stiffness: 120, mass: 0.9 } });
  const out = interpolate(frame, [p.durationInFrames - p.outFrames, p.durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const dir = p.fromSide === "right" ? 1 : -1;
  const dx = rect ? 0 : (1 - inS) * dir * w * 0.9;
  const left = rect ? rect.x : width * p.cx - w / 2 + dx;
  const top = rect ? rect.y : height * p.cy - h / 2;
  const opacity = rect ? rect.opacity : Math.min(inS, out);
  const tilt = rect ? rect.tilt : p.tilt;
  const sc = rect ? 1 : 0.9 + 0.1 * inS;
  const cell = Math.round(w / 22);
  const pad = Math.round(w * 0.05);
  return (
    <AbsoluteFill style={{ perspective: width * 1.6, perspectiveOrigin: `${((left + w / 2) / width) * 100}% ${((top + h / 2) / height) * 100}%` }}>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: w,
          height: h,
          opacity,
          transform: `rotateY(${tilt}deg) rotateX(${tilt === 0 ? 0 : 4}deg) scale(${sc})`,
          transformStyle: "preserve-3d",
          background: "#ffffff",
          border: `${Math.max(2, Math.round(w * 0.004))}px solid ${p.line}`,
          borderRadius: Math.round(w * 0.04),
          boxShadow: "0 30px 60px rgba(0,0,0,0.25), 0 8px 18px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
      >
        <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="gridcard-grid" width={cell} height={cell} patternUnits="userSpaceOnUse">
              <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={p.grid} strokeWidth={1.5} />
            </pattern>
          </defs>
          <rect width={w} height={h} fill="url(#gridcard-grid)" />
          <path d={`M ${w / 2 - cell * 0.4} ${h / 2} H ${w / 2 + cell * 0.4} M ${w / 2} ${h / 2 - cell * 0.4} V ${h / 2 + cell * 0.4}`} stroke="#8f8e8d" strokeWidth={2} />
        </svg>
        {p.src ? (
          <div style={{ position: "absolute", left: pad, top: pad, right: pad, bottom: pad + (p.label ? Math.round(w * 0.09) : 0), borderRadius: Math.round(w * 0.02), overflow: "hidden", background: "#f8f6f3" }}>
            {p.kind === "video" ? (
              <OffthreadVideo src={staticFile(p.src)} muted trimBefore={p.trimBefore} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
        ) : null}
        {p.label ? (
          <div style={{ position: "absolute", left: pad, bottom: pad * 0.8, fontFamily: fontFamily(p.font), fontSize: Math.round(w * 0.05), color: "#8f8e8d", fontWeight: 500 }}>{p.label}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

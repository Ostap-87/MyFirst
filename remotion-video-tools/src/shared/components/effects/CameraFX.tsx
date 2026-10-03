import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * CameraFX — приёмы «камеры» поверх плоской съёмки с одной точки.
 *
 * Что по-настоящему, а что имитация (решение владельца 03.10 — брать всё):
 * - pushIn    — наезд на точку (глаза): настоящий.
 * - whipPan   — резкий отмах с размытием движения, кадр уходит за край и
 *               возвращается с другой стороны: настоящий переход.
 * - dollyZoom — «эффект Хичкока»: спикер (вырезка `cutout`) стоит на месте,
 *               фон за ним наезжает. Без вырезки вырождается в наезд.
 * - lowAngle  — низкий ракурс: перспектива снизу, низ кадра шире верха,
 *               лёгкий наезд. Держать 1–2 с.
 * - crane     — кран: подъём с отъездом и наклоном камеры вниз.
 * - orbit     — псевдо-орбита 10–15°: фон поворачивается в перспективе,
 *               вырезка спикера сдвигается в противофазе (параллакс).
 *
 * Движения задаются списком `moves` в кадрах; в один момент активно одно.
 * Съёмка и вырезка рисуются внутри: вырезка нужна только dollyZoom и orbit.
 */
export const cameraFxKindSchema = z.enum(["pushIn", "whipPan", "dollyZoom", "lowAngle", "crane", "orbit"]);
export type CameraFxKind = z.infer<typeof cameraFxKindSchema>;

export const cameraFxMoveSchema = z.object({
  fromFrame: z.number().int().min(0),
  toFrame: z.number().int().min(1),
  kind: cameraFxKindSchema,
  strength: z.number().min(0).max(2).describe("Сила: 1 — норма, 0.5 — вполовину"),
  originX: z.number().min(0).max(1).describe("Точка наезда, доля ширины (глаза)"),
  originY: z.number().min(0).max(1).describe("Точка наезда, доля высоты"),
  direction: z.enum(["left", "right"]).describe("Куда уходит кадр в whipPan и orbit"),
});
export type CameraFxMove = z.infer<typeof cameraFxMoveSchema>;

export const cameraFxSchema = z.object({
  footage: z.string().describe("Съёмка внутри public"),
  cutout: z.string().describe("Вырезка спикера с альфой (WebM) той же длины; пусто — без неё"),
  trimBefore: z.number().int().min(0).describe("С какого кадра съёмки начинать"),
  moves: z.array(cameraFxMoveSchema),
  muted: z.boolean(),
});
export type CameraFxParams = z.infer<typeof cameraFxSchema>;
export type CameraFxProps = Partial<CameraFxParams>;

export const cameraFxDefaults: CameraFxParams = {
  footage: "",
  cutout: "",
  trimBefore: 0,
  moves: [],
  muted: false,
};

export const cameraFxMoveDefaults: Omit<CameraFxMove, "fromFrame" | "toFrame" | "kind"> = { strength: 1, originX: 0.5, originY: 0.4, direction: "right" };

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
/** Вход 25 %, удержание, выход 25 %. */
const hold = (p: number) => Math.min(smooth(p / 0.25), smooth((1 - p) / 0.25));

type Layer = { transform: string; origin: string; filter: string };

export const cameraFxLayers = (move: CameraFxMove | undefined, frame: number, width: number, height: number, hasCutout: boolean): { bg: Layer; fg: Layer } => {
  const none: Layer = { transform: "none", origin: "50% 50%", filter: "none" };
  if (!move) return { bg: none, fg: none };
  const p = Math.min(1, Math.max(0, (frame - move.fromFrame) / Math.max(1, move.toFrame - move.fromFrame)));
  const s = move.strength;
  const dir = move.direction === "right" ? 1 : -1;
  const origin = `${move.originX * 100}% ${move.originY * 100}%`;
  switch (move.kind) {
    case "pushIn": {
      const k = 1 + 0.2 * s * interpolate(p, [0, 1], [0, 1], { easing: Easing.out(Easing.cubic) });
      const l = { transform: `scale(${k})`, origin, filter: "none" };
      return { bg: l, fg: l };
    }
    case "whipPan": {
      // Первая половина — кадр улетает, вторая — прилетает с другой стороны. Между ними кадр за краем.
      const tx = p < 0.5 ? dir * width * 1.1 * interpolate(p, [0, 0.5], [0, 1], { easing: Easing.in(Easing.cubic) }) : -dir * width * 1.1 * (1 - interpolate(p, [0.5, 1], [0, 1], { easing: Easing.out(Easing.cubic) }));
      const blur = 26 * s * Math.sin(p * Math.PI);
      const l = { transform: `translateX(${tx}px) scale(1.15)`, origin: "50% 50%", filter: `blur(${blur}px)` };
      return { bg: l, fg: l };
    }
    case "dollyZoom": {
      // Как у Хичкока: спикер (вырезка) держит размер, фон за ним уезжает.
      // Сначала весь кадр быстро наезжает до 1,3 (вырезка и фон вместе), потом
      // вырезка стоит, а фон сжимается обратно к 1,0 — его «двойник» спикера
      // уменьшается и целиком прячется за вырезкой, краёв не видно.
      if (!hasCutout) {
        const k = 1 + 0.2 * s * smooth(p);
        const l = { transform: `scale(${k})`, origin, filter: "none" };
        return { bg: l, fg: l };
      }
      const big = 1 + 0.3 * s;
      const a = smooth(p / 0.22); // наезд
      const b = smooth((p - 0.22) / 0.78); // отъезд фона
      const fgK = 1 + (big - 1) * a;
      const bgK = fgK - (big - 1) * b;
      return {
        bg: { transform: `scale(${Math.max(1, bgK)})`, origin, filter: `blur(${4 * s * b}px)` },
        fg: { transform: `scale(${fgK})`, origin, filter: "none" },
      };
    }
    case "lowAngle": {
      const e = hold(p);
      const l = { transform: `perspective(${width * 1.4}px) rotateX(${-9 * s * e}deg) scale(${1 + 0.14 * e})`, origin: "50% 100%", filter: "none" };
      return { bg: l, fg: l };
    }
    case "crane": {
      const e = smooth(p);
      const l = { transform: `perspective(${width * 1.6}px) translateY(${-height * 0.06 * s * e}px) rotateX(${4 * s * e}deg) scale(${1.1 - 0.12 * e})`, origin: "50% 20%", filter: "none" };
      return { bg: l, fg: l };
    }
    case "orbit": {
      const a = dir * 12 * s * (2 * smooth(p) - 1); // от −a к +a
      return {
        bg: { transform: `perspective(${width * 1.5}px) rotateY(${a}deg) scale(1.2)`, origin: "50% 50%", filter: "none" },
        fg: { transform: `translateX(${(-a / 12) * width * 0.05}px) scale(1.03)`, origin: "50% 100%", filter: "none" },
      };
    }
    default:
      return { bg: none, fg: none };
  }
};

export const CameraFX: React.FC<CameraFxProps> = (params) => {
  const p = withDefaults(cameraFxDefaults, params);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const move = p.moves.find((m) => frame >= m.fromFrame && frame < m.toFrame);
  const { bg, fg } = cameraFxLayers(move, frame, width, height, Boolean(p.cutout));
  const videoStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: bg.transform, transformOrigin: bg.origin, filter: bg.filter }}>
        {p.footage ? <OffthreadVideo src={staticFile(p.footage)} muted={p.muted} trimBefore={p.trimBefore} style={videoStyle} /> : null}
      </AbsoluteFill>
      {p.cutout ? (
        <AbsoluteFill style={{ transform: fg.transform, transformOrigin: fg.origin, filter: fg.filter }}>
          <OffthreadVideo src={staticFile(p.cutout)} transparent muted trimBefore={p.trimBefore} style={videoStyle} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * MascotRig — оживляет плоскую фигурку-стикер: лапка качается вокруг
 * плеча, глаза моргают заплатками.
 *
 * Фигурка приходит слоями, нарезанными заранее (PIL, `docs/process.md`):
 * `body` — тело без лапки с дорисованным краем, `paw` — лапка с
 * прозрачностью, `eyesHalf` и `eyesClosed` — заплатки поверх открытых глаз.
 * Всё одного размера с исходником; слои кладутся друг на друга «как есть»,
 * а сама картинка вписывается в кадр целиком.
 *
 * ——— Как движется ———
 *
 * Лапка: угол = −swing · ½(1 − cos 2πt/T) — из покоя вверх и обратно,
 * без остановок на концах, как у манэки-нэко. Ось — плечо (`pivotX/Y` в
 * пикселях исходника). Моргание: каждые `blinkEvery` секунд веко
 * опускается на полкадра (1 кадр `eyesHalf`), держится закрытым
 * `blinkFrames`, поднимается (1 кадр `eyesHalf`). Второе, короткое
 * моргание через 0,35 с после каждого третьего — так глаза не тикают
 * по метроному.
 */
export const mascotRigSchema = z.object({
  body: z.string().describe("Тело без лапки, внутри public"),
  paw: z.string().describe("Лапка с прозрачностью, внутри public"),
  eyesHalf: z.string().describe("Полуприкрытые глаза (заплатка), пусто — без"),
  eyesClosed: z.string().describe("Закрытые глаза (заплатка), пусто — без моргания"),
  imageWidth: z.number().int().min(1).describe("Ширина исходника, px"),
  imageHeight: z.number().int().min(1).describe("Высота исходника, px"),
  pivotX: z.number().describe("Ось лапки по X, px исходника"),
  pivotY: z.number().describe("Ось лапки по Y, px исходника"),
  swingDeg: z.number().min(0).max(90).describe("Размах взмаха, градусы"),
  wavePeriodSeconds: z.number().min(0.2).describe("Период взмаха, с"),
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
  imageWidth: 1000,
  imageHeight: 1000,
  pivotX: 500,
  pivotY: 500,
  swingDeg: 16,
  wavePeriodSeconds: 1.25,
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
  const angle = -p.swingDeg * 0.5 * (1 - Math.cos((2 * Math.PI * t) / p.wavePeriodSeconds));

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
  const bob = interpolate(Math.cos((2 * Math.PI * t) / p.wavePeriodSeconds), [-1, 1], [1.006, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <div style={{ ...box, transform: `scaleY(${bob})`, transformOrigin: "50% 100%" }}>
        <Img src={staticFile(p.body)} style={layer} />
        {eyesSrc ? <Img src={staticFile(eyesSrc)} style={layer} /> : null}
        {p.paw ? (
          <Img
            src={staticFile(p.paw)}
            style={{
              ...layer,
              transform: `rotate(${angle}deg)`,
              transformOrigin: `${(p.pivotX / p.imageWidth) * 100}% ${(p.pivotY / p.imageHeight) * 100}%`,
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

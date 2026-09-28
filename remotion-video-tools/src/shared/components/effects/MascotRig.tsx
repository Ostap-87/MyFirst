import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";
import { fontFamily } from "../../fonts";

/**
 * MascotRig — оживляет плоскую фигурку-стикер: лапка ходит вниз-вверх,
 * глаза моргают, на груди — знак.
 *
 * ——— Почему не слои ———
 *
 * Любая разрезка фигурки на «тело» и «лапку» даёт шов в месте стыка: линии
 * штрихов и каймы не сходятся, как ни подгоняй (шесть заходов — растр,
 * вектор, обрезка по плечу — все с рваным стыком). Поэтому фигурка НЕ
 * режется. Вместо этого вся картинка плавно деформируется (puppet warp):
 * ладошка сдвигается целиком, голова и воротник стоят на месте, а
 * предплечье между ними тянется. Линии при этом только изгибаются, разрыва
 * нет по построению.
 *
 * Деформацию считает `scripts/cat-warp.py` (scipy, бикубическая
 * интерполяция) и пишет цикл кадров `f00.png … fNN.png` с прозрачным
 * фоном — компонент их только показывает: кадр композиции `n` → файл
 * `n mod frameCount`. Цикл — два периода взмаха, чтобы период 1,25 с при
 * 30 fps (37,5 кадра) сошёлся на целом числе.
 *
 * Моргание: каждые `blinkEvery` секунд веко опускается на полкадра
 * (1 кадр `eyesHalf`), держится закрытым `blinkFrames`, поднимается.
 * Второе короткое моргание через 0,35 с на каждом третьем — чтобы глаза
 * не тикали по метроному. Глаза — SVG-заплатки поверх кадра: они в зоне,
 * которую деформация не трогает.
 */
export const mascotRigSchema = z.object({
  framesDir: z.string().describe("Папка с кадрами деформации внутри public, напр. local/cat/warp"),
  frameCount: z.number().int().min(1).describe("Сколько кадров в цикле"),
  frameDigits: z.number().int().min(1).describe("Цифр в имени кадра: 2 → f07.png"),
  eyesHalf: z.string().describe("SVG полуприкрытых глаз; пусто — без"),
  eyesClosed: z.string().describe("SVG закрытых глаз; пусто — без моргания"),
  imageWidth: z.number().int().min(1).describe("Ширина кадра, px"),
  imageHeight: z.number().int().min(1).describe("Высота кадра, px"),
  wavePeriodSeconds: z.number().min(0.2).describe("Период взмаха, с — для «дыхания» тела в такт"),
  breathe: z.number().min(0).describe("Насколько тело «дышит» в такт взмаху, доля высоты; 0 — не дышит"),
  markText: z.string().describe("Знак на груди; пусто — без него"),
  markX: z.number().min(0).max(1).describe("Центр знака по X, доля картинки"),
  markY: z.number().min(0).max(1).describe("Центр знака по Y, доля картинки"),
  markSize: z.number().min(0).max(1).describe("Кегль знака, доля ширины картинки"),
  markColor: z.string().describe("Цвет знака"),
  blinkEverySeconds: z.number().min(0.5).describe("Как часто моргать, с"),
  blinkFrames: z.number().int().min(1).describe("Сколько кадров глаза закрыты"),
  background: z.string().describe("Цвет фона кадра; transparent — прозрачный"),
});

export type MascotRigParams = z.infer<typeof mascotRigSchema>;
export type MascotRigProps = Partial<MascotRigParams>;

export const mascotRigDefaults: MascotRigParams = {
  framesDir: "",
  frameCount: 1,
  frameDigits: 2,
  eyesHalf: "",
  eyesClosed: "",
  imageWidth: 1000,
  imageHeight: 1000,
  wavePeriodSeconds: 1.25,
  breathe: 0.006,
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
  if (!p.framesDir) return null;

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

  const index = frame % p.frameCount;
  const frameSrc = `${p.framesDir.replace(/\/$/, "")}/f${String(index).padStart(p.frameDigits, "0")}.png`;

  // Фаза взмаха — только для «дыхания»: сама лапка уже в кадрах.
  const t = frame / fps;
  const k = 0.5 * (1 - Math.cos((2 * Math.PI * t) / p.wavePeriodSeconds));
  const bob = interpolate(k, [0, 1], [1, 1 + p.breathe]);

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

  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <div style={{ ...box, transform: `scaleY(${bob})`, transformOrigin: "50% 100%" }}>
        <Img src={staticFile(frameSrc)} style={layer} />
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
      </div>
    </AbsoluteFill>
  );
};

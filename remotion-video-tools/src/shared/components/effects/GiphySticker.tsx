import {
  Loop,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { z } from "zod";

/**
 * GiphySticker — гифка или стикер Giphy поверх ролика.
 *
 * Файлы готовит `npm run giphy`: стикер — прозрачный WebM, гифка — MP4.
 * Стикер выпрыгивает пружиной с перелётом и чуть покачивается, в конце
 * схлопывается; гифка (прямоугольная) получает скругление и тень, чтобы
 * не выглядеть вырезанным куском экрана. Анимация зациклена на свою длину.
 */
export const giphyStickerSchema = z.object({
  src: z.string().describe("Файл из data/giphy.json (поле src)"),
  sticker: z.boolean().describe("Прозрачный стикер или прямоугольная гифка"),
  seconds: z.number().min(0.1).describe("Длина одного цикла гифки"),
  aspect: z.number().min(0.1).describe("Ширина к высоте"),
  x: z.number().min(0).max(1).describe("Центр по ширине кадра, доля"),
  y: z.number().min(0).max(1).describe("Центр по высоте кадра, доля"),
  widthFraction: z.number().min(0.05).max(1).describe("Ширина, доля кадра"),
  tilt: z.number().describe("Поворот, градусы"),
});
export type GiphyStickerParams = z.infer<typeof giphyStickerSchema>;

export const giphyStickerDefaults: GiphyStickerParams = {
  src: "",
  sticker: true,
  seconds: 2,
  aspect: 1,
  x: 0.5,
  y: 0.5,
  widthFraction: 0.4,
  tilt: -4,
};

export const GiphySticker: React.FC<Partial<GiphyStickerParams>> = (params) => {
  const { src, sticker, seconds, aspect, x, y, widthFraction, tilt } = { ...giphyStickerDefaults, ...params };
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10, mass: 0.6, stiffness: 180 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sway = Math.sin((frame / fps) * 2.4) * 2;
  const w = width * widthFraction;
  const h = w / aspect;
  if (!src) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: width * x - w / 2,
        top: height * y - h / 2,
        width: w,
        height: h,
        transform: `scale(${pop * out}) rotate(${tilt + sway}deg)`,
        borderRadius: sticker ? 0 : w * 0.06,
        overflow: sticker ? "visible" : "hidden",
        boxShadow: sticker ? "none" : "0 20px 50px rgba(0,0,0,0.45)",
        filter: sticker ? "drop-shadow(0 12px 24px rgba(0,0,0,0.4))" : undefined,
      }}
    >
      <Loop durationInFrames={Math.max(1, Math.round(seconds * fps))}>
        <OffthreadVideo
          src={staticFile(src)}
          muted
          transparent={sticker}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Loop>
    </div>
  );
};

import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { Media, withDefaults } from "./media";

/**
 * FramedInsert — видеоврезка или фото в рамке поверх кадра.
 *
 * Доказательство вместо слов: «я встречался с управленцами» — и рядом
 * на две секунды окно с этой встречей. Спикер остаётся в кадре, врезка
 * его не заменяет, а подтверждает.
 *
 * Появление — с масштаба 0,92 и прозрачности, уход — прозрачностью. Без
 * пружины: врезка — документ, а не игрушка, прыгать ей незачем.
 *
 * Место по умолчанию: в горизонтали — правая половина, как в референсе;
 * в вертикали — правый нижний угол, на плече: по центру окно закрывало
 * рот. Подпись под окном — компания, отрасль или город.
 */
export const framedInsertSchema = z.object({
  src: z.string().describe("Видео или фото внутри public"),
  caption: z.string().optional().describe("Подпись под окном"),
  side: z.enum(["left", "right", "center"]).optional().describe("Где стоит; по умолчанию по формату"),
  widthFraction: z.number().min(0.2).max(0.95).optional().describe("Ширина окна, доля ширины кадра"),
  topFraction: z.number().min(0).max(1).optional().describe("Верх окна, доля высоты"),
  fadeFrames: z.number().int().min(1).describe("Кадры на появление и уход"),
});

export type FramedInsertParams = z.infer<typeof framedInsertSchema>;
export type FramedInsertProps = Partial<FramedInsertParams> & { readonly src: string };

export const framedInsertDefaults: Omit<FramedInsertParams, "src"> = {
  fadeFrames: 8,
};

export const FramedInsert: React.FC<FramedInsertProps> = (params) => {
  const { src, caption, side, widthFraction, topFraction, fadeFrames } = withDefaults(
    { ...framedInsertDefaults, src: params.src } as FramedInsertParams,
    params,
  );
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;

  // В вертикали сбоку места нет: окно садится в правый нижний угол, на
  // плечо, между подбородком и субтитрами. По центру оно закрывало рот.
  const w = width * (widthFraction ?? (vertical ? 0.5 : 0.44));
  const h = w * (vertical ? 0.62 : 0.5625);
  const place = side ?? "right";
  const left =
    place === "center" ? (width - w) / 2 : place === "right" ? width * 0.94 - w : width * 0.06;
  const top = height * (topFraction ?? (vertical ? 0.55 : 0.18));

  const inAmt = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outAmt = interpolate(
    frame,
    [durationInFrames - fadeFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = 0.92 + 0.08 * inAmt;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        opacity: Math.min(inAmt, outAmt),
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          borderRadius: w * 0.04,
          border: `${Math.max(4, w * 0.01)}px solid #fff`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
          backgroundColor: "#111",
        }}
      >
        <Media src={src} />
      </div>
      {caption ? (
        <div
          style={{
            display: "inline-block",
            marginTop: w * 0.025,
            padding: `${w * 0.012}px ${w * 0.028}px`,
            borderRadius: w * 0.02,
            backgroundColor: "rgba(7,10,17,0.84)",
            color: "#fff",
            fontFamily: fontFamily("Inter"),
            fontWeight: 700,
            fontSize: w * 0.045,
            whiteSpace: "nowrap",
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
};

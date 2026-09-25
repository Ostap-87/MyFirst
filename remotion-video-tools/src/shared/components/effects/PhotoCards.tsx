import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Media, mediaItemSchema, withDefaults } from "./media";

/**
 * PhotoCards — фотокарточки внахлёст.
 *
 * Приём из трейлеров-манифестов: пока спикер перечисляет «Apple, Google,
 * Amazon», рядом с ним на каждом названии въезжает карточка, и следующая
 * ложится поверх предыдущей со сдвигом и своим поворотом. Узнаваемая
 * картинка объясняет слово за полсекунды.
 *
 * Карточки въезжают по одной (шаг `stepFrames` — ставится так, чтобы
 * совпасть со словами) и уходят все вместе: перечисление закончилось —
 * убираем его целиком, а не по штуке.
 *
 * Место по умолчанию зависит от кадра. В горизонтали — сбоку от спикера,
 * как в референсе. В вертикали сбоку места нет: карточки садятся на грудь,
 * между подбородком и субтитрами, чтобы не закрывать лицо.
 */
export const photoCardsSchema = z.object({
  items: z.array(mediaItemSchema).describe("Карточки по порядку появления"),
  stepFrames: z.number().int().min(1).describe("Шаг между карточками в кадрах"),
  side: z.enum(["left", "right"]).describe("С какой стороны въезжают"),
  widthFraction: z.number().min(0.1).max(0.6).describe("Ширина карточки, доля ширины кадра"),
  topFraction: z.number().min(0).max(1).optional().describe("Верх стопки, доля высоты; по умолчанию по формату"),
  tilt: z.number().min(0).max(15).describe("Наибольший поворот карточки, градусы"),
  exitFrames: z.number().int().min(1).describe("За сколько кадров стопка уходит"),
});

export type PhotoCardsParams = z.infer<typeof photoCardsSchema>;
export type PhotoCardsProps = Partial<PhotoCardsParams>;

export const photoCardsDefaults: PhotoCardsParams = {
  items: [],
  stepFrames: 10,
  side: "right",
  widthFraction: 0.34,
  tilt: 4,
  exitFrames: 8,
};

export const PhotoCards: React.FC<PhotoCardsProps> = (params) => {
  const { items, stepFrames, side, widthFraction, topFraction, tilt, exitFrames } = withDefaults(photoCardsDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;

  const cardW = width * widthFraction;
  const cardH = cardW * 0.72;
  // В вертикали — на грудь: стопка кончается у 0,75, выше субтитров.
  const top = height * (topFraction ?? (vertical ? 0.57 : 0.22));
  const dir = side === "right" ? 1 : -1;
  // Край стопки: карточки ложатся от края к центру со сдвигом.
  const edge = width * 0.06;
  const offsetX = cardW * 0.42;
  const offsetY = cardH * 0.18;

  const exit = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {items.map((item, i) => {
        const enter = spring({
          frame: frame - i * stepFrames,
          fps,
          config: { damping: 200, mass: 0.7 },
          durationInFrames: 12,
        });
        if (frame < i * stepFrames) return null;
        // Поворот чередуется: −tilt, 0, +tilt… — стопка выглядит
        // брошенной рукой, а не сеткой.
        const rot = ((i % 3) - 1) * tilt;
        const slot = items.length - 1 - i;
        const x = edge + slot * offsetX;
        const travel = (1 - enter + exit) * (cardW + x + 40);
        return (
          <div
            key={`${item.src}-${i}`}
            style={{
              position: "absolute",
              top: top + i * offsetY,
              [side]: x - travel,
              width: cardW,
              height: cardH,
              transform: `rotate(${rot * dir}deg)`,
              borderRadius: cardW * 0.05,
              border: `${Math.max(4, cardW * 0.014)}px solid #fff`,
              boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
              overflow: "hidden",
              backgroundColor: "#111",
            }}
          >
            <Media src={item.src} />
          </div>
        );
      })}
    </>
  );
};

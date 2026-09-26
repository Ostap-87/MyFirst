import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * AngleCuts — смена ракурса, как будто снимают две камеры.
 *
 * На коротком отрезке картинка переключается на съёмку с другой точки,
 * а звук остаётся основным. Вторая камера — не синхронная запись, а
 * отдельный дубль того же текста, поэтому вставка встаёт только на
 * фразу, которую в дубле сказали теми же словами: `from` — секунда в
 * дубле, где начинается это слово.
 *
 * `rate` подгоняет темп дубля под основной звук: если в основном ролике
 * фраза заняла 1,5 с, а в дубле 1,7 с — rate 1,13, и к концу вставки
 * губы не отстают. Дальше 0,8–1,35 не уходить: ускорение становится
 * заметно по жестам.
 *
 * Склейка — прямая, без наплыва: смена камеры в монтаже говорящей
 * головы читается именно резким переходом. `filter` выравнивает свет,
 * если дубль снят в другое время суток.
 */
export const angleCutSchema = z.object({
  fromFrame: z.number().int().min(0),
  toFrame: z.number().int().min(1),
  src: z.string().describe("Съёмка второй камеры внутри public, без звука"),
  from: z.number().min(0).describe("С какой секунды дубля начинать"),
  rate: z
    .number()
    .min(0.5)
    .max(2)
    .optional()
    .describe("Темп дубля; по умолчанию 1"),
  filter: z.string().optional().describe("CSS-фильтр под свет основной съёмки"),
});

export const angleCutsSchema = z.object({
  cuts: z.array(angleCutSchema).describe("Отрезки второй камеры"),
});

export type AngleCut = z.infer<typeof angleCutSchema>;
export type AngleCutsParams = z.infer<typeof angleCutsSchema>;
export type AngleCutsProps = Partial<AngleCutsParams>;

export const angleCutsDefaults: AngleCutsParams = {
  cuts: [],
};

export const AngleCuts: React.FC<AngleCutsProps> = (params) => {
  const { cuts } = withDefaults(angleCutsDefaults, params);
  return (
    <>
      {cuts.map((c) => {
        const rate = c.rate ?? 1;
        return (
          <Sequence
            key={`angle-${c.fromFrame}`}
            from={c.fromFrame}
            durationInFrames={c.toFrame - c.fromFrame}
            layout="none"
          >
            <AbsoluteFill style={{ filter: c.filter }}>
              <OffthreadVideo
                src={staticFile(c.src)}
                muted
                playbackRate={rate}
                // trimBefore — в кадрах исходника до ускорения.
                trimBefore={Math.round(c.from * 30)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};

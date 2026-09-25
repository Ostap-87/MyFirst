import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { Media, mediaItemSchema, withDefaults } from "./media";

/**
 * WipeBroll — B-roll на весь кадр со сменой шторкой.
 *
 * Место надо показать, а не назвать: на «в кампусе в Ханчжоу, на заводе
 * в Шэньчжэне» кадр целиком уходит в съёмку этих мест, голос идёт
 * поверх. Каждый следующий кадр въезжает шторкой справа налево поверх
 * предыдущего — так смена читается как «ещё одно место», а не как
 * склейка.
 *
 * Внутри кадра — медленный наезд (Ken Burns), чтобы фото не стояло
 * мёртво. Геометка — внизу слева, гарнитурой с засечками, как геометки
 * в остальных роликах проекта.
 *
 * Весь блок входит и уходит той же шторкой: на входе закрывает спикера,
 * на выходе открывает его обратно.
 */
export const wipeBrollSchema = z.object({
  items: z.array(mediaItemSchema).describe("Кадры по порядку; caption — геометка"),
  wipeFrames: z.number().int().min(1).describe("Длительность шторки в кадрах"),
  zoom: z.number().min(1).max(1.3).describe("Наезд внутри кадра к его концу"),
  labelBottomFraction: z.number().min(0).max(0.5).describe("Геометка: отступ снизу, доля высоты"),
});

export type WipeBrollParams = z.infer<typeof wipeBrollSchema>;
export type WipeBrollProps = Partial<WipeBrollParams>;

export const wipeBrollDefaults: WipeBrollParams = {
  items: [],
  wipeFrames: 10,
  zoom: 1.08,
  // Выше субтитров сторис (0,16) и строки ответа.
  labelBottomFraction: 0.27,
};

const Shot: React.FC<{
  readonly src: string;
  readonly caption?: string;
  readonly wipeFrames: number;
  readonly zoom: number;
  readonly labelBottom: number;
  readonly wipeOut: boolean;
}> = ({ src, caption, wipeFrames, zoom, labelBottom, wipeOut }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Шторка: правый край открыт с самого начала, левый доезжает.
  const inset = interpolate(frame, [0, wipeFrames], [100, 0], ease);
  // Последний кадр блока уходит той же шторкой влево, открывая спикера.
  const outInset = wipeOut
    ? interpolate(frame, [durationInFrames - wipeFrames, durationInFrames], [0, 100], ease)
    : 0;
  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], {
    extrapolateRight: "clamp",
  });
  const labelIn = interpolate(frame, [wipeFrames, wipeFrames + 10], [0, 1], ease);

  return (
    <AbsoluteFill
      style={{
        clipPath: `inset(0 ${outInset}% 0 ${inset}%)`,
        backgroundColor: "#000",
      }}
    >
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Media src={src} />
      </AbsoluteFill>
      {/* Кромка шторки: тонкая светлая полоса, чтобы смена кадра читалась. */}
      {inset > 0 && inset < 100 ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${inset}%`,
            width: Math.max(4, width * 0.006),
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        />
      ) : null}
      {caption ? (
        <div
          style={{
            position: "absolute",
            left: width * 0.07,
            bottom: `${labelBottom * 100}%`,
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 20}px)`,
            fontFamily: fontFamily("Cormorant Garamond"),
            fontWeight: 500,
            fontSize: width * 0.07,
            color: "#fff",
            textShadow: "0 3px 18px rgba(0,0,0,0.8)",
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const WipeBroll: React.FC<WipeBrollProps> = (params) => {
  const { items, wipeFrames, zoom, labelBottomFraction } = withDefaults(wipeBrollDefaults, params);
  const { durationInFrames } = useVideoConfig();
  if (!items.length) return null;
  const per = Math.floor(durationInFrames / items.length);

  return (
    <AbsoluteFill>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        // Кадры перекрываются на длину шторки: следующий въезжает поверх
        // ещё идущего предыдущего, без чёрной дыры между ними.
        const from = i * per;
        const len = last ? durationInFrames - from : per + wipeFrames;
        return (
          <Sequence key={`${item.src}-${i}`} from={from} durationInFrames={len} layout="none">
            <Shot
              src={item.src}
              caption={item.caption}
              wipeFrames={wipeFrames}
              zoom={zoom}
              labelBottom={labelBottomFraction}
              wipeOut={last}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

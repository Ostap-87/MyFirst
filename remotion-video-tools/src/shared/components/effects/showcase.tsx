import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Media, type MediaItem } from "./media";

/**
 * Слой показа — общая часть деления экрана и «картинки в картинке».
 *
 * Кадры сменяются наплывом, внутри каждого — медленный наезд. Кадры
 * встают под слова: у кого задано `seconds` — держится столько, остальные
 * делят остаток поровну. Без этого робот появлялся раньше слова «роботов»,
 * а сайт — на полфразы позже названия проекта.
 *
 * Снизу — затемнение под субтитры: на светлом фото и скриншоте сайта
 * белые субтитры пропадали. `shade="low"` — только полоса под
 * субтитрами: в боковом делении показ идёт во всю высоту, и обычное
 * затемнение гасило нижнюю половину картинки.
 *
 * Наплыв — не дольше четверти кадра: в быстром перечислении («роботы,
 * автопром, напитки…») кадр держится полсекунды, и полный наплыв в
 * треть секунды показывал вместо картинки смесь двух.
 */
export const ShowcaseLayer: React.FC<{
  readonly items: MediaItem[];
  readonly style?: React.CSSProperties;
  readonly shade?: boolean | "low";
  readonly variant?: "part" | "full";
}> = ({ items, style, shade = true, variant = "part" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const fade = 10;
  const fixed = items.reduce((a, i) => a + (i.seconds ? Math.round(i.seconds * fps) : 0), 0);
  const free = items.filter((i) => !i.seconds).length;
  const share = free ? Math.max(1, Math.floor((durationInFrames - fixed) / free)) : 0;
  const lengths = items.map((i) => (i.seconds ? Math.round(i.seconds * fps) : share));
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000", ...style }}>
      {items.map((item, i) => {
        const from = starts[i];
        const fadeIn = Math.max(3, Math.min(fade, Math.round(lengths[i] / 4)));
        const len = i === items.length - 1 ? durationInFrames - from : lengths[i] + fade;
        const local = frame - from;
        const opacity =
          i === 0
            ? 1
            : interpolate(local, [0, fadeIn], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        // Витрину сайта не наезжаем: в ней своё движение — прокрутка.
        const scale =
          item.present === "site"
            ? 1
            : interpolate(local, [0, len], [1.02, 1.1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        return (
          <Sequence key={`${item.src}-${i}`} from={from} durationInFrames={len} layout="none">
            <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
              <Media src={item.src} item={item} variant={variant} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {shade ? (
        <AbsoluteFill
          style={{
            background:
              shade === "low"
                ? "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 16%, rgba(0,0,0,0) 30%)"
                : "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.66) 45%, rgba(0,0,0,0) 78%)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

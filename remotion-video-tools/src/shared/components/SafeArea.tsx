import { AbsoluteFill } from "remotion";
import { SAFE_AREAS, type SafeAreaName, useFormat } from "../format";

/**
 * SafeArea — поля, за которые нельзя выпускать текст.
 *
 * Оборачивает содержимое отступами под конкретную площадку: в Telegram и
 * Reels низ кадра перекрыт подписью и кнопками, и заголовок, свёрстанный
 * «по центру», на телефоне оказывается под интерфейсом.
 *
 * `guides` включает видимую разметку — удобно в Remotion Studio при вёрстке,
 * в финальный рендер её, разумеется, не оставляем.
 */
export type SafeAreaProps = {
  /** Площадка: telegram, reels, shorts, landscape, feed. По умолчанию — по ориентации кадра. */
  readonly platform?: SafeAreaName;
  /** Показать границы безопасной зоны поверх кадра. */
  readonly guides?: boolean;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

export const SafeArea: React.FC<SafeAreaProps> = ({
  platform,
  guides = false,
  style,
  children,
}) => {
  const { width, height, defaultSafeArea } = useFormat();
  const area = SAFE_AREAS[platform ?? defaultSafeArea];

  const padding = {
    paddingTop: Math.round(height * area.top),
    paddingBottom: Math.round(height * area.bottom),
    paddingLeft: Math.round(width * area.sides),
    paddingRight: Math.round(width * area.sides),
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ ...padding, ...style }}>{children}</AbsoluteFill>

      {guides ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: padding.paddingTop,
              bottom: padding.paddingBottom,
              left: padding.paddingLeft,
              right: padding.paddingRight,
              border: "2px dashed rgba(255, 0, 90, 0.6)",
            }}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

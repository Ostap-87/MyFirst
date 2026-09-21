import { interpolate, useCurrentFrame } from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * TypingLine — строка, которую «набирают» на глазах у зрителя.
 *
 * Имитация поля комментария или директа: аватар слева, слово печатается
 * по букве, справа кнопка отправки. Приём заменяет фразу «напишите слово
 * в директ» показом того самого действия — зритель видит, что именно ввести.
 *
 * Тема приходит пропом, чтобы строка работала в любом бренде
 * (CLAUDE.md, правило 1).
 */
export type TypingLineProps = {
  readonly theme: BrandTheme;
  /** Что печатается в поле. */
  readonly text: string;
  /** Кадр, на котором начинается набор. */
  readonly startFrame?: number;
  /** Сколько кадров уходит на один символ: 3 ≈ 10 знаков в секунду. */
  readonly framesPerChar?: number;
  /** Картинка аватара; без неё рисуется кружок с первой буквой. */
  readonly avatarSrc?: string;
  /** Подпись-заглушка, пока набор не начался. */
  readonly placeholder?: string;
};

export const TypingLine: React.FC<TypingLineProps> = ({
  theme,
  text,
  startFrame = 0,
  framesPerChar = 3,
  avatarSrc,
  placeholder = "",
}) => {
  const frame = useCurrentFrame();
  const { fs, sp } = useFormat();

  const typed = Math.floor(
    interpolate(
      frame - startFrame,
      [0, text.length * framesPerChar],
      [0, text.length],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );

  const visible = text.slice(0, typed);
  const isTyping = frame >= startFrame && typed < text.length;
  // Курсор мигает дважды в секунду и пропадает, когда набор закончен.
  const showCursor = isTyping && Math.floor(frame / 8) % 2 === 0;

  const size = fs(0.052);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: sp(0.02),
        padding: `${sp(0.014)}px ${sp(0.018)}px`,
        borderRadius: 999,
        backgroundColor: "rgba(20, 20, 26, 0.72)",
        border: `2px solid rgba(255,255,255,0.18)`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: theme.colors.accent,
          backgroundImage: avatarSrc ? `url(${avatarSrc})` : undefined,
          backgroundSize: "cover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: theme.fonts.headingWeight,
          fontSize: fs(0.028),
          color: theme.colors.primary,
          flexShrink: 0,
        }}
      >
        {avatarSrc ? "" : text.slice(0, 1).toUpperCase()}
      </div>

      <div
        style={{
          flex: 1,
          fontFamily: fontFamily(theme.fonts.heading),
          fontWeight: theme.fonts.headingWeight,
          fontSize: fs(0.045),
          color: visible ? theme.colors.accent : "rgba(255,255,255,0.45)",
          whiteSpace: "pre",
        }}
      >
        {visible || placeholder}
        {showCursor ? (
          <span style={{ color: theme.colors.accent }}>|</span>
        ) : null}
      </div>

      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: fs(0.03),
          color: "#ffffff",
          flexShrink: 0,
        }}
      >
        ↑
      </div>
    </div>
  );
};

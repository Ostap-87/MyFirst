import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useFormat } from "../format";
import { fontFamily } from "../fonts";
import type { BrandTheme } from "../theme";

/**
 * KaraokeCaptions — субтитры с пословной подсветкой.
 *
 * Reels и Shorts смотрят без звука, поэтому вшитые субтитры — не украшение,
 * а условие, при котором ролик вообще работает. Подсветка текущего слова
 * задаёт ритм и удерживает взгляд на строке.
 *
 * На вход идут Caption из @remotion/captions (их отдаёт `npm run transcribe`).
 * Слова собираются в «страницы» по 1–2 строки: строка целиком меняться не
 * должна на каждом слове — глаз не успевает перечитывать.
 *
 * Компонент нейтрален к бренду: тему получает пропом (CLAUDE.md, правило 1).
 */
export type KaraokeCaptionsProps = {
  readonly theme: BrandTheme;
  readonly captions: Caption[];
  /** Слова ближе этого интервала попадают на одну страницу. */
  readonly combineWithinMs?: number;
  /** Как подсвечивать активное слово: цветом или плашкой акцента. */
  readonly highlight?: "color" | "box";
  /** Кегль долей ширины кадра. */
  readonly fontSizeFraction?: number;
};

export const KaraokeCaptions: React.FC<KaraokeCaptionsProps> = ({
  theme,
  captions,
  combineWithinMs = 1200,
  highlight = "box",
  fontSizeFraction = 0.055,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fs, sp } = useFormat();

  const timeMs = (frame / fps) * 1000;
  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: combineWithinMs,
  });

  const page = pages.find(
    (candidate) =>
      timeMs >= candidate.startMs &&
      timeMs < candidate.startMs + candidate.durationMs,
  );

  if (!page) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${sp(0.012)}px ${sp(0.016)}px`,
        fontFamily: fontFamily(theme.fonts.heading),
        fontWeight: theme.fonts.headingWeight,
        fontSize: fs(fontSizeFraction),
        lineHeight: 1.25,
        textAlign: "center",
      }}
    >
      {page.tokens.map((token) => {
        const isActive = timeMs >= token.fromMs && timeMs < token.toMs;
        const isBox = highlight === "box";

        return (
          <span
            key={`${token.fromMs}-${token.text}`}
            style={{
              color: isActive && !isBox ? theme.colors.accent : "#ffffff",
              backgroundColor:
                isActive && isBox ? theme.colors.accent : "transparent",
              // Плашка красит слово в цвет фона бренда, иначе белый текст
              // на жёлтом или синем акценте теряет контраст.
              ...(isActive && isBox ? { color: theme.colors.primary } : {}),
              padding: isBox ? `0 ${sp(0.008)}px` : 0,
              borderRadius: isBox ? sp(0.008) : 0,
              // Активное слово чуть крупнее: движение заметно даже боковым зрением.
              transform: isActive ? "scale(1.06)" : "scale(1)",
              transformOrigin: "center",
              textShadow:
                isActive && isBox ? "none" : "0 2px 12px rgba(0,0,0,0.55)",
              whiteSpace: "pre",
            }}
          >
            {token.text.trim()}
          </span>
        );
      })}
    </div>
  );
};

import type { Caption } from "@remotion/captions";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FilmGrain } from "../../shared/components/effects";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import { SafeArea } from "../../shared/components/SafeArea";
import { useFormat } from "../../shared/format";
import { fontFamily } from "../../shared/fonts";
import exampleCaptions from "../../../data/captions.example.json";
import { ostapdotcenkoTheme as theme } from "../theme";

/**
 * Personal-Reel — вертикальный ролик с субтитрами-караоке.
 *
 * Бренд ostapdotcenko: цвета и шрифты только из ../theme (CLAUDE.md, правило 1).
 * Субтитры по умолчанию — демонстрационные из data/captions.example.json;
 * настоящие получаются из аудиодорожки командой `npm run transcribe`.
 *
 * Аудио и видеодорожка сюда не вшиты намеренно: сначала проверяем вёрстку
 * субтитров на статичном фоне, потом подкладываем <Audio> и <OffthreadVideo>.
 */
export const personalReelSchema = z.object({
  title: z.string().describe("Надстрочник в верхней части кадра"),
  handle: z.string().describe("Подпись автора"),
  highlight: z
    .enum(["box", "color"])
    .describe("Подсветка активного слова: плашкой или цветом"),
});

export type PersonalReelProps = z.infer<typeof personalReelSchema>;

export const personalReelDefaults: PersonalReelProps = {
  title: "B2B-МАРКЕТИНГ · АЗИЯ",
  handle: "@ostapdotcenko",
  highlight: "box",
};

export const PersonalReel: React.FC<PersonalReelProps> = ({
  title,
  handle,
  highlight,
}) => {
  const { fs, sp } = useFormat();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary }}>
      {/* Место под видеодорожку: сюда кладётся <OffthreadVideo> со съёмкой. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 35%, ${theme.colors.surface} 0%, ${theme.colors.primary} 70%)`,
        }}
      />

      <SafeArea platform="reels" style={{ justifyContent: "space-between" }}>
        <div
          style={{
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.026),
            letterSpacing: fs(0.003),
            color: theme.colors.accent,
            textAlign: "center",
          }}
        >
          {title}
        </div>

        <KaraokeCaptions
          theme={theme}
          captions={exampleCaptions as Caption[]}
          highlight={highlight}
          fontSizeFraction={0.062}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: sp(0.02),
            fontFamily: fontFamily(theme.fonts.mono),
            fontSize: fs(0.028),
            color: theme.colors.muted,
          }}
        >
          <span
            style={{
              width: sp(0.05),
              height: 3,
              backgroundColor: theme.colors.accent,
            }}
          />
          {handle}
        </div>
      </SafeArea>

      <FilmGrain
        opacity={0.12}
        grainSize={2}
        vignette={0.35}
        blendMode="screen"
      />
    </AbsoluteFill>
  );
};

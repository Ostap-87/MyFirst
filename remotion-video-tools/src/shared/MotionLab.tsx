import {
  linearTiming,
  springTiming,
  TransitionSeries,
} from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import {
  CountUp,
  FilmGrain,
  MotionTrail,
  SlideInSpring,
} from "./components/effects";
import { useFormat } from "./format";
import { fontFamily } from "./fonts";

/**
 * Shared-MotionLab — витрина «дорогого» слоя: готовые переходы, смаз и зерно.
 *
 * Показывает три приёма, которые отличают моушн-дизайн от анимации на CSS:
 * 1) переходы из @remotion/transitions вместо ручной склейки сцен,
 * 2) MotionTrail — смаз за быстрым движением,
 * 3) FilmGrain — зерно и виньетка поверх всего кадра.
 *
 * Данные нейтральные: брендовые сцены живут в папках брендов.
 */
export const motionLabSchema = z.object({
  first: z.string().describe("Текст первой сцены"),
  second: z.string().describe("Текст второй сцены — выезжает со смазом"),
  metric: z.number().describe("Число для третьей сцены"),
  metricLabel: z.string().describe("Подпись под числом"),
});

export type MotionLabProps = z.infer<typeof motionLabSchema>;

export const motionLabDefaults: MotionLabProps = {
  first: "ПЕРЕХОДЫ",
  second: "СМАЗ",
  metric: 3790,
  metricLabel: "станций замены батарей",
};

const palette = {
  ink: "#16161c",
  bone: "#f2f2f4",
  accent: "#ff4a1f",
  panel: "#24242c",
};

const Scene: React.FC<{
  readonly background: string;
  readonly children: React.ReactNode;
}> = ({ background, children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: background,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

export const MotionLab: React.FC<MotionLabProps> = ({
  first,
  second,
  metric,
  metricLabel,
}) => {
  const { fs } = useFormat();

  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene background={palette.ink}>
            <SlideInSpring direction="up" distance={80} damping={13}>
              <div
                style={{
                  fontFamily: fontFamily("Inter"),
                  fontWeight: 900,
                  fontSize: fs(0.09),
                  letterSpacing: fs(0.004),
                  color: palette.bone,
                }}
              >
                {first}
              </div>
            </SlideInSpring>
          </Scene>
        </TransitionSeries.Sequence>

        {/* Пружинный slide: сцена въезжает справа с инерцией. */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 20,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene background={palette.accent}>
            {/* Смаз виден только на быстром движении — поэтому пружина жёсткая. */}
            <MotionTrail layers={10} lagInFrames={1.2} trailOpacity={0.45}>
              <SlideInSpring
                direction="left"
                distance={900}
                damping={9}
                stiffness={90}
                fade={false}
              >
                <div
                  style={{
                    fontFamily: fontFamily("Inter"),
                    fontWeight: 900,
                    fontSize: fs(0.1),
                    color: palette.ink,
                  }}
                >
                  {second}
                </div>
              </SlideInSpring>
            </MotionTrail>
          </Scene>
        </TransitionSeries.Sequence>

        {/* Линейный wipe: шторка уводит кадр по диагонали. */}
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom-right" })}
          timing={linearTiming({ durationInFrames: 18 })}
        />

        <TransitionSeries.Sequence durationInFrames={80}>
          <Scene background={palette.panel}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: fontFamily("Inter"),
                  fontWeight: 900,
                  fontSize: fs(0.13),
                  color: palette.bone,
                  lineHeight: 1,
                }}
              >
                <CountUp to={metric} delayInFrames={6} durationInFrames={55} />
              </div>
              <div
                style={{
                  marginTop: fs(0.016),
                  fontFamily: fontFamily("JetBrains Mono"),
                  fontSize: fs(0.022),
                  letterSpacing: fs(0.002),
                  color: palette.accent,
                }}
              >
                {metricLabel}
              </div>
            </div>
          </Scene>
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Зерно и виньетка — последним слоем, поверх всех сцен и переходов. */}
      <FilmGrain
        opacity={0.14}
        grainSize={2}
        vignette={0.4}
        blendMode="screen"
      />
    </AbsoluteFill>
  );
};

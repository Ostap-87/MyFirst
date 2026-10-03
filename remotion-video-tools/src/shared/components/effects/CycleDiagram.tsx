import { Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * CycleDiagram — круг из стрелок-секторов вокруг центра.
 *
 * В центре круг с главным словом («ТУР»). Секторы-стрелки присоединяются
 * по одному: каждый приезжает по дуге с поворотом и лёгким перелётом,
 * с подписью вдоль дуги. Когда все на месте, кольцо начинает медленно
 * вращаться, центр стоит. Цвета у секторов свои — чтобы читались как
 * разные части одного целого.
 */
export const cycleSegmentSchema = z.object({
  label: z.string(),
  color: z.string(),
});

export const cycleDiagramSchema = z.object({
  center: z.string().describe("Слово в центре"),
  segments: z.array(cycleSegmentSchema).describe("Секторы по часовой стрелке, начиная сверху"),
  delayInFrames: z.number().int().min(0).describe("Кадр, с которого появляется центр"),
  stepFrames: z.number().int().min(1).describe("Интервал присоединения секторов"),
  enterFrames: z.number().int().min(1).describe("Кадры на приезд одного сектора"),
  spinSecondsPerTurn: z.number().min(2).describe("Период вращения готового кольца, секунд"),
  cx: z.number().min(0).max(1).describe("Центр по ширине, доля кадра"),
  cy: z.number().min(0).max(1).describe("Центр по высоте, доля кадра"),
  radiusFraction: z.number().min(0.1).max(0.5).describe("Внешний радиус, доля ширины"),
  thickness: z.number().min(0.2).max(0.7).describe("Толщина кольца, доля радиуса"),
  gapDeg: z.number().min(0).max(30).describe("Зазор между секторами, градусы"),
  centerColor: z.string().describe("Цвет центрального круга"),
  centerTextColor: z.string().describe("Цвет слова в центре"),
  labelColor: z.string().describe("Цвет подписей на секторах"),
  sound: z.string().describe("Звук на присоединение сектора; пусто — без звука"),
  font: z.string().describe("Гарнитура из public/fonts"),
  shimmer: z.boolean().describe("Серебристый блик, бегущий по кольцу"),
  growToFraction: z.number().min(0).max(0.5).describe("Внешний радиус после сборки, доля ширины; 0 — не укрупнять"),
  growFrames: z.number().int().min(1).describe("Кадры на укрупнение после сборки"),
  growCy: z.number().min(0).max(1).describe("Центр по высоте после укрупнения"),
});

export type CycleDiagramParams = z.infer<typeof cycleDiagramSchema>;
export type CycleDiagramProps = Partial<CycleDiagramParams>;

export const cycleDiagramDefaults: CycleDiagramParams = {
  center: "ТУР",
  segments: [
    { label: "Рецептура", color: "#2563eb" },
    { label: "Упаковка", color: "#0ea5a4" },
    { label: "Ингредиенты", color: "#f59e0b" },
  ],
  delayInFrames: 0,
  stepFrames: 28,
  enterFrames: 20,
  spinSecondsPerTurn: 14,
  cx: 0.5,
  cy: 0.42,
  radiusFraction: 0.4,
  thickness: 0.42,
  gapDeg: 10,
  centerColor: "#ffffff",
  centerTextColor: "#0b1220",
  labelColor: "#ffffff",
  sound: "audio/sfx/pop.wav",
  font: "Unbounded",
  shimmer: true,
  growToFraction: 0,
  growFrames: 24,
  growCy: 0.5,
};

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// Сектор-стрелка: внешняя дуга, наконечник наружу-внутрь, внутренняя дуга.
const arrowSector = (cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string => {
  const rMid = (rOut + rIn) / 2;
  const head = Math.min(16, (a1 - a0) * 0.28); // угол наконечника
  const aBody = a1 - head;
  const [x0, y0] = polar(cx, cy, rOut, a0);
  const [x1, y1] = polar(cx, cy, rOut, aBody);
  const [hx, hy] = polar(cx, cy, rOut + (rOut - rIn) * 0.28, aBody);
  const [tx, ty] = polar(cx, cy, rMid, a1);
  const [lx, ly] = polar(cx, cy, rIn - (rOut - rIn) * 0.28, aBody);
  const [x2, y2] = polar(cx, cy, rIn, aBody);
  const [x3, y3] = polar(cx, cy, rIn, a0);
  const large = aBody - a0 > 180 ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1}`,
    `L ${hx} ${hy} L ${tx} ${ty} L ${lx} ${ly} L ${x2} ${y2}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3}`,
    "Z",
  ].join(" ");
};

export const CycleDiagram: React.FC<CycleDiagramProps> = (params) => {
  const p = withDefaults(cycleDiagramDefaults, params);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const n = Math.max(1, p.segments.length);
  const span = 360 / n - p.gapDeg;
  const allIn = p.delayInFrames + 12 + (n - 1) * p.stepFrames + p.enterFrames;

  // После сборки кольцо укрупняется и переезжает в заданный центр — за спину
  // спикера; радиус ограничен так, чтобы края не выходили за кадр.
  const grow = p.growToFraction > 0
    ? interpolate(frame - allIn, [0, p.growFrames], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  // 0,44 — с учётом наконечников, которые выступают за внешний радиус.
  const maxR = Math.min(width, height) * 0.44;
  const rOut = Math.min(maxR, width * (p.radiusFraction + (p.growToFraction - p.radiusFraction) * grow));
  const cx = width * p.cx;
  const cy = height * (p.cy + (p.growCy - p.cy) * grow);
  const rIn = rOut * (1 - p.thickness);
  const rMid = (rOut + rIn) / 2;

  const centerIn = interpolate(frame - p.delayInFrames, [0, 16], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = frame > allIn ? ((frame - allIn) / (fps * p.spinSecondsPerTurn)) * 360 : 0;
  const centerFont = rIn * 0.42;
  // Блик: светлая полоса идёт по кольцу по кругу, период 2,4 с.
  const shimmerAngle = ((frame / fps) / 2.4) * 360;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: fontFamily(p.font) }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          {/* Металл: светлее к верху-слева, темнее к низу-справа. */}
          <linearGradient id="cycle-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
            <stop offset="45%" stopColor="#ffffff" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.28} />
          </linearGradient>
          {/* Бегущий серебристый блик: узкая светлая полоса, вращается вокруг центра. */}
          <linearGradient id="cycle-shine" gradientUnits="userSpaceOnUse" x1={cx - rOut} y1={cy} x2={cx + rOut} y2={cy} gradientTransform={`rotate(${shimmerAngle} ${cx} ${cy})`}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="42%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={0.75} />
            <stop offset="58%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          {p.segments.map((s, i) => {
            const a0 = i * (360 / n) + p.gapDeg / 2 + 4;
            const a1 = a0 + span - 14;
            const [sx, sy] = polar(cx, cy, rMid, a0);
            const [ex, ey] = polar(cx, cy, rMid, a1);
            // Нижним секторам текст переворачиваем, чтобы читался не вверх ногами.
            const flip = (a0 + a1) / 2 > 100 && (a0 + a1) / 2 < 260;
            const d = flip
              ? `M ${ex} ${ey} A ${rMid} ${rMid} 0 ${span > 180 ? 1 : 0} 0 ${sx} ${sy}`
              : `M ${sx} ${sy} A ${rMid} ${rMid} 0 ${span > 180 ? 1 : 0} 1 ${ex} ${ey}`;
            return <path key={`tp${i}`} id={`cycle-tp-${i}`} d={d} fill="none" />;
          })}
        </defs>
        <g transform={`rotate(${spin} ${cx} ${cy})`}>
          {p.segments.map((s, i) => {
            const start = p.delayInFrames + 12 + i * p.stepFrames;
            const t = interpolate(frame - start, [0, p.enterFrames], [0, 1], {
              easing: Easing.out(Easing.back(1.2)),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const op = interpolate(frame - start, [0, p.enterFrames * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const a0 = i * (360 / n) + p.gapDeg / 2;
            const a1 = a0 + span;
            // Приезжает по дуге: поворот из −50° и рост из центра.
            const rot = (1 - t) * -50;
            const sc = 0.55 + 0.45 * t;
            return (
              <g key={`seg${i}`} opacity={op} transform={`rotate(${rot} ${cx} ${cy}) translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`}>
                <path d={arrowSector(cx, cy, rOut, rIn, a0, a1)} fill={s.color} style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.35))" }} />
                {p.shimmer ? (
                  <>
                    <path d={arrowSector(cx, cy, rOut, rIn, a0, a1)} fill="url(#cycle-metal)" />
                    <path d={arrowSector(cx, cy, rOut, rIn, a0, a1)} fill="url(#cycle-shine)" style={{ mixBlendMode: "screen" }} />
                  </>
                ) : null}
                <text fill={p.labelColor} fontSize={rMid * 0.16} fontWeight={700} letterSpacing="0.04em" dominantBaseline="middle">
                  <textPath href={`#cycle-tp-${i}`} startOffset="50%" textAnchor="middle">
                    {s.label}
                  </textPath>
                </text>
                {p.sound ? (
                  <Sequence from={start} durationInFrames={20} layout="none">
                    <Audio src={staticFile(p.sound)} volume={0.4} />
                  </Sequence>
                ) : null}
              </g>
            );
          })}
        </g>
        <g transform={`translate(${cx} ${cy}) scale(${centerIn}) translate(${-cx} ${-cy})`}>
          <circle cx={cx} cy={cy} r={rIn * 0.86} fill={p.centerColor} style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.35))" }} />
          <text x={cx} y={cy} fill={p.centerTextColor} fontSize={centerFont} fontWeight={800} textAnchor="middle" dominantBaseline="central" letterSpacing="0.02em">
            {p.center}
          </text>
        </g>
      </svg>
    </div>
  );
};

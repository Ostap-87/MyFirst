import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { fontFamily } from "../../fonts";
import { withDefaults } from "./media";

/**
 * ArrowChart — «график роста»: стеклянная карточка с сеткой, по которой
 * вверх идёт ломаная линия с наконечником-стрелкой. Линия рисуется по
 * ходу блока: сначала быстрый рывок, потом уверенный подъём в правый
 * верхний угол; под линией — мягкая заливка, у наконечника — пульс.
 *
 * Чем это отличается от статичной картинки: движение стрелки читается
 * мгновенно как «растёт», даже если зритель не смотрит на цифры — а цифр
 * тут и нет, чтобы не спорить с речью.
 */
export const arrowChartSchema = z.object({
  x: z.number().min(0).max(1).describe("Центр карточки по ширине, доля кадра"),
  y: z.number().min(0).max(1).describe("Центр карточки по высоте, доля кадра"),
  widthFraction: z.number().min(0.2).max(1).describe("Ширина карточки, доля ширины кадра"),
  label: z.string().describe("Подпись сверху; пусто — без подписи"),
  color: z.string().describe("Цвет линии и стрелки"),
  drawSeconds: z.number().min(0.3).describe("За сколько секунд линия дорисовывается до конца"),
  bars: z.number().int().min(0).max(12).describe("Столбики фона под линией; 0 — без них"),
});

export type ArrowChartParams = z.infer<typeof arrowChartSchema>;
export type ArrowChartProps = Partial<ArrowChartParams>;

export const arrowChartDefaults: ArrowChartParams = {
  x: 0.5,
  y: 0.62,
  widthFraction: 0.72,
  label: "",
  color: "#4da3ff",
  drawSeconds: 1.6,
  bars: 7,
};

// Точки ломаной в долях карточки: x слева направо, y снизу вверх.
const POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.12],
  [0.16, 0.2],
  [0.3, 0.17],
  [0.45, 0.36],
  [0.58, 0.42],
  [0.72, 0.64],
  [0.86, 0.72],
  [1.0, 0.96],
];

export const ArrowChart: React.FC<ArrowChartProps> = (params) => {
  const p = withDefaults(arrowChartDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const cardW = width * p.widthFraction;
  const cardH = cardW * 0.62;
  const pad = cardW * 0.07;
  const plotW = cardW - pad * 2;
  const plotH = cardH - pad * 2 - cardW * 0.06;
  const plotTop = pad + cardW * 0.06;

  // Вход/выход карточки: подскок снизу и растворение в конце.
  const enter = interpolate(frame, [0, 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Доля линии, которая уже нарисована.
  const progress = interpolate(frame, [6, 6 + p.drawSeconds * fps], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const px = (t: number) => pad + t * plotW;
  const py = (t: number) => plotTop + (1 - t) * plotH;

  // Длины сегментов — чтобы стрелка шла равномерно, а не по точкам.
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < POINTS.length; i++) {
    const [x0, y0] = POINTS[i - 1];
    const [x1, y1] = POINTS[i];
    const len = Math.hypot(px(x1) - px(x0), py(y1) - py(y0));
    segs.push(len);
    total += len;
  }
  let remain = progress * total;
  const drawn: Array<[number, number]> = [[px(POINTS[0][0]), py(POINTS[0][1])]];
  let tip: [number, number] = drawn[0];
  let angle = 0;
  for (let i = 1; i < POINTS.length; i++) {
    const [x0, y0] = POINTS[i - 1];
    const [x1, y1] = POINTS[i];
    const a: [number, number] = [px(x0), py(y0)];
    const b: [number, number] = [px(x1), py(y1)];
    if (remain >= segs[i - 1]) {
      drawn.push(b);
      tip = b;
      angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      remain -= segs[i - 1];
    } else {
      const k = segs[i - 1] > 0 ? remain / segs[i - 1] : 0;
      tip = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      drawn.push(tip);
      angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      break;
    }
  }

  const line = drawn.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${tip[0].toFixed(1)},${py(0).toFixed(1)} ${px(0).toFixed(1)},${py(0).toFixed(1)}`;
  const stroke = Math.max(4, cardW * 0.012);
  const head = stroke * 3.2;
  const pulse = 1 + 0.15 * Math.sin((frame / fps) * Math.PI * 4);

  return (
    <div
      style={{
        position: "absolute",
        left: width * p.x - cardW / 2,
        top: height * p.y - cardH / 2 + (1 - enter) * cardH * 0.25,
        width: cardW,
        height: cardH,
        opacity: enter * exit,
        borderRadius: cardW * 0.05,
        background: "rgba(10, 14, 24, 0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        backdropFilter: "blur(14px)",
        overflow: "hidden",
      }}
    >
      {p.label ? (
        <div
          style={{
            position: "absolute",
            left: pad,
            top: pad * 0.55,
            fontFamily: fontFamily("Inter"),
            fontWeight: 700,
            fontSize: cardW * 0.045,
            letterSpacing: "0.02em",
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          {p.label}
        </div>
      ) : null}
      <svg width={cardW} height={cardH} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="ac-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={p.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Сетка */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={`h${t}`}
            x1={px(0)}
            x2={px(1)}
            y1={py(t)}
            y2={py(t)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        ))}
        {/* Столбики фона: растут вслед за линией */}
        {p.bars > 0
          ? Array.from({ length: p.bars }, (_, i) => {
              const t = (i + 0.5) / p.bars;
              const h = interpolate(t, [0, 1], [0.1, 0.85]) * plotH;
              const grow = interpolate(progress, [t * 0.8, Math.min(1, t * 0.8 + 0.2)], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const bw = (plotW / p.bars) * 0.55;
              return (
                <rect
                  key={`b${i}`}
                  x={px(t) - bw / 2}
                  y={py(0) - h * grow}
                  width={bw}
                  height={h * grow}
                  rx={bw * 0.2}
                  fill="rgba(255,255,255,0.08)"
                />
              );
            })
          : null}
        <polygon points={area} fill="url(#ac-area)" />
        <polyline
          points={line}
          fill="none"
          stroke={p.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Наконечник */}
        <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${(angle * 180) / Math.PI})`}>
          <circle r={head * 0.9 * pulse} fill={p.color} opacity={0.25} />
          <polygon
            points={`${head * 0.4},0 ${-head * 0.7},${-head * 0.55} ${-head * 0.45},0 ${-head * 0.7},${head * 0.55}`}
            fill={p.color}
          />
        </g>
      </svg>
    </div>
  );
};

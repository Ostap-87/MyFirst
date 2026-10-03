import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * AuraBot — робот-маскот Aura Robotics, плоская SVG-версия 3D-маскота с
 * сайта (aura-robotics.ru, /js/aura-mascot.js). Повторяет его пропорции,
 * палитру и набор жестов: idle (дыхание, покачивание, моргание, саккады
 * глаза), wave, nod, scan, point, shrug, jump. Все движения считаются от
 * номера кадра, случайность — через random(seed), поэтому рендер
 * воспроизводим. Длительности жестов — как у сайта (DUR).
 *
 * Жесты задаются списком `gestures: [{ at, kind }]` в кадрах композиции;
 * `look` (−1…1) поворачивает голову за «курсором» — в ролике это сторона,
 * где стоит спикер или появляется карточка.
 */
export const auraBotGestureSchema = z.enum(["wave", "nod", "scan", "point", "shrug", "jump"]);
export type AuraBotGesture = z.infer<typeof auraBotGestureSchema>;

export const auraBotSchema = z.object({
  gestures: z.array(z.object({ at: z.number().int().min(0), kind: auraBotGestureSchema })),
  look: z.number().min(-1).max(1).describe("Куда смотрит: −1 влево, 1 вправо"),
  light: z.string(),
  dark: z.string(),
  accent: z.string(),
  seed: z.number(),
  shadow: z.boolean().describe("Тень под ногами"),
  jumpHeight: z.number().min(0).max(200).describe("Высота прыжка в единицах viewBox (316 — рост робота)"),
});
export type AuraBotParams = z.infer<typeof auraBotSchema>;
export type AuraBotProps = Partial<AuraBotParams> & { style?: React.CSSProperties };

export const auraBotDefaults: AuraBotParams = {
  gestures: [],
  look: 0,
  light: "#f8f6f3",
  dark: "#262626",
  accent: "#fff65d",
  seed: 7,
  shadow: true,
  jumpHeight: 115,
};

/** Длительности жестов в секундах — как у aura-mascot.js. */
export const AURA_BOT_DUR: Record<AuraBotGesture, number> = { wave: 2.8, jump: 1.75, nod: 1.4, scan: 3.0, point: 2.2, shrug: 1.8 };

const JOINT = "#2c333b";
const METAL = "#9aa4ae";
const RUBBER = "#14171b";
const VISOR = "#05070a";
const SEAM = "#0d1014";

const envp = (p: number) => Math.sin(Math.min(Math.max(p, 0), 1) * Math.PI);
const lerp = (a: number, b: number, w: number) => a + (b - a) * w;

export const AuraBot: React.FC<AuraBotProps> = ({ style, ...params }) => {
  const p = withDefaults(auraBotDefaults, params);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Активный жест: последний начатый и ещё не закончившийся.
  let act: AuraBotGesture | null = null;
  let prog = 0;
  for (const g of p.gestures) {
    const el = (frame - g.at) / fps;
    if (el >= 0 && el < AURA_BOT_DUR[g.kind]) {
      act = g.kind;
      prog = el / AURA_BOT_DUR[g.kind];
    }
  }
  const e = act ? envp(prog) : 0;

  // Покой: покачивание, дыхание, сервоприводный дрожащий взгляд.
  const sway = Math.sin(t * 0.58);
  const bob = Math.sin(t * 1.5) * 2;
  const breathe = 1 + Math.sin(t * 1.5) * 0.009;
  const servo = Math.sin(t * 23.7) * 0.2 + Math.sin(t * 17.1) * 0.16;

  // Моргание и саккады — расписание из random(seed), один раз на весь ролик.
  let blink = 0;
  for (let k = 0, tb = 0; tb < t + 1 && k < 400; k++) {
    tb += 1.9 + random(`${p.seed}-blink-${k}`) * 3.8;
    if (t >= tb && t < tb + 0.12) blink = 1;
  }
  let sacc = 0;
  for (let k = 0, ts = 0; ts < t + 1 && k < 400; k++) {
    const next = ts + 1.2 + random(`${p.seed}-sacc-${k}`) * 2.4;
    if (t >= ts && t < next) sacc = (random(`${p.seed}-saccv-${k}`) - 0.5) * 6;
    ts = next;
  }

  // Поза по умолчанию (градусы и пиксели в системе viewBox 200×300).
  let headRot = p.look * 4 + servo * 0.3;
  let headDx = p.look * 5;
  let headDy = 0;
  let headSy = 1;
  let visorDx = p.look * 6;
  let eyeDx = p.look * 8 + sacc;
  let eyeGlow = 1;
  let torsoRot = sway * 1.2;
  let torsoSy = breathe;
  let rootDy = bob;
  let shR = 7 - sway * 2;
  let shL = -7 + sway * 2;
  let elR = -10;
  let elL = 10;
  let wrR = 0;
  const wrL = 0;
  let legSy = 1;
  let shinSy = 1;
  let legSpread = 0;

  if (act === "wave") {
    const s = Math.sin(t * 8.5);
    shR = lerp(shR, -118 + s * 3, e);
    elR = lerp(elR, -58 + s * 18, e);
    wrR = lerp(wrR, s * 24, e);
    shL = lerp(shL, -12, e);
    headRot = lerp(headRot, 7, e);
  } else if (act === "nod") {
    headDy = Math.sin(prog * Math.PI * 2) * 6;
    headSy = 1 - Math.abs(Math.sin(prog * Math.PI * 2)) * 0.05;
  } else if (act === "scan") {
    const yaw = Math.sin(prog * Math.PI * 2);
    headRot += yaw * 6;
    visorDx += yaw * 9;
    eyeDx += yaw * 12;
    eyeGlow = 1 + e * 0.8;
  } else if (act === "point") {
    shR = lerp(shR, -82, e);
    elR = lerp(elR, 4, e);
    torsoRot = lerp(torsoRot, 4, e);
    headRot = lerp(headRot, 5, e);
    headDx = lerp(headDx, 6, e);
    eyeDx = lerp(eyeDx, 9, e);
  } else if (act === "shrug") {
    shR = lerp(shR, 36, e);
    shL = lerp(shL, -36, e);
    elR = lerp(elR, -55, e);
    elL = lerp(elL, 55, e);
    headDy = e * 3;
  } else if (act === "jump") {
    let crouch = 0;
    let air = 0;
    let tuck = 0;
    let armX = 0;
    let spread = 0;
    let k = 0;
    if (prog < 0.2) {
      k = prog / 0.2;
      k *= k;
      crouch = k;
      armX = k * 0.95;
    } else if (prog < 0.32) {
      k = (prog - 0.2) / 0.12;
      crouch = 1 - k * 1.35;
      armX = 0.95 - k * 3.1;
    } else if (prog < 0.76) {
      k = (prog - 0.32) / 0.44;
      air = Math.sin(k * Math.PI);
      tuck = air * 1.05;
      armX = -2.15 + k * 0.3;
      spread = air * 0.3;
    } else if (prog < 0.9) {
      k = (prog - 0.76) / 0.14;
      crouch = Math.sin(k * Math.PI) * 1.25;
      armX = -0.85 * (1 - k) + k * 0.3;
      spread = 0.35 * Math.sin(k * Math.PI);
    } else {
      k = (prog - 0.9) / 0.1;
      crouch = 0.22 * (1 - k) * Math.cos(k * Math.PI * 2);
      armX = 0.3 * (1 - k);
    }
    const c = Math.max(0, crouch);
    legSy = 1 - c * 0.22 - tuck * 0.2;
    shinSy = 1 - c * 0.3 - tuck * 0.3;
    legSpread = spread * 20 + tuck * 6;
    rootDy = -air * p.jumpHeight + c * 26 + Math.max(0, -crouch) * -6;
    const arm = -armX * 42; // armX < 0 — руки вверх
    shR = arm + spread * 30;
    shL = -arm - spread * 30;
    elR = -c * 25;
    elL = c * 25;
    torsoRot = 0;
    torsoSy = 1 - c * 0.05 + air * 0.04;
    headDy = c * 3 - air * 3;
  }

  const L = p.light;
  const D = p.dark;
  const A = p.accent;
  const plate = (x: number, y: number, w: number, h: number, fill: string, r = 3) => (
    <>
      <rect x={x - 1.2} y={y - 1.2} width={w + 2.4} height={h + 2.4} rx={r + 1} fill={SEAM} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
    </>
  );
  const arm = (s: 1 | -1, sh: number, el: number, wr: number) => (
    <g transform={`translate(${100 + s * 54} 86) rotate(${sh})`}>
      <circle r={14.5} fill={JOINT} />
      {plate(s * 6 - 12, -10, 24, 22, L, 5)}
      {plate(-9, 6, 18, 44, L, 5)}
      <rect x={s > 0 ? 8 : -13} y={14} width={5} height={18} rx={2} fill={A} />
      <g transform={`translate(0 55) rotate(${el})`}>
        <circle r={10} fill={JOINT} />
        {plate(-7.75, 5, 15.5, 40, D, 5)}
        <g transform={`translate(0 49) rotate(${wr})`}>
          <rect x={-6.5} y={0} width={13} height={17} rx={3} fill={RUBBER} />
          <rect x={s > 0 ? 5 : -9.5} y={4} width={4.5} height={12} rx={2} fill={RUBBER} />
        </g>
      </g>
    </g>
  );
  const leg = (s: 1 | -1) => (
    <g transform={`translate(${100 + s * 19} 164) rotate(${s * legSpread})`}>
      <circle r={15} fill={JOINT} />
      <g transform={`scale(1 ${legSy})`}>
        {plate(-12.5, 7, 25, 54, L, 5)}
        <rect x={s > 0 ? 9 : -13} y={20} width={4} height={28} rx={2} fill={A} />
        <rect x={-3.5} y={10} width={7} height={40} fill={METAL} opacity={0.5} />
      </g>
      <g transform={`translate(0 ${64 * legSy}) scale(1 ${shinSy})`}>
        <circle r={12} fill={JOINT} />
        {plate(-7.5, -8, 15, 17, D, 3)}
        {plate(-10.5, 7, 21, 54, D, 5)}
      </g>
      <g transform={`translate(0 ${64 * legSy + 64 * shinSy})`}>
        <circle r={8.5} fill={JOINT} />
        {plate(-11.5, 4, 23, 11, L, 4)}
        <rect x={-12} y={14} width={24} height={5} rx={2} fill={RUBBER} />
      </g>
    </g>
  );

  return (
    <svg viewBox="0 0 200 316" style={{ display: "block", width: "100%", height: "100%", overflow: "visible", ...style }}>
      <defs>
        <radialGradient id="aurabot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={A} stopOpacity={0.9} />
          <stop offset="100%" stopColor={A} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="aurabot-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity={0.34} />
          <stop offset="100%" stopColor="#000" stopOpacity={0} />
        </radialGradient>
      </defs>
      {p.shadow ? <ellipse cx={100} cy={312} rx={interpolate(rootDy, [-p.jumpHeight, 30], [26, 52], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} ry={7} fill="url(#aurabot-shadow)" /> : null}
      <g transform={`translate(0 ${rootDy})`}>
        {leg(-1)}
        {leg(1)}
        {/* Таз */}
        <g transform="translate(100 164)">
          {plate(-30, -14, 60, 28, D, 6)}
          {plate(-25, -26, 50, 10, L, 4)}
          <circle cx={0} cy={-6} r={4.5} fill={A} />
        </g>
        {/* Корпус дышит и покачивается от низа грудины */}
        <g transform={`translate(100 140) rotate(${torsoRot}) scale(1 ${torsoSy}) translate(-100 -140)`}>
          {arm(-1, shL, elL, wrL)}
          {plate(64, 80, 72, 60, D, 7)}
          {plate(73, 86, 54, 44, L, 5)}
          <rect x={85} y={90} width={30} height={13} rx={3} fill={A} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={90} y={109 + i * 4} width={20} height={2.2} fill={SEAM} />
          ))}
          <circle cx={100} cy={102} r={9} fill="url(#aurabot-glow)" opacity={0.6 + Math.sin(t * 2.1) * 0.3} />
          <circle cx={100} cy={102} r={5} fill="#fff" opacity={0.9} />
          {plate(63, 60, 74, 20, L, 6)}
          <rect x={91} y={57} width={18} height={7} rx={2} fill={A} />
          {arm(1, shR, elR, wrR)}
          {/* Шея и голова */}
          <rect x={90} y={50} width={20} height={14} rx={4} fill={JOINT} />
          <g transform={`translate(${100 + headDx} ${54 + headDy}) rotate(${headRot}) scale(1 ${headSy})`}>
            <circle cx={0} cy={-24} r={26.5} fill={L} stroke={SEAM} strokeWidth={1.2} />
            <rect x={-15} y={-26} width={30} height={5} fill={SEAM} />
            <rect x={-13} y={-46} width={26} height={9} rx={2} fill={A} />
            <rect x={-27.5} y={-30} width={5.5} height={15} rx={2} fill={D} />
            <rect x={22} y={-30} width={5.5} height={15} rx={2} fill={D} />
            <g transform={`translate(${visorDx} 0) rotate(-2)`}>
              <rect x={-18} y={-28} width={36} height={21} rx={6} fill={VISOR} />
              <rect x={-16} y={-27} width={32} height={6} rx={3} fill="#fff" opacity={0.08} />
            </g>
            <g transform={`translate(${eyeDx} -17) scale(1 ${blink ? 0.1 : 1})`}>
              <circle r={9} fill="url(#aurabot-glow)" opacity={eyeGlow} />
              <circle r={5} fill="#fff" />
              <circle r={3.2} fill={A} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

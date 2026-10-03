import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { fontFamily } from "../../shared/fonts";

/**
 * AuraLogo — знак Aura Robotics для видео: монограмма AR из пяти элементов
 * (две ножки A, перекладина, дуга и ножка R) на белом круге, вокруг — кольцо
 * с названием «AURA ROBOTICS», которое медленно крутится. Размер шрифта
 * кольца считается от радиуса так, чтобы повторы названия закрыли окружность
 * целиком и без шва.
 *
 * Жизнь знака: при появлении элементы слетаются в монограмму (каждый со своей
 * стороны, с пружиной), раз в `reassembleEverySeconds` знак на миг
 * «рассыпается» и собирается заново, между этим по монограмме раз в
 * `shineEverySeconds` пробегает блик. Всё от номера кадра.
 *
 * Вектор монограммы снят с оригинального logo.png по измерениям, формы не
 * менялись: public/aura/mark.svg — тот же контур в статике.
 */
export type AuraLogoProps = {
  /** Диаметр белого круга, px. */
  size: number;
  cx: number;
  cy: number;
  ink?: string;
  accent?: string;
  ring?: boolean;
  ringText?: string;
  ringSecondsPerTurn?: number;
  reassembleEverySeconds?: number;
  shineEverySeconds?: number;
  /** Кадр, с которого знак появляется. */
  startFrame?: number;
  font?: string;
  plate?: boolean;
};

/** Пять элементов монограммы в системе 1280×415 исходного файла. */
export const AURA_MARK_PARTS: { d: string; from: [number, number] }[] = [
  { d: "M 558.2 0.1 L 558.6 87.2 L 444.6 276 L 391.6 276 Z", from: [-1, -0.6] }, // левая ножка A
  { d: "M 558.2 0.1 L 727.5 276 L 674.5 276 L 558.6 87.2 Z", from: [-0.2, 1] }, // правая ножка A
  { d: "M 610 4 L 800 4 L 800 43 L 633.3 43 Z", from: [0.4, -1] }, // перекладина R
  { d: "M 800 4 A 86 86 0 0 1 800 176 L 800 137 A 47 47 0 0 0 800 43 Z", from: [1, -0.3] }, // дуга R
  { d: "M 800 176 L 859.5 276 L 807.5 276 L 744.5 176 L 713.6 176 L 690.8 137 L 800 137 Z", from: [0.9, 1] }, // ножка R
];
/** Рамка монограммы в тех же координатах. */
export const AURA_MARK_BOX = { x: 391.6, y: 0, w: 468, h: 276 };

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size,
  cx,
  cy,
  ink = "#262626",
  accent = "#fff65d",
  ring = true,
  ringText = "AURA ROBOTICS",
  ringSecondsPerTurn = 18,
  reassembleEverySeconds = 12,
  shineEverySeconds = 5,
  startFrame = 0,
  font = "Inter",
  plate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const t = f / fps;
  const R = size / 2;

  // ——— кольцо: шрифт от радиуса, чтобы N повторов закрыли окружность ———
  const ringR = R * 0.86;
  const family = fontFamily(font);
  const probe = 100;
  const unit = `${ringText} · `;
  const unitW = measureText({ text: unit, fontFamily: family, fontSize: probe, fontWeight: "600", letterSpacing: "0.12em" }).width || probe * unit.length * 0.7;
  const circ = 2 * Math.PI * ringR;
  const wanted = R * 0.115; // желаемый кегль; повторы подбираются под него, кегль — под целое число повторов
  const repeats = Math.max(2, Math.round(circ / ((unitW * wanted) / probe)));
  const fontSize = (circ / repeats / unitW) * probe;
  const ringAngle = (t / ringSecondsPerTurn) * 360;

  // ——— появление и пересборка ———
  const cycle = reassembleEverySeconds * fps;
  const inCycle = f % cycle;
  const burst = f > 0 && inCycle < fps * 0.4 && f >= cycle; // разлёт перед сборкой
  const assembleFrom = f < cycle ? 0 : Math.floor(f / cycle) * cycle + Math.round(fps * 0.4);
  const assembleF = f < cycle ? f : Math.max(0, f - assembleFrom);
  const scatter = burst ? interpolate(inCycle, [0, fps * 0.4], [0, 1], { easing: Easing.out(Easing.quad) }) : 0;

  // ——— блик ———
  const shinePeriod = shineEverySeconds * fps;
  const shineT = (f % shinePeriod) / fps;
  const shineX = interpolate(shineT, [0, 0.9], [-0.6, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const markW = R * 1.1;
  const scale = markW / AURA_MARK_BOX.w;
  const markH = AURA_MARK_BOX.h * scale;
  const plateIn = spring({ frame: f, fps, config: { damping: 14, stiffness: 120 } });
  const uid = `aura-logo-${Math.round(cx)}-${Math.round(cy)}`;

  return (
    <svg width={size * 1.3} height={size * 1.3} viewBox={`${-size * 0.15} ${-size * 0.15} ${size * 1.3} ${size * 1.3}`} style={{ position: "absolute", left: cx - size * 0.65, top: cy - size * 0.65, overflow: "visible" }}>
      <defs>
        <path id={`${uid}-ring`} d={`M ${R} ${R} m ${-ringR} 0 a ${ringR} ${ringR} 0 1 1 ${ringR * 2} 0 a ${ringR} ${ringR} 0 1 1 ${-ringR * 2} 0`} />
        <linearGradient id={`${uid}-shine`} x1={shineX} y1={0} x2={shineX + 0.35} y2={0.5}>
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          {AURA_MARK_PARTS.map((part, i) => (
            <path key={i} d={part.d} transform={`translate(${R - markW / 2 - AURA_MARK_BOX.x * scale} ${R - markH / 2}) scale(${scale})`} />
          ))}
        </clipPath>
      </defs>
      {plate ? (
        <g transform={`translate(${R} ${R}) scale(${plateIn}) translate(${-R} ${-R})`}>
          <circle cx={R} cy={R} r={R} fill="#ffffff" stroke="#d9d7d5" strokeWidth={Math.max(2, size * 0.008)} />
          <circle cx={R} cy={R} r={R * 0.985} fill="none" stroke={accent} strokeWidth={Math.max(2, size * 0.006)} opacity={0.9} />
        </g>
      ) : null}
      {ring ? (
        <g transform={`rotate(${ringAngle} ${R} ${R})`} opacity={plateIn}>
          <text fontFamily={family} fontWeight={600} fontSize={fontSize} letterSpacing="0.12em" fill={ink}>
            <textPath href={`#${uid}-ring`} startOffset="0">
              {Array.from({ length: repeats }, () => unit).join("")}
            </textPath>
          </text>
        </g>
      ) : null}
      {AURA_MARK_PARTS.map((part, i) => {
        const s = spring({ frame: assembleF - i * 3, fps, config: { damping: 13, stiffness: 110, mass: 0.9 } });
        const w = Math.max(0, s - scatter);
        const dx = part.from[0] * size * 0.45 * (1 - w);
        const dy = part.from[1] * size * 0.45 * (1 - w);
        const rot = (1 - w) * (i % 2 ? 40 : -40);
        return (
          <g key={i} opacity={Math.min(1, w * 1.4)} transform={`translate(${dx} ${dy}) rotate(${rot} ${R} ${R})`}>
            <path d={part.d} fill={ink} transform={`translate(${R - markW / 2 - AURA_MARK_BOX.x * scale} ${R - markH / 2}) scale(${scale})`} />
          </g>
        );
      })}
      <rect x={0} y={0} width={size} height={size} fill={`url(#${uid}-shine)`} clipPath={`url(#${uid}-clip)`} style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};

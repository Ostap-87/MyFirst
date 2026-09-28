import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";
import { fontFamily } from "../../fonts";

/**
 * BigNumber — крупная цифра пункта: резко выскакивает на «во-первых»,
 * держится до начала объяснения и исчезает.
 *
 * Перечисление на слух теряется: к «в-пятых» зритель не помнит, сколько
 * было. Цифра на полкадра за долю секунды отмечает новый пункт, а уходит
 * раньше, чем начинается суть, — объяснение идёт уже по чистому кадру.
 *
 * ——— Как движется ———
 *
 * Вход за ~5 кадров: масштаб 1,9 → 1 жёсткой пружиной, размытие 12 → 0 px,
 * прозрачность 0 → 1 — «удар» в кадр. Держится с лёгким дыханием 1 → 1,04.
 * Выход за `exitFrames`: масштаб до 1,25 и прозрачность в ноль — цифра
 * «проходит сквозь» зрителя, а не сползает.
 *
 * ——— Начертания (`look`) ———
 *
 * solid     — заливка акцентом с белой обводкой (первый вариант)
 * outline   — полая цифра: только белый контур и свечение акцента
 * badge     — цифра в круглом значке акцента, подпись снизу
 * serif     — Cormorant с засечками, белая, с тонкой линией и «из 7»
 * glass     — матовое стекло: скруглённый квадрат, цифра белая
 * counter   — «01 / 07» табличными цифрами: техно-счётчик
 * gradient  — заливка градиентом акцент → голубой, мягкая тень
 */
export const bigNumberLooks = [
  "solid",
  "outline",
  "badge",
  "serif",
  "glass",
  "counter",
  "gradient",
] as const;

export const bigNumberSchema = z.object({
  text: z.string().describe("Что показать: «1», «2»…"),
  label: z.string().describe("Подпись под цифрой мелко, например «из 7»; пусто — без неё"),
  total: z.string().describe("Всего пунктов — для начертания counter («07»)"),
  look: z.enum(bigNumberLooks).describe("Начертание цифры"),
  color: z.string().describe("Цвет акцента"),
  x: z.number().min(0).max(1).describe("Центр по ширине, доля кадра"),
  y: z.number().min(0).max(1).describe("Центр по высоте, доля кадра"),
  sizeFraction: z.number().min(0.1).max(1).describe("Высота цифры, доля ширины кадра"),
  exitFrames: z.number().int().min(1).describe("Уход в кадрах"),
});

export type BigNumberParams = z.infer<typeof bigNumberSchema>;
export type BigNumberProps = Partial<BigNumberParams>;

export const bigNumberDefaults: BigNumberParams = {
  text: "1",
  label: "",
  total: "7",
  look: "solid",
  color: "#2563eb",
  x: 0.5,
  y: 0.66,
  sizeFraction: 0.5,
  exitFrames: 6,
};

const Glyph: React.FC<{ readonly p: BigNumberParams; readonly size: number }> = ({ p, size }) => {
  const shadow = `0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,0.55)`;
  const labelStyle: React.CSSProperties = {
    fontFamily: fontFamily("Inter"),
    fontWeight: 700,
    fontSize: size * 0.14,
    color: "#fff",
    marginTop: size * 0.02,
    letterSpacing: size * 0.004,
    textShadow: "0 2px 12px rgba(0,0,0,0.7)",
  };
  const label = p.label ? <div style={labelStyle}>{p.label}</div> : null;
  // Montserrat, а не Unbounded: у Unbounded единица с флажком-треугольником,
  // в крупном кегле она читается как стрелка.
  const heavy: React.CSSProperties = { fontFamily: fontFamily("Montserrat"), fontWeight: 900 };
  // Обводка — SVG-фильтром по альфе, а не -webkit-text-stroke: у переменного
  // Montserrat штрихи глифа перекрываются, и text-stroke рисует их внутренние
  // контуры (треугольники внутри «7»). Фильтр обводит только внешний край.
  const ring = Math.max(2, Math.round(size * 0.022));
  const id = `bn-${p.look}-${p.text}`;
  const filters = (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id={`${id}-under`} x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius={ring} result="grown" />
        <feFlood floodColor="#fff" />
        <feComposite in2="grown" operator="in" result="edge" />
        <feMerge>
          <feMergeNode in="edge" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${id}-ring`} x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius={ring} result="grown" />
        <feComposite in="grown" in2="SourceAlpha" operator="out" result="band" />
        <feFlood floodColor="#fff" />
        <feComposite in2="band" operator="in" />
      </filter>
    </svg>
  );

  switch (p.look) {
    case "outline":
      return (
        <>
          <div
            style={{
              ...heavy,
              fontSize: size,
              color: "#fff",
              filter: `url(#${id}-ring) drop-shadow(0 0 ${size * 0.06}px ${p.color}) drop-shadow(0 0 ${size * 0.14}px ${p.color})`,
            }}
          >
            {p.text}
          </div>
          {label}
          {filters}
        </>
      );
    case "badge": {
      const d = size * 0.95;
      return (
        <>
          <div
            style={{
              width: d,
              height: d,
              borderRadius: "50%",
              background: p.color,
              border: `${size * 0.03}px solid #fff`,
              boxShadow: shadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <span style={{ ...heavy, fontSize: size * 0.62, color: "#fff" }}>{p.text}</span>
          </div>
          {label}
        </>
      );
    }
    case "serif":
      return (
        <>
          <div
            style={{
              // Прямое начертание: курсивная единица Cormorant похожа на «I».
              fontFamily: fontFamily("Cormorant Garamond"),
              fontWeight: 700,
              fontSize: size * 1.15,
              color: "#fff",
              textShadow: shadow,
            }}
          >
            {p.text}
          </div>
          <div
            style={{
              width: size * 0.5,
              height: size * 0.012,
              background: "#fff",
              margin: `${size * 0.02}px auto 0`,
            }}
          />
          {p.label ? (
            <div
              style={{
                ...labelStyle,
                fontFamily: fontFamily("Cormorant Garamond"),
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: size * 0.18,
              }}
            >
              {p.label}
            </div>
          ) : null}
        </>
      );
    case "glass":
      return (
        <div
          style={{
            width: size * 0.95,
            padding: `${size * 0.06}px 0 ${size * 0.08}px`,
            borderRadius: size * 0.16,
            background: "rgba(255,255,255,0.18)",
            border: `${size * 0.012}px solid rgba(255,255,255,0.55)`,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: shadow,
            margin: "0 auto",
          }}
        >
          <div style={{ ...heavy, fontSize: size * 0.62, color: "#fff" }}>{p.text}</div>
          {p.label ? <div style={{ ...labelStyle, marginTop: 0, textShadow: "none" }}>{p.label}</div> : null}
        </div>
      );
    case "counter": {
      const pad = (s: string) => (s.length < 2 ? `0${s}` : s);
      return (
        <div
          style={{
            ...heavy,
            fontVariantNumeric: "tabular-nums",
            color: "#fff",
            textShadow: shadow,
            display: "flex",
            alignItems: "baseline",
            gap: size * 0.04,
          }}
        >
          <span style={{ fontSize: size * 0.6 }}>{pad(p.text)}</span>
          <span style={{ fontSize: size * 0.22, color: p.color, textShadow: "0 0 8px rgba(255,255,255,0.9)" }}>
            /{pad(p.total)}
          </span>
        </div>
      );
    }
    case "gradient":
      return (
        <>
          <div
            style={{
              ...heavy,
              fontSize: size,
              // Градиент в тексте — через background-clip, картинки нет:
              // правило no-background-image про загрузку изображений.
              backgroundImage: `linear-gradient(160deg, #7dd3fc 0%, ${p.color} 55%, #1e3a8a 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: `drop-shadow(0 ${size * 0.03}px ${size * 0.08}px rgba(0,0,0,0.5))`,
            }}
          >
            {p.text}
          </div>
          {label}
        </>
      );
    default:
      return (
        <>
          <div
            style={{
              ...heavy,
              fontSize: size,
              color: p.color,
              filter: `url(#${id}-under) drop-shadow(${shadow.replace(/^0 /, "0px ")})`,
            }}
          >
            {p.text}
          </div>
          {label}
          {filters}
        </>
      );
  }
};

export const BigNumber: React.FC<BigNumberProps> = (params) => {
  const p = withDefaults(bigNumberDefaults, params);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const hit = spring({ frame, fps, config: { damping: 14, mass: 0.5, stiffness: 320 } });
  const exit = interpolate(
    frame,
    [durationInFrames - p.exitFrames, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) },
  );
  const breathe = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  const scale = interpolate(hit, [0, 1], [1.9, 1]) * breathe * (1 + 0.25 * exit);
  const blur = interpolate(hit, [0, 1], [12, 0]);
  const opacity = Math.min(1, hit * 1.6) * (1 - exit);
  const size = width * p.sizeFraction;
  const halfW = p.look === "counter" ? size * 0.62 : size * 0.5;
  const left = Math.min(width * p.x, width * 0.96 - halfW);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: height * p.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: `blur(${blur}px)`,
        textAlign: "center",
        lineHeight: 1,
      }}
    >
      <Glyph p={p} size={size} />
    </div>
  );
};

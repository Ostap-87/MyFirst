import { CSSProperties, ReactNode } from "react";
import { useInView } from "../hooks";

/* Появление блока при скролле */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  y = 26,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: "div" | "section" | "article" | "li" | "figure";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const style: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transform: inView ? "none" : `translateY(${y}px)`,
    opacity: inView ? 1 : 0,
    transition: "opacity 0.85s cubic-bezier(0.19,1,0.22,1), transform 0.85s cubic-bezier(0.19,1,0.22,1)",
  };
  return (
    <Tag ref={ref as never} className={`${className} ${inView ? "inview" : ""}`} style={style}>
      {children}
    </Tag>
  );
}

/* Заголовок, выезжающий построчно из-под маски */
export function LineReveal({
  lines,
  className = "",
  baseDelay = 0,
  step = 110,
}: {
  lines: ReactNode[];
  className?: string;
  baseDelay?: number;
  step?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={`${className} ${inView ? "inview" : ""}`}>
      {lines.map((l, i) => (
        <span className="line-mask" key={i}>
          <span style={{ transitionDelay: `${baseDelay + i * step}ms` }}>{l}</span>
        </span>
      ))}
    </div>
  );
}

/* Единый заголовок секции: номер + ярлык + крупная строка */
export function SectionHead({
  index,
  label,
  lines,
  dark = false,
}: {
  index: string;
  label: string;
  lines: ReactNode[];
  dark?: boolean;
}) {
  return (
    <div>
      <p
        className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] ${
          dark ? "text-fog" : "text-dim"
        }`}
      >
        <span className="text-red">( {index} )</span>
        <span className={`h-px w-10 ${dark ? "bg-dline" : "bg-ink/25"}`} />
        {label}
      </p>
      <LineReveal
        lines={lines}
        className={`mt-5 font-display text-[clamp(1.8rem,4.6vw,3.4rem)] font-bold leading-[1.05] ${
          dark ? "text-bone" : "text-ink"
        }`}
      />
    </div>
  );
}

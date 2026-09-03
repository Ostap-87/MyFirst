/* Кастомные SVG-иконки, нарисованные вручную */

type P = { size?: number; className?: string };
const base = (size?: number) => ({
  width: size ?? 20,
  height: size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const ArrowUpRight = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M6.5 17.5 17.5 6.5" />
    <path d="M8.5 6.5h9v9" />
  </svg>
);

export const ArrowDown = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 4v16" />
    <path d="m5.5 13.5 6.5 6.5 6.5-6.5" />
  </svg>
);

export const ArrowRight = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 12h16" />
    <path d="m13.5 5.5 6.5 6.5-6.5 6.5" />
  </svg>
);

export const Globe = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.8 2.6 4 5.7 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.7-4-9s1.2-6.4 4-9Z" />
  </svg>
);

export const Plane = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M10.5 13.5 3 11l1.5-1.5L14 11l5.5-5.5c.6-.6 1.9-.3 1.9.7 0 .4-.2.8-.5 1.1L15.5 13l1.5 8.5L15.5 23l-2.5-7.5-4.5 3v3l-1.5 1-1-4.5L1.5 17l1-1.5h3l3-4.5" transform="scale(0.85) translate(1.5,-1)" />
  </svg>
);

export const Mail = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <rect x="3" y="5.5" width="18" height="13" />
    <path d="m3.5 6.5 8.5 7 8.5-7" />
  </svg>
);

export const Phone = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M5 4h4l1.5 4.5-2.2 1.6a12.5 12.5 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.5 1.5 0 0 1-1.7 1.5C10.5 19.6 4.4 13.5 3.5 5.7A1.5 1.5 0 0 1 5 4Z" />
  </svg>
);

export const Pin = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const Clock = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.5" />
  </svg>
);

export const Star4 = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3c.7 4.4 4.6 8.3 9 9-4.4.7-8.3 4.6-9 9-.7-4.4-4.6-8.3-9-9 4.4-.7 8.3-4.6 9-9Z" fill="currentColor" stroke="none" />
  </svg>
);

export const Doc = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M6 3.5h8l4 4V20.5H6Z" />
    <path d="M14 3.5v4h4" />
    <path d="M9 12h6M9 15.5h6" />
  </svg>
);

export const Send = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="m21 3-9.5 9.5" />
    <path d="M21 3 14 21l-2.5-8.5L3 10 21 3Z" />
  </svg>
);

export const Plus = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Check = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

/* Монограмма в квадратной рамке */
export const Monogram = ({ size = 34, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
    <rect x="1.5" y="1.5" width="37" height="37" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 31V9h3l9 14L29 9h3v22h-4.4V17.8L21 28h-2l-6.6-10.2V31H8Z" fill="currentColor" stroke="none" />
  </svg>
);

/* Play (видео) */
export const Play = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M7 4.8v14.4c0 .8.87 1.3 1.56.9l11.2-7.2c.63-.4.63-1.4 0-1.8L8.56 3.9c-.69-.4-1.56.1-1.56.9Z" fill="currentColor" stroke="none" />
  </svg>
);

/* Иконки-бейджи для карточек языков */
export const Landmark = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3.5 20 8H4Z" />
    <path d="M5 8v10.5M9.3 8v10.5M14.7 8v10.5M19 8v10.5" />
    <path d="M3.5 20.5h17" />
  </svg>
);

export const Pagoda = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 2.5v2.2" />
    <path d="M12 4.7 20 9H4Z" />
    <path d="M5.5 9 3 12.5h18L18.5 9" />
    <path d="M6.5 12.5 4 16.5h16l-2.5-4" />
    <path d="M9 16.5v4h6v-4" />
  </svg>
);

export const Gate = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 7.5c3-1.4 15-1.4 18 0" />
    <path d="M4.5 6.3v14.2M19.5 6.3v14.2" />
    <path d="M7 9.5v10M17 9.5v10" />
    <path d="M2.5 10c3.2-1 16.8-1 19 0" />
  </svg>
);

export const Ornament = ({ size, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3v18M3 12h18" />
    <path d="M12 3c1.8 2.6 1.8 6.4 0 9-1.8-2.6-1.8-6.4 0-9Z" />
    <path d="M12 12c1.8 2.6 1.8 6.4 0 9-1.8-2.6-1.8-6.4 0-9Z" />
    <path d="M3 12c2.6-1.8 6.4-1.8 9 0-2.6 1.8-6.4 1.8-9 0Z" />
    <path d="M12 12c2.6-1.8 6.4-1.8 9 0-2.6 1.8-6.4 1.8-9 0Z" />
  </svg>
);

/* Печать-штамп */
export const Stamp = ({ size = 96, className, text = "ДС · 2026" }: P & { text?: string }) => (
  <div
    className={`flex items-center justify-center rounded-full border-2 border-dashed border-red text-red ${className ?? ""}`}
    style={{ width: size, height: size }}
    aria-hidden
  >
    <div className="text-center font-mono leading-tight" style={{ fontSize: size / 9 }}>
      <p className="font-bold tracking-[0.2em]">{text}</p>
      <p className="mt-0.5 tracking-[0.14em] opacity-80">ПРОВЕРЕНО</p>
    </div>
  </div>
);

import { COMPANIES, useI18n } from "../i18n";
import { useClock, useCountUp, useInView, useScramble } from "../hooks";
import { ArrowDown, ArrowUpRight, Star4 } from "./Icons";
import Reveal from "./Reveal";

function Stat({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { ref, val } = useCountUp(value);
  return (
    <Reveal delay={delay} className="flex items-baseline gap-3">
      <span ref={ref} className="tnum font-display text-4xl font-extrabold sm:text-5xl">
        {Math.round(val)}
        <span className="text-blue">{suffix}</span>
      </span>
      <span className="max-w-[8rem] font-mono text-[10.5px] uppercase leading-snug tracking-[0.14em] text-dim">
        {label}
      </span>
    </Reveal>
  );
}

function Marquee({ items, reverse = false, speed = "30s" }: { items: string[]; reverse?: boolean; speed?: string }) {
  const row = [...items, ...items];
  return (
    <div className="marquee overflow-hidden" aria-hidden>
      <div className={`marquee-track ${reverse ? "reverse" : ""}`} style={{ ["--speed" as string]: speed }}>
        {row.map((text, i) => (
          <span key={i} className="flex shrink-0 items-center gap-5 pr-5">
            <span className="whitespace-nowrap font-display text-[13px] font-bold uppercase tracking-[0.14em]">{text}</span>
            <Star4 size={12} className="shrink-0 text-yellow" />
          </span>
        ))}
      </div>
    </div>
  );
}

function SpinBadge() {
  const { t } = useI18n();
  return (
    <div className="relative h-36 w-36 text-ink lg:h-72 lg:w-72">
      <svg viewBox="0 0 120 120" className="spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id="badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" fill="none" />
        </defs>
        <text fill="currentColor" fontSize="10" letterSpacing="2.6" fontFamily="JetBrains Mono, monospace">
          <textPath href="#badge-circle">{t.hero.badge}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ArrowUpRight size={30} className="text-red lg:hidden" />
        <ArrowUpRight size={60} className="hidden text-red lg:block" />
      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useI18n();
  const first = useScramble(t.hero.firstName, 30, 350);
  const last = useScramble(t.hero.lastName, 30, 900);
  const msk = useClock("Europe/Moscow");
  const sh = useClock("Asia/Shanghai");
  const head = useInView<HTMLDivElement>(0.2);

  return (
    <section id="top" className="dotgrid relative overflow-hidden bg-bone">
      <div
        aria-hidden
        className="stroke-text pointer-events-none absolute -right-8 top-16 select-none font-display text-[38vw] font-black leading-none opacity-70"
      >
        {t.hero.watermark}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32 lg:pb-16">
        <Reveal className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.26em] text-dim">
          <span>{t.hero.kicker}</span>
          <span className="hidden sm:block">{t.hero.sub}</span>
        </Reveal>

        <div ref={head.ref} className={head.inView ? "inview" : ""}>
          <h1 className="mt-8 font-display font-black leading-[0.95] tracking-tight">
            <span className="line-mask text-[clamp(2.9rem,11vw,8.6rem)]">
              <span style={{ transitionDelay: "120ms" }}>
                {first}
                <span className="blink text-blue">_</span>
              </span>
            </span>
            <span className="line-mask text-[clamp(2.9rem,11vw,8.6rem)]">
              <span style={{ transitionDelay: "240ms" }}>
                <span className="hl">{last}</span>
                <span className="text-red">.</span>
              </span>
            </span>
          </h1>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <Reveal delay={200}>
              <p className="max-w-xl text-[15.5px] leading-relaxed text-ink/80">{t.hero.intro}</p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#contact"
                  className="group flex items-center gap-3 bg-ink px-6 py-4 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-bone transition-all hover:bg-blue hover:shadow-[6px_6px_0_var(--color-yellow)]"
                >
                  {t.hero.ctaPrimary}
                  <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#projects"
                  className="group flex items-center gap-3 border-2 border-ink px-6 py-4 font-display text-[12px] font-bold uppercase tracking-[0.14em] transition-all hover:bg-yellow"
                >
                  {t.hero.ctaSecondary}
                  <ArrowDown size={16} className="transition-transform duration-300 group-hover:translate-y-1" />
                </a>
              </div>
            </Reveal>
            <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6">
              {t.hero.stats.map((s, i) => (
                <Stat key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={380 + i * 120} />
              ))}
            </div>
          </div>

          <Reveal delay={300} className="flex flex-row items-center justify-between gap-6 lg:flex-col lg:items-end lg:justify-start lg:-mt-[247px]">
            <SpinBadge />
            <div className="border border-ink/20 bg-card px-5 py-4 text-right shadow-[6px_6px_0_rgba(25,25,34,0.08)] lg:px-10 lg:py-8 lg:shadow-[12px_12px_0_rgba(25,25,34,0.08)]">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-dim lg:text-[19px]">{t.hero.clockLabel}</p>
              {t.contact.cities.map((c, i) => (
                <p
                  key={c.tz}
                  className={`tnum font-mono text-sm text-ink lg:text-[28px] ${i === 0 ? "mt-2 lg:mt-4" : "mt-1 lg:mt-2"}`}
                >
                  {c.name} <span className={i === 0 ? "text-blue" : "text-red"}>{i === 0 ? msk : sh}</span>
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <div className="relative -mx-2 -rotate-1">
        <div className="border-y-2 border-ink bg-ink py-3 text-bone">
          <Marquee items={COMPANIES} speed="34s" />
        </div>
        <div className="border-y-2 border-ink bg-yellow py-3 text-ink">
          <Marquee items={t.hero.ticker} reverse speed="40s" />
        </div>
      </div>
    </section>
  );
}

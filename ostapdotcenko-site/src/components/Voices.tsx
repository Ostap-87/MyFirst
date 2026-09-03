import { useI18n } from "../i18n";
import { ArrowUpRight } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

/* ---------- отзывы: разбросанные открытки ---------- */

export function Testimonials() {
  const { t } = useI18n();

  return (
    <section className="dotgrid relative overflow-hidden bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHead
          index="07"
          label={t.testimonials.label}
          lines={t.testimonials.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
        />

        <div className="mt-16 flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          {t.testimonials.items.map((tm, i) => (
            <Reveal key={tm.name} delay={i * 140} className="w-full max-w-md lg:w-1/3" y={40}>
              <figure
                className="relative border-2 border-ink bg-card p-7 shadow-[8px_8px_0_rgba(25,25,34,0.12)] transition-all duration-400 hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:shadow-[12px_12px_0_var(--color-yellow)]"
                style={{ transform: `rotate(${tm.tilt}deg)` }}
              >
                <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 bg-yellow/80 shadow-sm" aria-hidden />
                <span
                  className="absolute right-4 top-4 flex h-11 w-9 items-center justify-center border border-dashed border-red font-mono text-[9px] font-bold text-red"
                  aria-hidden
                >
                  26
                </span>
                <blockquote className="pr-8 text-[14px] leading-relaxed text-ink/85">
                  <span className="font-display text-2xl font-black text-red">«</span>
                  {tm.text}
                  <span className="font-display text-2xl font-black text-red">»</span>
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-dashed border-ink/25 pt-5">
                  <span className="flex h-11 w-11 items-center justify-center bg-ink font-display text-[12px] font-bold text-yellow">
                    {tm.initials}
                  </span>
                  <span>
                    <span className="block font-display text-[13px] font-bold">{tm.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-dim">{tm.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- упоминания в СМИ: реальные ссылки ---------- */

export function Press() {
  const { t } = useI18n();

  return (
    <section id="media" className="relative border-y-2 border-ink bg-card">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            index="08"
            label={t.press.label}
            lines={t.press.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
          />
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.press.items.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col border border-ink/25 bg-bone p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue hover:shadow-[6px_6px_0_var(--color-blue)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue">{p.outlet}</span>
                  <span className="border border-ink/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-dim transition-colors group-hover:border-blue group-hover:text-blue">
                    {p.tag}
                  </span>
                </div>
                <p className="mt-4 flex-1 font-display text-[14.5px] font-bold leading-snug">{p.title}</p>
                <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-blue opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t.press.openBtn} <ArrowUpRight size={12} className="text-red" />
                </p>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

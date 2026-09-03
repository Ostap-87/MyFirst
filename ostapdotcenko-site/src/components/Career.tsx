import { useI18n } from "../i18n";
import { useScrollDrift } from "../hooks";
import { ArrowUpRight } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

export function Career() {
  const { t } = useI18n();
  const { trackRef, offset } = useScrollDrift<HTMLOListElement>(70);

  return (
    <section id="career" className="blueprint relative overflow-hidden bg-deep text-bone">
      <div
        aria-hidden
        className="stroke-text-light pointer-events-none absolute -left-6 bottom-0 select-none font-display text-[30vw] font-black leading-none opacity-60"
      >
        13
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div style={{ transform: `translateY(${offset}px)` }}>
              <SectionHead
                dark
                index="02"
                label={t.career.label}
                lines={t.career.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
              />
              <Reveal delay={200}>
                <p className="mt-7 max-w-md text-[14.5px] leading-relaxed text-fog">{t.career.intro}</p>
              </Reveal>
              <Reveal delay={300}>
                <a
                  href="#contact"
                  className="group mt-8 inline-flex items-center gap-3 border border-fog/40 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone transition-all hover:border-yellow hover:bg-yellow hover:text-ink"
                >
                  {t.career.cvBtn}
                  <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </Reveal>
            </div>
          </div>

          <ol ref={trackRef} className="relative border-l-2 border-dline">
            {t.career.entries.map((c, i) => {
              const empty = "empty" in c && c.empty;
              return (
                <Reveal as="li" key={c.years} delay={i * 70} className="group relative pb-10 pl-8 last:pb-0 sm:pl-12">
                  <span
                    className={`absolute -left-[9px] top-1.5 h-4 w-4 border-2 transition-colors duration-300 ${
                      empty ? "border-dashed border-yellow bg-transparent" : "border-deep bg-fog group-hover:bg-yellow"
                    }`}
                  />
                  <p className={`tnum font-mono text-[11px] uppercase tracking-[0.24em] ${empty ? "text-yellow" : "text-fog"}`}>
                    {c.years}
                  </p>
                  <div
                    className={`mt-3 p-5 transition-all duration-300 sm:p-6 ${
                      empty
                        ? "border-2 border-dashed border-yellow/50 bg-transparent group-hover:border-yellow"
                        : "border border-dline bg-panel/70 group-hover:-translate-y-1 group-hover:border-yellow/60 group-hover:bg-panel group-hover:shadow-[8px_8px_0_rgba(255,217,46,0.12)]"
                    }`}
                  >
                    <h3 className={`font-display text-lg font-bold sm:text-xl ${empty ? "text-yellow" : "text-bone"}`}>{c.role}</h3>
                    <p className={`mt-2 text-[13.5px] leading-relaxed ${empty ? "text-fog/70 italic" : "text-fog"}`}>{c.company}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.chips.map((ch) => {
                        const link = "links" in c ? c.links?.find((l) => l.label === ch) : undefined;
                        const chipClass = `tnum border px-2.5 py-1 font-mono text-[10.5px] transition-colors ${
                          empty
                            ? "border-dashed border-yellow/40 text-yellow/70"
                            : "border-dline bg-deep text-bone/85 group-hover:border-yellow/40"
                        }`;
                        return link ? (
                          <a
                            key={ch}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`${chipClass} hover:border-yellow hover:text-yellow`}
                          >
                            {ch} ↗
                          </a>
                        ) : (
                          <span key={ch} className={chipClass}>
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Results() {
  const { t } = useI18n();

  return (
    <section id="results" className="relative bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-28">
        <SectionHead
          index="03"
          label={t.results.label}
          lines={t.results.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
        />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.results.items.map((r, i) => {
            const tone =
              r.tone === "yellow"
                ? "bg-yellow text-ink border-ink hover:shadow-[10px_10px_0_var(--color-ink)]"
                : r.tone === "red"
                ? "bg-red text-bone border-ink hover:shadow-[10px_10px_0_var(--color-yellow)]"
                : r.tone === "outline"
                ? "bg-transparent text-ink border-2 border-ink hover:bg-ink hover:text-bone"
                : "bg-card text-ink border-ink/20 hover:shadow-[10px_10px_0_var(--color-yellow)]";
            return (
              <Reveal
                key={r.label}
                delay={i * 70}
                className={`group flex flex-col justify-between border-2 p-6 transition-all duration-300 hover:-translate-y-1.5 sm:p-7 ${tone} ${
                  "span" in r && r.span ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                <p className={`tnum font-display font-black leading-none ${"span" in r && r.span ? "text-[clamp(3.4rem,8vw,6.5rem)]" : "text-[clamp(2rem,4vw,3.2rem)]"}`}>
                  {r.value}
                </p>
                <div className="mt-6">
                  <p className="font-display text-[13px] font-bold leading-snug">{r.label}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">{r.note}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={200}>
          <p className="mt-8 max-w-2xl font-mono text-[10.5px] uppercase leading-relaxed tracking-wider text-dim">{t.results.note}</p>
        </Reveal>
      </div>
    </section>
  );
}

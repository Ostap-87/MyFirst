import { photo, useI18n } from "../i18n";
import { useInView, useScrambleReveal } from "../hooks";
import { Star4 } from "./Icons";
import Reveal, { LineReveal } from "./Reveal";

function BioParagraph({ text, index }: { text: string; index: number }) {
  const { ref, out } = useScrambleReveal<HTMLParagraphElement>(text, {
    duration: Math.min(1400, 500 + text.length * 3),
    startDelay: index * 150,
  });
  return (
    <p ref={ref} className={`${index === 0 ? "mt-8" : "mt-4"} max-w-xl text-[15px] leading-relaxed text-ink/80`}>
      {out}
    </p>
  );
}

export default function About() {
  const { t } = useI18n();
  const langs = useInView<HTMLDivElement>(0.25);

  return (
    <section id="about" className="relative bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* портрет — фото грузится из public/img (GitHub) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal y={34}>
              <figure className="relative mx-auto max-w-[420px] -rotate-2 border-2 border-ink bg-card p-4 shadow-[14px_14px_0_var(--color-yellow)] transition-transform duration-500 hover:rotate-0">
                <div className="relative aspect-[4/5] overflow-hidden border border-ink/20 bg-deep">
                  <img
                    src={photo("portrait.jpg")}
                    alt={`${t.hero.firstName} ${t.hero.lastName}`}
                    className="kenburns h-full w-full object-cover"
                  />
                </div>
              </figure>
            </Reveal>
          </div>

          <div>
            <p className="flex items-center gap-3 font-mono text-[22px] uppercase tracking-[0.3em] text-ink">
              <span className="text-red">( 01 )</span>
              <span className="h-px w-10 bg-ink/25" />
              {t.about.label}
            </p>
            <LineReveal
              lines={t.about.lines}
              className="mt-5 font-display text-[clamp(2rem,4.8vw,3.6rem)] font-black leading-[1.03]"
            />

            {t.about.bio.map((p, i) => (
              <BioParagraph key={i} text={p} index={i} />
            ))}

            <Reveal delay={230}>
              <div className="mt-6 max-w-xl border-l-2 border-red pl-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">{t.about.educationLabel}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">{t.about.education}</p>
              </div>
            </Reveal>

            {/* экспертиза */}
            <Reveal delay={280}>
              <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.26em] text-dim">{t.about.expertiseLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {t.about.expertise.map((e) => (
                  <span
                    key={e}
                    className="group flex cursor-default items-center gap-2 border border-ink/30 bg-card px-3.5 py-2 font-mono text-[11.5px] font-medium transition-all duration-200 hover:border-ink hover:bg-ink hover:text-yellow hover:shadow-[4px_4px_0_var(--color-yellow)]"
                  >
                    <Star4 size={10} className="text-red transition-colors group-hover:text-yellow" />
                    {e}
                  </span>
                ))}
              </div>
            </Reveal>

            {/* языки */}
            <Reveal delay={330}>
              <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.26em] text-dim">{t.about.langsLabel}</p>
              <div ref={langs.ref} className={`mt-4 max-w-xl space-y-4 ${langs.inView ? "inview" : ""}`}>
                {t.about.langs.map((l, i) => (
                  <div key={l.name}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-display text-[14px] font-bold">{l.name}</span>
                      <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">{l.level}</span>
                    </div>
                    <div className="h-[6px] w-full border border-ink/25 bg-card">
                      <div
                        className="h-full transition-[width] duration-1000 ease-out"
                        style={{
                          width: langs.inView ? `${l.pct}%` : "0%",
                          transitionDelay: `${i * 130}ms`,
                          background: i === 0 ? "var(--color-ink)" : i % 2 ? "var(--color-blue)" : "var(--color-red)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

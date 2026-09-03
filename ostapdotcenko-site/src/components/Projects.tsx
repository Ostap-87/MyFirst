import { useState } from "react";
import { useI18n } from "../i18n";
import { Plus } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

export default function Projects() {
  const { t } = useI18n();
  const [open, setOpen] = useState(0);

  return (
    <section id="projects" className="dotgrid relative bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <SectionHead
            index="04"
            label={t.projects.label}
            lines={t.projects.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
          />
          <Reveal delay={200}>
            <p className="max-w-xs font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-dim">
              {t.projects.intro}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 border-t-2 border-ink">
          {t.projects.items.map((p, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={p.title} delay={i * 60}>
                <article className={`border-b-2 border-ink transition-colors duration-300 ${isOpen ? "bg-card" : "hover:bg-card/60"}`}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="group flex w-full items-center gap-4 px-2 py-6 text-left sm:gap-8 sm:px-4"
                  >
                    <span className={`tnum shrink-0 font-mono text-[12px] font-bold ${isOpen ? "text-red" : "text-dim"} transition-colors`}>
                      /{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-blue">{p.tag}</span>
                      <span
                        className={`mt-1 block font-display text-lg font-bold leading-tight transition-all duration-300 group-hover:translate-x-1 sm:text-2xl ${
                          isOpen ? "text-blue" : "text-ink"
                        }`}
                      >
                        {p.title}
                      </span>
                    </span>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink transition-all duration-300 ${
                        isOpen ? "rotate-45 bg-red text-bone" : "bg-transparent group-hover:bg-yellow"
                      }`}
                    >
                      <Plus size={18} />
                    </span>
                  </button>

                  <div
                    className="grid transition-[grid-template-rows] duration-500 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="grid gap-6 px-2 pb-8 sm:grid-cols-[1fr_auto] sm:px-4 sm:pl-[4.5rem] lg:pl-[5.5rem]">
                        <div>
                          <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink/75">{p.desc}</p>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {p.chips.map((c) => (
                              <span
                                key={c}
                                className="tnum border border-ink/30 bg-bone px-3 py-1.5 font-mono text-[11px] font-medium transition-colors hover:border-red hover:text-red"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="hidden h-full w-28 border-l-2 border-dashed border-ink/20 sm:block" aria-hidden />
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

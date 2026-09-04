import { useEffect, useState } from "react";
import { photo, useI18n } from "../i18n";
import { Plus, Star4 } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

/* Хобби, путешествия и фотогалерея. Фото добавляются в public/img (GitHub) + строка в src/i18n */

const TILTS = [-3, 2.5, -2, 3, -1.5];

export default function Life() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenIndex(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex]);

  const active = openIndex !== null ? t.life.shots[openIndex] : null;

  return (
    <section id="life" className="relative overflow-hidden bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <SectionHead
            index="09"
            label={t.life.label}
            lines={t.life.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
          />
          <Reveal delay={150}>
            <p className="max-w-sm font-mono text-[21px] uppercase leading-relaxed tracking-[0.1em] text-ink sm:max-w-md">{t.life.intro}</p>
          </Reveal>
        </div>

        {/* хобби */}
        <div className="mt-12 border-y-2 border-ink py-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">{t.life.hobbiesLabel}:</span>
            {t.life.hobbies.map((h) => (
              <span
                key={h}
                className="group flex cursor-default items-center gap-2 font-display text-[13.5px] font-semibold text-ink/80 transition-colors hover:text-red"
              >
                <Star4 size={11} className="text-yellow transition-transform duration-300 group-hover:rotate-90 group-hover:text-red" />
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* галерея-полароиды */}
        <Reveal delay={100}>
          <p className="mt-14 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-dim">
            <span className="h-2 w-2 bg-red" /> {t.life.galleryLabel}
          </p>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-start justify-center gap-7 lg:justify-between">
          {t.life.shots.map((g, i) => (
            <Reveal
              key={g.img}
              delay={i * 100}
              className="w-[46%] max-w-[240px] sm:w-[30%] lg:w-auto"
              y={36}
            >
              <figure
                className="group cursor-pointer border-2 border-ink bg-card p-2.5 pb-3 shadow-[7px_7px_0_rgba(25,25,34,0.14)] transition-all duration-400 hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:shadow-[10px_10px_0_var(--color-yellow)]"
                style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
                onClick={() => setOpenIndex(i)}
              >
                <div className="relative aspect-square overflow-hidden border border-ink/15 bg-deep">
                  <img
                    src={photo(g.img)}
                    alt={g.caption}
                    loading="lazy"
                    className="kenburns h-full w-full object-cover"
                    style={{ animationDelay: `${i * 1.4}s` }}
                  />
                  <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-bone">
                    {g.place}
                  </span>
                </div>
                <figcaption className="tnum mt-2.5 flex items-baseline justify-between gap-2 px-0.5">
                  <span className="truncate font-mono text-[9.5px] uppercase tracking-wider text-dim">{g.caption}</span>
                  <span className="font-mono text-[9px] text-red">’{g.year}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}

        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm sm:p-10"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border-2 border-bone/60 text-bone transition-colors hover:border-yellow hover:text-yellow sm:right-8 sm:top-8"
            onClick={() => setOpenIndex(null)}
          >
            <Plus size={20} className="rotate-45" />
          </button>
          <figure className="flex max-h-full max-w-4xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={photo(active.img)}
              alt={active.caption}
              className="max-h-[80vh] max-w-full border-2 border-bone/40 object-contain"
            />
            <figcaption className="tnum mt-4 flex items-baseline gap-3 font-mono text-[12px] uppercase tracking-wider text-bone">
              <span className="bg-ink px-2 py-0.5 font-bold text-yellow">{active.place}</span>
              <span>{active.caption}</span>
              <span className="text-red">’{active.year}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

import { photo, useI18n } from "../i18n";
import { Star4 } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

/* Хобби, путешествия и фотогалерея. Фото добавляются в public/img (GitHub) + строка в src/i18n */

const TILTS = [-3, 2.5, -2, 3, -1.5];

export default function Life() {
  const { t } = useI18n();

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
            <p className="max-w-xs font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-dim">{t.life.intro}</p>
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
                className="group border-2 border-ink bg-card p-2.5 pb-3 shadow-[7px_7px_0_rgba(25,25,34,0.14)] transition-all duration-400 hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:shadow-[10px_10px_0_var(--color-yellow)]"
                style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
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
                  <span className="font-mono text-[9px] text-red">’{24 + (i % 3)}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}

        </div>
      </div>
    </section>
  );
}

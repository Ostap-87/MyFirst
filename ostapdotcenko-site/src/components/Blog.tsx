import { useState } from "react";
import { useI18n } from "../i18n";
import { ArrowUpRight, Play, Plus } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

/* Блог: статьи + видео. Публикации добавляются в src/i18n/ (массивы articles / videos) */
export default function Blog() {
  const { t } = useI18n();
  const b = t.blog;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="blog" className="dotgrid relative bg-bone">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <SectionHead
            index="06"
            label={b.label}
            lines={b.lines.map((l, i) => (i === 0 ? <span key={i} className="hl">{l}</span> : l))}
          />
          <Reveal delay={200}>
            <p className="max-w-sm font-mono text-[21px] uppercase leading-relaxed tracking-[0.1em] text-ink sm:max-w-md">{b.intro}</p>
          </Reveal>
        </div>

        {/* статьи */}
        <Reveal delay={120}>
          <p className="mt-14 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-dim">
            <span className="h-2 w-2 bg-red" /> {b.articlesLabel}
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {b.articles.map((a, i) => {
            const isOpen = openIdx === i;
            return (
              <Reveal key={a.title} delay={i * 110}>
                <article
                  className={`flex h-full flex-col border-2 border-ink bg-card transition-all duration-300 ${
                    isOpen ? "shadow-[8px_8px_0_var(--color-red)]" : "hover:shadow-[8px_8px_0_var(--color-yellow)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-5 py-3">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${isOpen ? "text-red" : "text-blue"}`}>
                      {a.tag}
                    </span>
                    <span className="tnum font-mono text-[10px] text-dim">{a.time}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-[16.5px] font-bold leading-snug">{a.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-ink/70">{a.excerpt}</p>
                    <div
                      className="grid transition-[grid-template-rows] duration-500 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p className="border-l-2 border-red pt-4 text-[13px] leading-relaxed text-ink/75">{a.full}</p>
                        {a.link && (
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue hover:text-red"
                          >
                            {b.watchBtn} <ArrowUpRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="group mt-auto flex items-center gap-2 pt-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:text-red"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center border border-ink/40 transition-all duration-300 group-hover:border-red group-hover:bg-red group-hover:text-bone ${
                          isOpen ? "rotate-45 border-red bg-red text-bone" : ""
                        }`}
                      >
                        <Plus size={13} />
                      </span>
                      {isOpen ? b.collapseBtn : b.expandBtn}
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* видео */}
        <Reveal delay={120}>
          <p className="mt-16 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-dim">
            <span className="h-2 w-2 bg-blue" /> {b.videosLabel}
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {b.videos.map((v, i) => {
            const playable = Boolean(v.url);
            const inner = (
              <>
                {/* обложка */}
                <div className="relative aspect-video overflow-hidden border-b-2 border-ink bg-deep">
                  <div className="absolute inset-0 blueprint" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`flex h-16 w-16 items-center justify-center border-2 transition-all duration-300 ${
                        playable
                          ? "border-bone bg-red text-bone group-hover:scale-110 group-hover:bg-yellow group-hover:text-ink"
                          : "border-dashed border-fog/50 text-fog"
                      }`}
                    >
                      <Play size={22} />
                    </span>
                  </div>
                  <span className="tnum absolute bottom-3 right-3 bg-ink px-2 py-1 font-mono text-[10.5px] font-bold text-bone">
                    {v.duration}
                  </span>
                  <span className="absolute left-3 top-3 border border-bone/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-bone/80">
                    {v.platform}
                  </span>
                  {!playable && (
                    <span className="absolute right-3 top-3 bg-yellow px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ink">
                      {b.soonTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <h3 className="font-display text-[14px] font-bold leading-snug">{v.title}</h3>
                  {playable && (
                    <ArrowUpRight size={18} className="shrink-0 text-red transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  )}
                </div>
              </>
            );

            return (
              <Reveal key={v.title} delay={i * 110}>
                {playable ? (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block border-2 border-ink bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[8px_8px_0_var(--color-blue)]"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="group border-2 border-ink bg-card opacity-90 transition-all duration-300 hover:-translate-y-1.5">
                    {inner}
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={150}>
          <p className="mt-6 font-mono text-[9.5px] uppercase tracking-[0.2em] text-dim">✳ {b.videoHint}</p>
        </Reveal>
      </div>
    </section>
  );
}

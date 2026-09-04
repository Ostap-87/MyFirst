import { useEffect } from "react";
import { Link } from "react-router-dom";
import { photo, useI18n } from "../i18n";
import Header from "../components/Header";
import Contact from "../components/Contact";
import Reveal from "../components/Reveal";
import { ArrowUpRight } from "../components/Icons";

function formatDate(date: string, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(date)
    );
  } catch {
    return date;
  }
}

export default function BlogIndex() {
  const { t, lang } = useI18n();
  const b = t.blog;

  useEffect(() => {
    document.title = `${b.articlesLabel} — ${t.hero.firstName} ${t.hero.lastName}`;
    window.scrollTo(0, 0);
  }, [b.articlesLabel, t.hero.firstName, t.hero.lastName]);

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <Header />
      <main className="dotgrid relative bg-bone">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6 lg:pt-40">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-dim">
                <span className="mr-2 inline-block h-2 w-2 bg-red" /> {b.label}
              </p>
              <h1 className="mt-4 font-display text-[clamp(1.8rem,4.6vw,3.2rem)] font-bold leading-[1.05]">
                {b.lines.join(" ")}
              </h1>
            </div>

            <Reveal y={24} className="hidden lg:block">
              <figure className="relative w-[190px] rotate-2 border-2 border-ink bg-card p-3 shadow-[10px_10px_0_var(--color-yellow)] transition-transform duration-500 hover:rotate-0">
                <div className="relative aspect-[4/5] overflow-hidden border border-ink/20 bg-deep">
                  <img
                    src={photo("blog-portrait.jpg")}
                    alt={`${t.hero.firstName} ${t.hero.lastName}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </figure>
            </Reveal>
          </div>

          <div className="mt-8 max-w-2xl space-y-4">
            {b.pageIntro.split("\n\n").map((para, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-ink/70">
                {para}
              </p>
            ))}
          </div>

          {/* навигация по разделам */}
          <div className="mt-10 flex flex-wrap gap-3">
            {b.categories.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="border-2 border-ink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink transition-all hover:bg-ink hover:text-yellow"
              >
                {c.label}
              </a>
            ))}
          </div>

          <div className="mt-14 space-y-20">
            {b.categories.map((c) => {
              const items = b.articles.filter((a) => a.category === c.id);
              if (items.length === 0) return null;
              return (
                <section key={c.id} id={c.id} className="scroll-mt-28">
                  <h2 className="font-display text-[22px] font-bold leading-snug sm:text-[26px]">{c.label}</h2>
                  <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink/70">{c.desc}</p>

                  <div className="mt-6 space-y-6">
                    {items.map((a) => (
                      <Link
                        key={a.slug}
                        to={`/blog/${a.slug}`}
                        className="group flex flex-col gap-3 border-2 border-ink bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--color-yellow)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-blue">{a.tag}</span>
                            <span className="tnum font-mono text-[10px] text-dim">
                              {formatDate(a.date, lang)} · {a.time}
                            </span>
                          </div>
                          <h3 className="mt-2 font-display text-[18px] font-bold leading-snug">{a.title}</h3>
                          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink/70">{a.excerpt}</p>
                        </div>
                        <ArrowUpRight
                          size={20}
                          className="shrink-0 text-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <Contact />
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import Contact from "../components/Contact";
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
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6 lg:pt-40">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-dim">
            <span className="mr-2 inline-block h-2 w-2 bg-red" /> {b.label}
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.8rem,4.6vw,3.2rem)] font-bold leading-[1.05]">
            {b.lines.join(" ")}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink/70">{b.intro}</p>

          <div className="mt-14 space-y-6">
            {b.articles.map((a) => (
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
                  <h2 className="mt-2 font-display text-[18px] font-bold leading-snug">{a.title}</h2>
                  <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink/70">{a.excerpt}</p>
                </div>
                <ArrowUpRight
                  size={20}
                  className="shrink-0 text-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Contact />
    </div>
  );
}

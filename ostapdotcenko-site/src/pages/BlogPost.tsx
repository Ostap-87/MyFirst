import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import Contact from "../components/Contact";
import ArticleBody from "../components/ArticleBody";
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

export default function BlogPost() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const b = t.blog;
  const article = b.articles.find((a) => a.slug === slug);
  const category = b.categories.find((c) => c.id === article?.category);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} — ${t.hero.firstName} ${t.hero.lastName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", article.excerpt);
    window.scrollTo(0, 0);
  }, [article, t.hero.firstName, t.hero.lastName]);

  if (!article) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <Header />
      <main className="dotgrid relative bg-bone">
        <div className="mx-auto flex max-w-[1280px] justify-center gap-6 px-4 sm:px-6 xl:gap-8">
          <aside className="hidden w-[230px] shrink-0 xl:block">
            {article.sideImages && (
              <div className="sticky top-28 mt-40 space-y-4">
                {article.sideImages.left.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className={`pointer-events-none w-full border-2 border-ink object-cover shadow-[6px_6px_0_0_rgba(20,20,20,0.15)] ${
                      i % 2 === 0 ? "rotate-[-2deg]" : "rotate-[1.5deg]"
                    }`}
                  />
                ))}
              </div>
            )}
          </aside>

          <article className="relative w-full max-w-2xl shrink-0 px-4 pb-24 pt-32 sm:px-6 lg:pt-40">
          <Link
            to="/blog"
            className="group inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-dim transition-colors hover:text-red"
          >
            ← {b.backToBlogBtn}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {category && (
              <Link
                to={`/blog#${category.id}`}
                className="border border-ink/40 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink transition-colors hover:border-red hover:text-red"
              >
                {category.label}
              </Link>
            )}
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-blue">{article.tag}</span>
            <span className="tnum font-mono text-[10px] text-dim">
              {formatDate(article.date, lang)} · {article.time}
            </span>
          </div>

          <h1 className="mt-4 font-display text-[clamp(1.6rem,4.4vw,2.6rem)] font-bold leading-[1.1]">{article.title}</h1>
          <p className="mt-5 border-l-2 border-red pl-4 text-[15px] leading-relaxed text-ink/70">{article.excerpt}</p>

          <div className="mt-10">
            <ArticleBody text={article.body} />
          </div>

          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noreferrer"
              className="mt-10 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-blue hover:text-red"
            >
              {b.watchBtn} <ArrowUpRight size={14} />
            </a>
          )}

          <div className="mt-16 border-t-2 border-ink pt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
              {t.hero.firstName} {t.hero.lastName}
            </p>
          </div>
          </article>

          <aside className="hidden w-[230px] shrink-0 xl:block">
            {article.sideImages && (
              <div className="sticky top-28 mt-[34rem] space-y-4">
                {article.sideImages.right.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className={`pointer-events-none w-full border-2 border-ink object-cover shadow-[6px_6px_0_0_rgba(20,20,20,0.15)] ${
                      i % 2 === 0 ? "rotate-[2deg]" : "rotate-[-1.5deg]"
                    }`}
                  />
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
      <Contact />
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { LANGS, TELEGRAM_URL, useI18n } from "../i18n";
import { useScrollProgress } from "../hooks";
import { ArrowUpRight } from "./Icons";

export default function Header() {
  const { lang, setLang, t } = useI18n();
  const progress = useScrollProgress();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* прогресс чтения */}
      <div className="h-[3px] w-full bg-transparent">
        <div className="h-full bg-blue transition-[width] duration-150 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={`transition-colors duration-300 ${open ? "border-b-2 border-ink bg-bone" : "bg-bone/90 backdrop-blur-sm"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-center text-ink" onClick={() => setOpen(false)}>
            <span className="whitespace-nowrap font-display text-[13px] font-black uppercase tracking-[0.02em] sm:text-xl sm:tracking-[0.06em]">
              {t.hero.firstName} {t.hero.lastName}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Основная навигация">
            {t.nav.map((n) =>
              n.href === "#blog" ? (
                <Link
                  key={n.href}
                  to="/blog"
                  className="group relative whitespace-nowrap font-mono text-[15px] uppercase tracking-[0.16em] text-ink transition-colors hover:text-ink"
                >
                  {n.label}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-red transition-all duration-300 group-hover:w-full" />
                </Link>
              ) : (
                <a
                  key={n.href}
                  href={`/${n.href}`}
                  className="group relative whitespace-nowrap font-mono text-[15px] uppercase tracking-[0.16em] text-ink transition-colors hover:text-ink"
                >
                  {n.label}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-red transition-all duration-300 group-hover:w-full" />
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* переключатель языков */}
            <div className="flex border-2 border-ink" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                    lang === l.code ? "bg-ink text-yellow" : "bg-transparent text-ink/60 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 border-2 border-ink bg-yellow px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-all hover:bg-ink hover:text-yellow sm:flex"
            >
              {t.hero.ctaPrimary}
              <ArrowUpRight size={14} />
            </a>

            <button
              aria-label="Меню"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] border-2 border-ink lg:hidden"
            >
              <span className={`h-[2px] w-5 bg-ink transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-[2px] w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`h-[2px] w-5 bg-ink transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>

        {/* мобильное меню */}
        <div className={`overflow-hidden transition-[max-height] duration-500 ease-out lg:hidden ${open ? "max-h-[420px]" : "max-h-0"}`}>
          <nav className="border-t-2 border-ink px-6 pb-5 pt-2" aria-label="Мобильная навигация">
            {t.nav.map((n, i) =>
              n.href === "#blog" ? (
                <Link
                  key={n.href}
                  to="/blog"
                  onClick={() => setOpen(false)}
                  className="block border-b border-dashed border-ink/25 py-3.5 font-display text-base font-bold text-ink last:border-0 hover:text-blue"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.href}
                  href={`/${n.href}`}
                  onClick={() => setOpen(false)}
                  className="block border-b border-dashed border-ink/25 py-3.5 font-display text-base font-bold text-ink last:border-0 hover:text-blue"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  {n.label}
                </a>
              )
            )}
            <div className="mt-4 flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`border-2 border-ink px-4 py-2 font-mono text-[11px] font-bold uppercase ${
                    lang === l.code ? "bg-ink text-yellow" : "text-ink/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

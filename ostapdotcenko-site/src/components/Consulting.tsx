import { useEffect } from "react";
import { CAL_USERNAME, TELEGRAM_URL, useI18n } from "../i18n";
import { ArrowUpRight, Calendar, Check, Star4 } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

type CalQueue = { q: unknown[] };
type CalFn = ((...args: unknown[]) => void) & { loaded?: boolean; ns: Record<string, CalQueue>; q: unknown[] };

declare global {
  interface Window {
    Cal?: CalFn;
  }
}

/* Подключаем embed-скрипт Cal.com один раз — официальный сниппет из настроек
   аккаунта. После инициализации Cal.com сам навешивает обработчик клика на
   любые элементы с data-cal-link, поэтому кнопки ниже не требуют доп. кода. */
function useCalEmbed() {
  useEffect(() => {
    if (window.Cal) return;
    (function (C: Window, A: string, L: string) {
      const p = (a: CalQueue, ar: unknown) => a.q.push(ar);
      const d = C.document;
      const cal: CalFn = ((...ar: unknown[]) => {
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).setAttribute("src", A);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const namespace = ar[1] as string;
          const api = ((...ar2: unknown[]) => p(api, ar2)) as unknown as CalFn & CalQueue;
          api.q = [];
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ["initNamespace", namespace]);
          return;
        }
        p(cal, ar);
      }) as CalFn;
      cal.ns = {};
      cal.q = [];
      C.Cal = cal;
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal!("init", { origin: "https://cal.com" });
    window.Cal!("ui", {
      styles: { branding: { brandColor: "#2b49ff" } },
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, []);
}

/* Раздел продажи консультаций: цены и состав пакетов редактируются в src/i18n/ */
export default function Consulting() {
  const { t } = useI18n();
  const c = t.consulting;
  useCalEmbed();

  return (
    <section id="consulting" className="blueprint relative overflow-hidden bg-deep text-bone">
      <div
        aria-hidden
        className="stroke-text-light pointer-events-none absolute -right-8 top-6 select-none font-display text-[26vw] font-black leading-none opacity-60"
      >
        ₽
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <SectionHead
            dark
            index="05"
            label={c.label}
            lines={c.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
          />
          <Reveal delay={200}>
            <div className="max-w-xs">
              <p className="font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-fog">{c.intro}</p>
              <p className="mt-4 inline-block border border-dashed border-yellow/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-yellow">
                {c.formatNote}
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {c.packages.map((p, i) => {
            const featured = "featured" in p && p.featured;
            return (
              <Reveal
                key={p.name}
                delay={i * 110}
                className={`group relative flex flex-col border-2 p-7 transition-all duration-300 hover:-translate-y-2 ${
                  featured
                    ? "border-yellow bg-yellow text-ink shadow-[10px_10px_0_rgba(43,73,255,0.9)] hover:shadow-[14px_14px_0_rgba(43,73,255,0.9)]"
                    : "border-dline bg-panel/70 hover:border-fog/50 hover:shadow-[10px_10px_0_rgba(255,217,46,0.14)]"
                }`}
              >
                {"badge" in p && p.badge && (
                  <span className="absolute -top-3.5 right-6 flex items-center gap-1.5 bg-red px-3 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-bone">
                    <Star4 size={9} /> {p.badge}
                  </span>
                )}

                <p className={`font-mono text-[10px] uppercase tracking-[0.24em] ${featured ? "text-ink/60" : "text-fog"}`}>
                  /{String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-xl font-bold sm:text-2xl">{p.name}</h3>
                <p className={`mt-3 text-[13.5px] leading-relaxed ${featured ? "text-ink/75" : "text-fog"}`}>{p.desc}</p>

                <p className={`tnum mt-6 font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-black leading-none ${featured ? "text-ink" : "text-yellow"}`}>
                  {p.price}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-[13px] leading-snug ${featured ? "text-ink/80" : "text-bone/80"}`}>
                      <Check size={15} className={`mt-0.5 shrink-0 ${featured ? "text-blue" : "text-yellow"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`group/cta mt-8 flex items-center justify-center gap-2.5 py-4 font-display text-[11.5px] font-bold uppercase tracking-[0.16em] transition-all ${
                    featured
                      ? "bg-ink text-yellow hover:bg-blue hover:text-bone"
                      : "border-2 border-bone/70 text-bone hover:border-yellow hover:bg-yellow hover:text-ink"
                  }`}
                >
                  {p.cta}
                  <ArrowUpRight size={15} className="transition-transform group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
                </a>

                <button
                  type="button"
                  data-cal-link={CAL_USERNAME}
                  data-cal-config={JSON.stringify({ layout: "month_view" })}
                  className={`group/book mt-3 flex items-center justify-center gap-2.5 py-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] transition-all ${
                    featured
                      ? "border-2 border-ink/70 text-ink hover:border-blue hover:bg-blue hover:text-bone"
                      : "border-2 border-dashed border-fog/50 text-fog hover:border-yellow hover:text-yellow"
                  }`}
                >
                  <Calendar size={14} />
                  {c.bookCta}
                </button>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={200}>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-dline pt-6 sm:flex-row sm:items-center">
            <p className="flex max-w-xl items-center gap-3 text-[13.5px] leading-relaxed text-fog">
              <Star4 size={14} className="shrink-0 text-red" />
              {c.guarantee}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

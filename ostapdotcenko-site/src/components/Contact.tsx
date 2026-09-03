import { FormEvent, useState } from "react";
import { PERSON, useI18n } from "../i18n";
import { useClock } from "../hooks";
import { ArrowUpRight, Check, Clock, Mail, Phone, Pin, Send } from "./Icons";
import Reveal, { SectionHead } from "./Reveal";

type Form = { name: string; email: string; company: string; message: string };
const empty: Form = { name: "", email: "", company: "", message: "" };

function CityClock({ name, tz }: { name: string; tz: string }) {
  const time = useClock(tz);
  return (
    <div className="flex items-center justify-between border border-ink/25 bg-card px-4 py-3">
      <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-dim">
        <Clock size={15} className="text-red" />
        {name}
      </span>
      <span className="tnum font-mono text-sm text-ink">{time}</span>
    </div>
  );
}

export default function Contact() {
  const { t } = useI18n();
  const c = t.contact;
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [sentRef, setSentRef] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Partial<Form> = {};
    if (form.name.trim().length < 2) er.name = c.errName;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = c.errEmail;
    if (form.message.trim().length < 10) er.message = c.errMsg;
    setErrors(er);
    if (Object.keys(er).length === 0) {
      setSentRef(`DS-2026-${1000 + Math.floor(Math.random() * 9000)}`);
    }
  };

  const inputCls = (err?: string) =>
    `w-full border-2 bg-bone px-4 py-3.5 text-[14px] text-ink outline-none transition-colors placeholder:text-dim/70 ${
      err ? "border-red" : "border-ink/30 focus:border-blue"
    }`;

  return (
    <section id="contact" className="dotgrid relative overflow-hidden bg-bone">
      <div
        aria-hidden
        className="stroke-text pointer-events-none absolute -right-10 bottom-0 select-none font-display text-[34vw] font-black leading-none opacity-60"
      >
        OK
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHead
          index="10"
          label={c.label}
          lines={c.lines.map((l, i) => (i === 1 ? <span key={i} className="hl">{l}</span> : l))}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* левая колонка */}
          <div>
            <Reveal>
              <p className="max-w-md text-[15px] leading-relaxed text-ink/80">{c.intro}</p>
            </Reveal>

            <div className="mt-9 space-y-4">
              <Reveal delay={80}>
                <a
                  href={`mailto:${PERSON.email}`}
                  className="group flex items-center gap-4 border-2 border-ink bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:bg-yellow hover:shadow-[7px_7px_0_var(--color-ink)]"
                >
                  <Mail size={20} className="shrink-0 text-red" />
                  <span className="font-display text-lg font-bold sm:text-xl">{PERSON.email}</span>
                  <ArrowUpRight size={18} className="ml-auto opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </a>
              </Reveal>
              <Reveal delay={140}>
                <a
                  href={`tel:${PERSON.phoneHref}`}
                  className="group flex items-center gap-4 border-2 border-ink bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:bg-yellow hover:shadow-[7px_7px_0_var(--color-ink)]"
                >
                  <Phone size={20} className="shrink-0 text-blue" />
                  <span className="tnum font-display text-lg font-bold sm:text-xl">{PERSON.phone}</span>
                  <ArrowUpRight size={18} className="ml-auto opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </a>
              </Reveal>
              <Reveal delay={180}>
                <a
                  href={`tel:${PERSON.phone2Href}`}
                  className="group flex items-center gap-4 border-2 border-ink bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:bg-yellow hover:shadow-[7px_7px_0_var(--color-ink)]"
                >
                  <Phone size={20} className="shrink-0 text-red" />
                  <span className="tnum font-display text-lg font-bold sm:text-xl">{PERSON.phone2}</span>
                  <ArrowUpRight size={18} className="ml-auto opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </a>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <div className="mt-8 grid gap-3 sm:max-w-sm">
                {c.cities.map((ct) => (
                  <CityClock key={ct.tz} name={ct.name} tz={ct.tz} />
                ))}
                <p className="flex items-center gap-2.5 pt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
                  <Pin size={14} className="text-red" /> {c.hybrid}
                </p>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-9">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-dim">{c.socialsLabel}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {PERSON.socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="group flex items-center gap-2.5 border-2 border-ink px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all hover:bg-ink hover:text-yellow hover:shadow-[5px_5px_0_var(--color-yellow)]"
                    >
                      {s.label}
                      <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* форма */}
          <Reveal delay={150}>
            <div className="relative border-2 border-ink bg-card shadow-[12px_12px_0_var(--color-ink)]">
              <div className="flex items-center justify-between border-b-2 border-ink bg-yellow px-5 py-3.5">
                <span className="font-display text-[12px] font-bold uppercase tracking-[0.18em]">{c.formTitle}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest">{c.formNote}</span>
              </div>

              {sentRef ? (
                <div className="flex flex-col items-start gap-5 p-8">
                  <span className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-[#22a06b] text-bone">
                    <Check size={26} />
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold leading-tight">{c.successTitle}</p>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
                      <span className="mr-2 font-mono text-[10.5px] uppercase tracking-widest text-dim">{c.refLabel}:</span>
                      <span className="tnum border border-ink/30 bg-bone px-2 py-0.5 font-mono text-[12.5px] font-bold">{sentRef}</span>
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">{c.successText}</p>
                  </div>
                  <button
                    onClick={() => {
                      setForm(empty);
                      setSentRef(null);
                    }}
                    className="mt-2 border-2 border-ink px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.16em] transition-all hover:bg-yellow"
                  >
                    {c.again}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-5 p-6 sm:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cf-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                        {c.nameLabel}
                      </label>
                      <input id="cf-name" className={inputCls(errors.name)} placeholder={c.namePh} value={form.name} onChange={set("name")} />
                      {errors.name && <p className="mt-1.5 font-mono text-[10.5px] text-red">▲ {errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="cf-email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                        {c.emailLabel}
                      </label>
                      <input id="cf-email" type="email" className={inputCls(errors.email)} placeholder={c.emailPh} value={form.email} onChange={set("email")} />
                      {errors.email && <p className="mt-1.5 font-mono text-[10.5px] text-red">▲ {errors.email}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cf-company" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                      {c.companyLabel}
                    </label>
                    <input id="cf-company" className={inputCls()} placeholder={c.companyPh} value={form.company} onChange={set("company")} />
                  </div>
                  <div>
                    <label htmlFor="cf-msg" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                      {c.msgLabel}
                    </label>
                    <textarea
                      id="cf-msg"
                      rows={4}
                      className={`${inputCls(errors.message)} resize-none`}
                      placeholder={c.msgPh}
                      value={form.message}
                      onChange={set("message")}
                    />
                    {errors.message && <p className="mt-1.5 font-mono text-[10.5px] text-red">▲ {errors.message}</p>}
                  </div>
                  <button
                    type="submit"
                    className="group flex w-full items-center justify-center gap-3 bg-ink py-4 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-bone transition-all hover:bg-blue hover:shadow-[0_0_0_3px_var(--color-bone),0_0_0_5px_var(--color-yellow)]"
                  >
                    {c.send}
                    <Send size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
                  </button>
                  <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim">{c.noSpam}</p>
                </form>
              )}
            </div>
          </Reveal>
        </div>

        {/* футер */}
        <footer className="mt-24 border-t-2 border-ink pt-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="leading-tight text-ink">
              <p className="font-display text-[12px] font-bold">
                {t.hero.firstName} {t.hero.lastName}
              </p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-dim">design & code — handmade</p>
            </div>
            <a
              href="#top"
              className="group flex items-center gap-2.5 border-2 border-ink px-4 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] transition-all hover:bg-ink hover:text-yellow"
            >
              {c.topBtn}
              <ArrowUpRight size={14} className="-rotate-45 transition-transform group-hover:-translate-y-1" />
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}

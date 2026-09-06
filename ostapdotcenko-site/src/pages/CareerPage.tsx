import { useEffect } from "react";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import { Career, Results } from "../components/Career";
import Contact from "../components/Contact";

export default function CareerPage() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = `${t.career.label} — ${t.hero.firstName} ${t.hero.lastName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.career.intro);
    window.scrollTo(0, 0);
  }, [t.career.label, t.career.intro, t.hero.firstName, t.hero.lastName]);

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <div className="noise-overlay" aria-hidden />
      <Header />
      <main>
        <Career />
        <Results />
      </main>
      <Contact />
    </div>
  );
}

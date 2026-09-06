import { useEffect } from "react";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import Consulting from "../components/Consulting";
import Contact from "../components/Contact";

export default function ConsultingPage() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = `${t.consulting.label} — ${t.hero.firstName} ${t.hero.lastName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.consulting.intro);
    window.scrollTo(0, 0);
  }, [t.consulting.label, t.consulting.intro, t.hero.firstName, t.hero.lastName]);

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <div className="noise-overlay" aria-hidden />
      <Header />
      <main>
        <Consulting />
      </main>
      <Contact />
    </div>
  );
}

import { useEffect } from "react";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import About from "../components/About";
import Contact from "../components/Contact";

export default function AboutPage() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = `${t.about.label} — ${t.hero.firstName} ${t.hero.lastName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.about.bio[0]);
    window.scrollTo(0, 0);
  }, [t.about.label, t.about.bio, t.hero.firstName, t.hero.lastName]);

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <div className="noise-overlay" aria-hidden />
      <Header />
      <main>
        <About />
      </main>
      <Contact />
    </div>
  );
}

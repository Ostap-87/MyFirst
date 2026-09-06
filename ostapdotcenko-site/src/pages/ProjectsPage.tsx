import { useEffect } from "react";
import { useI18n } from "../i18n";
import Header from "../components/Header";
import Projects from "../components/Projects";
import Contact from "../components/Contact";

export default function ProjectsPage() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = `${t.projects.label} — ${t.hero.firstName} ${t.hero.lastName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.projects.intro);
    window.scrollTo(0, 0);
  }, [t.projects.label, t.projects.intro, t.hero.firstName, t.hero.lastName]);

  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <div className="noise-overlay" aria-hidden />
      <Header />
      <main>
        <Projects />
      </main>
      <Contact />
    </div>
  );
}

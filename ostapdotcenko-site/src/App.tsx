import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import { Career, Results } from "./components/Career";
import Projects from "./components/Projects";
import Consulting from "./components/Consulting";
import Blog from "./components/Blog";
import { Testimonials, Press } from "./components/Voices";
import Life from "./components/Life";
import Contact from "./components/Contact";
import { LangProvider } from "./i18n";
import BlogIndex from "./pages/BlogIndex";
import BlogPost from "./pages/BlogPost";
import BlogCategory from "./pages/BlogCategory";

function Home() {
  return (
    <div className="min-h-screen bg-bone font-body text-ink">
      <div className="noise-overlay" aria-hidden />
      <Header />
      <main>
        <Hero />
        <About />
        <Career />
        <Results />
        <Projects />
        <Consulting />
        <Blog />
        <Testimonials />
        <Press />
        <Life />
        <Contact />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/category/:id" element={<BlogCategory />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}

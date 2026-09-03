import { useCallback, useEffect, useRef, useState } from "react";

/* Предпочтение уменьшенной анимации */
export function usePrefersReducedMotion() {
  const [prm, setPrm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrm(mq.matches);
    const cb = (e: MediaQueryListEvent) => setPrm(e.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return prm;
}

/* Наблюдение за появлением элемента во вьюпорте (однократно) */
export function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* Плавный счётчик до значения при появлении */
export function useCountUp(target: number, duration = 1300) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [val, setVal] = useState(0);
  const prm = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (prm) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, prm]);

  return { ref, val };
}

/* Эффект «расшифровки» текста */
const GLYPHS = "▓▒░#/\\<>+=*%&@$ΞΔЖ";
export function useScramble(text: string, speed = 34, startDelay = 150) {
  const [out, setOut] = useState(text);
  const prm = usePrefersReducedMotion();

  useEffect(() => {
    if (prm) {
      setOut(text);
      return;
    }
    let frame = 0;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        frame += 1;
        const fixed = Math.floor(frame / 2.2);
        const next = text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < fixed) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");
        setOut(next);
        if (fixed >= text.length) window.clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [text, speed, startDelay, prm]);

  return out;
}

/* Эффект «расшифровки» текста, запускается при появлении блока во вьюпорте */
export function useScrambleReveal<T extends HTMLElement>(
  text: string,
  opts?: { duration?: number; startDelay?: number; threshold?: number }
) {
  const { duration = 900, startDelay = 0, threshold = 0.35 } = opts ?? {};
  const ref = useRef<T | null>(null);
  const [out, setOut] = useState(text);
  const prm = usePrefersReducedMotion();

  useEffect(() => {
    setOut(text);
    const el = ref.current;
    if (!el || prm || !("IntersectionObserver" in window)) return;

    let raf = 0;
    let timeout = 0;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        timeout = window.setTimeout(() => {
          const chars = text.split("");
          const start = performance.now();
          const step = (now: number) => {
            const ratio = Math.min(1, (now - start) / duration);
            const fixed = Math.floor(ratio * chars.length);
            setOut(
              chars
                .map((ch, i) => {
                  if (ch === " " || ch === "\n") return ch;
                  if (i < fixed) return ch;
                  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                })
                .join("")
            );
            if (ratio < 1) raf = window.requestAnimationFrame(step);
          };
          raf = window.requestAnimationFrame(step);
        }, startDelay);
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(raf);
    };
  }, [text, duration, startDelay, threshold, prm]);

  return { ref, out };
}

/* Живые часы для часового пояса */
export function useClock(timeZone: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone });
}

/* Прогресс скролла страницы 0..1 */
export function useScrollProgress() {
  const [p, setP] = useState(0);
  const onScroll = useCallback(() => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    setP(h > 0 ? Math.min(1, window.scrollY / h) : 0);
  }, []);
  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);
  return p;
}

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { ru } from "./ru";
import { en } from "./en";
import { zh } from "./zh";
import { Content, LANGS, Lang } from "./types";

export { LANGS };
export type { Content, Lang };

/* ════════════════════════════════════════════════════════════════════
   ФОТО ЧЕРЕЗ GITHUB.
   Все изображения лежат в папке public/img репозитория этого сайта.
   Поток для агента:
     1. загрузить файл в public/img/ (commit в GitHub);
     2. прописать имя файла в src/i18n/ru.ts (и en/zh) — поле img;
     3. при деплое на GitHub Pages фото подхватится автоматически.
   Альтернатива: указать RAW-базу репозитория ниже — тогда фото будут
   грузиться напрямую из GitHub, даже без деплоя.
   ════════════════════════════════════════════════════════════════════ */
const GITHUB_RAW_BASE = ""; // ← пример: "https://raw.githubusercontent.com/USER/REPO/main/public/img/"

const FALLBACKS: Record<string, string> = {
  "shanghai.jpg": "https://image.qwenlm.ai/generated-images/47f52382-0fed-4e3b-8930-936bc7d9ed5c/_result.png",
  "bali.jpg": "https://image.qwenlm.ai/generated-images/3cc6e507-5270-4a0e-a1e0-cae8d34aae60/_result.png",
  "tashkent.jpg": "https://image.qwenlm.ai/generated-images/950746f8-5c6f-4868-9c93-e8b56a416b2f/_result.png",
  "stage.jpg": "https://image.qwenlm.ai/generated-images/7c2c8f0e-a5b8-4ede-9857-14dc2d67feee/_result.png",
  "yangon.jpg": "",
};

export function photo(name: string): string {
  if (GITHUB_RAW_BASE) return GITHUB_RAW_BASE + name;
  return FALLBACKS[name] ?? `/img/${name}`;
}

/* Не переводится: контакты и соцсети (едины для всех языков) */
export const PERSON = {
  email: "norbanking@gmail.com",
  phone: "+7 985 874-49-58",
  phoneHref: "+79858744958",
  socials: [
    { label: "Telegram", href: "https://t.me/ostapdotcenko" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "WhatsApp", href: "https://wa.me/79858744958" },
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "WeChat", href: "#contact" },
  ],
};

/* Бегущая строка компаний — реальные места работы (едины для всех языков) */
export const COMPANIES = [
  "Мегамаркет / Сбер",
  "Alibaba Group",
  "AliExpress",
  "Data Centric Alliance",
  "O.F.D Agency",
  "CityAds Media",
];

const CONTENT: Record<Lang, Content> = { ru, en, zh };

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Content;
}

const LangContext = createContext<Ctx>({ lang: "ru", setLang: () => {}, t: ru });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("lang");
      return saved === "en" || saved === "zh" || saved === "ru" ? saved : "ru";
    } catch {
      return "ru";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {
      /* приватный режим — не критично */
    }
    const meta = LANGS.find((l) => l.code === lang);
    document.documentElement.lang = meta?.htmlLang ?? lang;
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t: CONTENT[lang] }}>{children}</LangContext.Provider>;
}

export function useI18n() {
  return useContext(LangContext);
}

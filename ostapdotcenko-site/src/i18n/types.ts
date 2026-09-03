import { ru } from "./ru";

/* Форма контента задаётся русским файлом — EN и ZH обязаны ей соответствовать */
export type Content = typeof ru;
export type Lang = "ru" | "en" | "zh";

export const LANGS: { code: Lang; label: string; htmlLang: string }[] = [
  { code: "ru", label: "RU", htmlLang: "ru" },
  { code: "en", label: "EN", htmlLang: "en" },
  { code: "zh", label: "中文", htmlLang: "zh-CN" },
];

import { useSyncExternalStore } from "react";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import type { Bilingual } from "./levels/types";

export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export type MessageKey = keyof typeof en;
const catalogs: Record<Locale, Record<MessageKey, string>> = { en, fr };
const valid = (value: string | null): value is Locale =>
  locales.includes(value as Locale);

function initialLocale(): Locale {
  const linked = new URLSearchParams(location.search).get("lang");
  if (valid(linked)) return linked;
  try {
    const saved = localStorage.getItem("atlas-language");
    if (valid(saved)) return saved;
  } catch {
    /* Storage may be unavailable in a private browser. */
  }
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

let locale = initialLocale();
const listeners = new Set<() => void>();
export const getLocale = () => locale;

export function t(
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return catalogs[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

/** Select the active language of a structured scientific record. */
export const tr = (text: Bilingual) => text[locale];

function syncDocument() {
  document.documentElement.lang = locale;
  document.title = t("Atlas — From quarks to the cosmos");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      t("Zoom through every power of ten, from quarks to the observable Universe, in playful 3D."),
    );
}

export function setLocale(next: Locale) {
  if (next === locale) return;
  locale = next;
  try {
    localStorage.setItem("atlas-language", locale);
  } catch {
    /* Optional persistence. */
  }
  const url = new URL(location.href);
  url.searchParams.set("lang", locale);
  history.replaceState(history.state, "", url);
  syncDocument();
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLocale = () => useSyncExternalStore(subscribe, getLocale);
syncDocument();

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { formatters } from "@/lib/format";
import { localePath, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { plural, t, type Plural } from "./translate";

function make(lang: Locale, dict: Dictionary) {
  return {
    lang,
    dict,
    t,
    plural: (forms: Plural, n: number, vars?: Record<string, string | number>) => plural(lang, forms, n, vars),
    href: (path: string) => localePath(lang, path),
    fmt: formatters(lang),
  };
}

type I18n = ReturnType<typeof make>;
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ lang, dict, children }: { lang: Locale; dict: Dictionary; children: ReactNode }) {
  const value = useMemo(() => make(lang, dict), [lang, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}

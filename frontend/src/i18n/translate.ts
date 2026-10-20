import { intlLocale, type Locale } from "./config";

export type Plural = { zero?: string; one: string; two?: string; few?: string; many?: string; other: string };

/** Fill {placeholders} in a dictionary string. */
export function t(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

const rules = new Map<Locale, Intl.PluralRules>();

/** Pick the plural form for n (Arabic has six) and fill {n} plus any extra vars. */
export function plural(lang: Locale, forms: Plural, n: number, vars: Record<string, string | number> = {}) {
  if (!rules.has(lang)) rules.set(lang, new Intl.PluralRules(lang));
  const category = rules.get(lang)!.select(n) as keyof Plural;
  const form = (n === 0 && forms.zero) || forms[category] || forms.other;
  return t(form, { n: new Intl.NumberFormat(intlLocale(lang)).format(n), ...vars });
}

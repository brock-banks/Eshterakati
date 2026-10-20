import { intlLocale, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { t } from "@/i18n/translate";
import type { Deal, DealOption, LineSnapshot } from "./types";

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "SDG";
const HOUR = 36e5;

function build(lang: Locale) {
  const locale = intlLocale(lang);
  // Whole pounds (piastres aren't used in practice), Western digits in both languages.
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { notation: "compact" });
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" });
  const or = new Intl.ListFormat(lang, { type: "disjunction" });
  return {
    money: (minor: number) => money.format(minor / 100),
    compact: (n: number) => compact.format(n),
    number: (n: number) => number.format(n),
    shortDate: (iso: string) => date.format(new Date(iso)),
    clockTime: (iso: string) => time.format(new Date(iso)),
    today: (ms: number) => today.format(new Date(ms)),
    or: (items: string[]) => or.format(items),
  };
}

const cache = new Map<Locale, ReturnType<typeof build>>();

/** Locale-aware formatters, built once per language. */
export function formatters(lang: Locale) {
  if (!cache.has(lang)) cache.set(lang, build(lang));
  return cache.get(lang)!;
}

/** "Ends in 5h 12m" for an offer deadline. */
export function timeLeft(endsAt: string, now: number, d: Dictionary) {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return d.common.ended;
  const h = Math.floor(diff / HOUR);
  const m = Math.floor((diff % HOUR) / 60e3);
  return h >= 24 ? t(d.common.endsInDays, { d: Math.floor(h / 24), h: h % 24 }) : t(d.common.endsInHours, { h, m });
}

/** "2h 14m left" for a payment deadline. */
export function remaining(iso: string, now: number, d: Dictionary) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return d.order.timesUp;
  const minutes = Math.ceil(diff / 60e3);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return t(d.order.leftMinutes, { m });
  return m ? t(d.order.leftHours, { h, m }) : t(d.order.leftWholeHours, { h });
}

export const cheapest = (d: Deal) => d.options.reduce((a, b) => (b.priceMinor < a.priceMinor ? b : a));

/** Highest discount across a deal's options, or null when nothing is on sale. */
export function bestPercent(d: Deal) {
  const on = d.options.map((o) => o.discountPercent).filter((p): p is number => p !== null);
  return on.length ? Math.max(...on) : null;
}

export const snapshot = (d: Deal, o: DealOption): LineSnapshot => ({
  optionId: o.id,
  dealSlug: d.slug,
  merchant: d.merchant,
  title: d.title,
  hue: d.hue,
  label: o.label,
  priceMinor: o.priceMinor,
  compareAtMinor: o.compareAtMinor,
});

export const maskCode = (code: string) => code.replace(/[A-Z0-9]/g, "•");

export type Sort = "popular" | "savings" | "ending";
export function sortDeals(list: Deal[], sort: Sort) {
  const l = [...list];
  if (sort === "savings") return l.sort((a, b) => (bestPercent(b) ?? -1) - (bestPercent(a) ?? -1));
  if (sort === "ending") return l.sort((a, b) => (a.endsAt ?? "~").localeCompare(b.endsAt ?? "~"));
  return l.sort((a, b) => b.soldCount - a.soldCount);
}

/**
 * Fold the spellings people mix when typing Arabic (أ/إ/آ → ا, ة → ه, ى → ي, no diacritics or
 * tatweel), so "الالعاب" finds "الألعاب".
 */
export function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function searchDeals(deals: Deal[], categoryNames: Record<string, string>, q: string) {
  const terms = normalizeSearch(q).split(/\s+/).filter(Boolean);
  return deals.filter((d) => {
    const hay = normalizeSearch(`${d.merchant} ${d.title} ${d.blurb} ${categoryNames[d.category] ?? ""}`);
    return terms.every((term) => hay.includes(term));
  });
}

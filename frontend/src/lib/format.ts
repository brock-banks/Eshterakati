import type { Deal, DealOption, LineSnapshot } from "./types";

export const LOCALE = "en-US";
const HOUR = 36e5;
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "SDG";

// Whole pounds: piastres aren't used in practice.
const moneyFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0, minimumFractionDigits: 0 });
export const money = (minor: number) => moneyFmt.format(minor / 100);

const compactFmt = new Intl.NumberFormat(LOCALE, { notation: "compact" });
export const compact = (n: number) => compactFmt.format(n);

const dateFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric" });
export const shortDate = (iso: string) => dateFmt.format(new Date(iso));

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });
export const clockTime = (iso: string) => timeFmt.format(new Date(iso));

/** "2h 14m left" style countdown for a deadline. */
export function remaining(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "Time’s up";
  const minutes = Math.ceil(diff / 60e3);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min left`;
  return m ? `${h}h ${m}m left` : `${h}h left`;
}

export function timeLeft(endsAt: string, now: number) {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / HOUR);
  const m = Math.floor((diff % HOUR) / 60e3);
  return h >= 24 ? `Ends in ${Math.floor(h / 24)}d ${h % 24}h` : `Ends in ${h}h ${m}m`;
}

export const cheapest = (d: Deal) => d.options.reduce((a, b) => (b.priceMinor < a.priceMinor ? b : a));
/** Highest discount across a deal's options, or null when nothing is on sale. */
export function bestPercent(d: Deal) {
  const on = d.options.map((o) => o.discountPercent).filter((p): p is number => p !== null);
  return on.length ? Math.max(...on) : null;
}
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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

export function searchDeals(deals: Deal[], categoryNames: Record<string, string>, q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return deals.filter((d) => {
    const hay = `${d.merchant} ${d.title} ${d.blurb} ${categoryNames[d.category] ?? ""}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

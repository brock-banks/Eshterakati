import type { Deal, DealOption, LineSnapshot } from "./types";

export const LOCALE = "en-US";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
export const money = (cents: number) => moneyFmt.format(cents / 100);

const compactFmt = new Intl.NumberFormat(LOCALE, { notation: "compact" });
export const compact = (n: number) => compactFmt.format(n);

const dateFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric" });
export const shortDate = (iso: string) => dateFmt.format(new Date(iso));

const HOUR = 36e5;
export function timeLeft(endsAt: string, now: number) {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / HOUR);
  const m = Math.floor((diff % HOUR) / 60e3);
  return h >= 24 ? `Ends in ${Math.floor(h / 24)}d ${h % 24}h` : `Ends in ${h}h ${m}m`;
}

export const cheapest = (d: Deal) => d.options.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
export const bestPercent = (d: Deal) => Math.max(...d.options.map((o) => o.discountPercent));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const snapshot = (d: Deal, o: DealOption): LineSnapshot => ({
  optionId: o.id,
  dealSlug: d.slug,
  merchant: d.merchant,
  title: d.title,
  hue: d.hue,
  label: o.label,
  priceCents: o.priceCents,
  faceValueCents: o.faceValueCents,
});

export const maskCode = (code: string) => code.replace(/[A-Z0-9]/g, "•");

export type Sort = "popular" | "savings" | "ending";
export function sortDeals(list: Deal[], sort: Sort) {
  const l = [...list];
  if (sort === "savings") return l.sort((a, b) => bestPercent(b) - bestPercent(a));
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

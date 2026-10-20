import { cacheLife } from "next/cache";
import type { Locale } from "@/i18n/config";
import { fixtureCatalog } from "./fixtures";
import type { Category, Deal, DealOption, PaymentMethod } from "./types";

/**
 * Server-side catalogue access. Reads from the Laravel API when API_URL is set
 * (e.g. http://localhost:8000/api/v1); otherwise serves the offline fixtures.
 */
export const API_URL = process.env.API_URL?.replace(/\/$/, "");

type ApiCategory = { slug: string; name: string; icon: string; hue: number; blurb: string; deals_count?: number };
type ApiOption = { id: number; label: string; price_minor: number; compare_at_minor: number | null; discount_percent: number | null; in_stock?: boolean };
type ApiDeal = {
  slug: string; category: string; merchant: string; title: string; blurb: string; hue: number; region: string;
  rating: number; reviews_count: number; sold_count: number; is_featured: boolean; ends_at: string | null; options: ApiOption[];
};

const toOption = (o: ApiOption): DealOption => ({
  id: o.id,
  label: o.label,
  priceMinor: o.price_minor,
  compareAtMinor: o.compare_at_minor,
  discountPercent: o.discount_percent,
  inStock: o.in_stock,
});

const toDeal = (d: ApiDeal): Deal => ({
  slug: d.slug,
  category: d.category,
  merchant: d.merchant,
  title: d.title,
  blurb: d.blurb,
  hue: d.hue,
  region: d.region,
  rating: d.rating,
  reviewsCount: d.reviews_count,
  soldCount: d.sold_count,
  isFeatured: d.is_featured,
  endsAt: d.ends_at,
  options: d.options.map(toOption),
});

async function request<T>(path: string, lang: Locale): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json", "Accept-Language": lang } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Catalogue request ${path} failed with ${res.status}`);
  return ((await res.json()) as { data: T }).data;
}

export async function getCategories(lang: Locale): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  if (!API_URL) return fixtureCatalog(Date.now(), lang).categories;
  const rows = (await request<ApiCategory[]>("/categories", lang)) ?? [];
  return rows.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, hue: c.hue, blurb: c.blurb, dealsCount: c.deals_count ?? 0 }));
}

/** Whole listed catalogue, most popular first. Small enough to filter and sort in the UI for now. */
export async function getDeals(lang: Locale): Promise<Deal[]> {
  "use cache";
  cacheLife("minutes");
  if (!API_URL) return fixtureCatalog(Date.now(), lang).deals;
  return ((await request<ApiDeal[]>("/deals", lang)) ?? []).map(toDeal);
}

export async function getDeal(slug: string, lang: Locale): Promise<Deal | null> {
  "use cache";
  cacheLife("minutes");
  if (!API_URL) return fixtureCatalog(Date.now(), lang).deals.find((d) => d.slug === slug) ?? null;
  const deal = await request<ApiDeal>(`/deals/${encodeURIComponent(slug)}`, lang);
  return deal && toDeal(deal);
}

/** Accounts customers can transfer to. Empty without the API: checkout needs the backend. */
export async function getPaymentMethods(lang: Locale): Promise<PaymentMethod[]> {
  "use cache";
  cacheLife("minutes");
  if (!API_URL) return [];
  return (await request<PaymentMethod[]>("/payment-methods", lang)) ?? [];
}

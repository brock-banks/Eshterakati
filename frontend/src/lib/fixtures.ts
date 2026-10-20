import type { Category, Deal } from "./types";

/**
 * Offline catalogue used when API_URL is not set, so the UI can run without
 * the Laravel backend. Mirrors backend/database/seeders/CatalogSeeder.php —
 * keep the two in sync. Merchants are fictional placeholders.
 */

const CATEGORIES: Omit<Category, "dealsCount">[] = [
  { slug: "streaming", name: "Streaming", icon: "tv", hue: 262, blurb: "TV, film and music subscriptions." },
  { slug: "gaming", name: "Gaming", icon: "gamepad", hue: 217, blurb: "Store credit, season passes and in‑game currency." },
  { slug: "food", name: "Food & Delivery", icon: "utensils", hue: 22, blurb: "Restaurants, groceries and delivery credit." },
  { slug: "shopping", name: "Shopping", icon: "tag", hue: 330, blurb: "Fashion, electronics and home." },
  { slug: "travel", name: "Travel", icon: "plane", hue: 192, blurb: "Flights, stays and rides." },
  { slug: "software", name: "Apps & Software", icon: "layers", hue: 150, blurb: "Productivity, security and cloud storage." },
];

type Row = [
  slug: string, category: string, merchant: string, title: string, blurb: string, hue: number, region: string,
  rating: number, reviews: number, sold: number, featured: boolean, endsInHours: number | null,
  options: [label: string, faceValueCents: number, priceCents: number][],
];

const DEALS: Row[] = [
  ["lumen-premium", "streaming", "Lumen TV", "Premium plan", "Ad‑free 4K streaming on up to four screens, with downloads.", 262, "Worldwide", 4.8, 2140, 12400, true, 30,
    [["1 month", 1599, 1299], ["3 months", 4797, 3699], ["12 months", 19188, 13900]]],
  ["tempo-family", "streaming", "Tempo Music", "Family plan", "Six accounts, offline listening and lossless audio.", 335, "Worldwide", 4.7, 860, 5200, false, null,
    [["3 months", 5097, 4199], ["6 months", 10194, 7999]]],
  ["pixelforge-credit", "gaming", "PixelForge", "Store credit", "Spend on games, DLC and add‑ons in the PixelForge store.", 217, "Worldwide", 4.9, 5310, 31000, false, 5,
    [["$25", 2500, 2150], ["$50", 5000, 4200], ["$100", 10000, 8200]]],
  ["questline-pass", "gaming", "Questline", "Season Pass", "Unlock the full season: 100 tiers of rewards and two new maps.", 284, "Worldwide", 4.6, 1200, 8800, false, 52,
    [["Season 12", 2999, 2249]]],
  ["nomad-eats", "food", "Nomad Eats", "Delivery credit", "Order from thousands of restaurants. Credit never expires.", 18, "Worldwide", 4.5, 3020, 14000, false, 9,
    [["$20", 2000, 1700], ["$40", 4000, 3300]]],
  ["fresh-basket", "food", "Fresh Basket", "Grocery voucher", "Fresh produce and pantry staples delivered same‑day.", 112, "GCC only", 4.6, 940, 4100, false, null,
    [["$30", 3000, 2640], ["$60", 6000, 5100]]],
  ["atelier-gift", "shopping", "Atelier", "Gift card", "Fashion, beauty and home from 400+ designers.", 350, "Worldwide", 4.7, 1500, 6900, false, null,
    [["$50", 5000, 4400], ["$100", 10000, 8600], ["$200", 20000, 16800]]],
  ["circuit-voucher", "shopping", "Circuit", "Electronics voucher", "Phones, laptops and accessories — online or in store.", 200, "Worldwide", 4.4, 410, 1900, false, 70,
    [["$100", 10000, 9000], ["$250", 25000, 22250]]],
  ["dune-air", "travel", "Dune Air", "Flight voucher", "Use toward any fare on 120 routes. Taxes included.", 32, "GCC & Europe", 4.5, 280, 1300, false, 20,
    [["$150", 15000, 12900], ["$300", 30000, 25200]]],
  ["oasis-stays", "travel", "Oasis Stays", "Hotel credit", "Book boutique hotels and resorts in 60 countries.", 172, "Worldwide", 4.6, 610, 2700, false, null,
    [["$100", 10000, 8500]]],
  ["noteworthy-pro", "software", "Noteworthy", "Pro · 1 year", "Unlimited notes, sync across devices and AI search.", 44, "Worldwide", 4.8, 990, 7600, false, 4,
    [["1 year", 5999, 3999]]],
  ["vaultline-vpn", "software", "Vaultline VPN", "VPN subscription", "Private browsing on unlimited devices. No‑logs policy.", 150, "Worldwide", 4.7, 2200, 9900, false, null,
    [["1 year", 7188, 4799], ["2 years", 14376, 7999]]],
];

export function fixtureCatalog(now: number): { categories: Category[]; deals: Deal[] } {
  let optionId = 0;
  const deals: Deal[] = DEALS.map(([slug, category, merchant, title, blurb, hue, region, rating, reviewsCount, soldCount, isFeatured, endsIn, options]) => ({
    slug, category, merchant, title, blurb, hue, region, rating, reviewsCount, soldCount, isFeatured,
    endsAt: endsIn ? new Date(now + endsIn * 36e5).toISOString() : null,
    options: options.map(([label, faceValueCents, priceCents]) => ({
      id: ++optionId,
      label,
      faceValueCents,
      priceCents,
      discountPercent: Math.round((1 - priceCents / faceValueCents) * 100),
      inStock: true,
    })),
  }));
  const categories = CATEGORIES.map((c) => ({ ...c, dealsCount: deals.filter((d) => d.category === c.slug).length }));
  return { categories, deals: deals.sort((a, b) => b.soldCount - a.soldCount) };
}

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
  options: [label: string, usd: number, onSale: boolean][],
];

const DEALS: Row[] = [
  ["lumen-premium", "streaming", "Lumen TV", "Premium plan", "Ad‑free 4K streaming on up to four screens, with downloads.", 262, "Worldwide", 4.8, 2140, 12400, true, 30,
    [["1 month", 15.99, false], ["3 months", 47.97, false], ["12 months", 191.88, true]]],
  ["tempo-family", "streaming", "Tempo Music", "Family plan", "Six accounts, offline listening and lossless audio.", 335, "Worldwide", 4.7, 860, 5200, false, null,
    [["3 months", 50.97, false], ["6 months", 101.94, false]]],
  ["pixelforge-credit", "gaming", "PixelForge", "Store credit", "Spend on games, DLC and add‑ons in the PixelForge store.", 217, "Worldwide", 4.9, 5310, 31000, false, 5,
    [["$25", 25, false], ["$50", 50, false], ["$100", 100, true]]],
  ["questline-pass", "gaming", "Questline", "Season Pass", "Unlock the full season: 100 tiers of rewards and two new maps.", 284, "Worldwide", 4.6, 1200, 8800, false, 52,
    [["Season 12", 29.99, true]]],
  ["nomad-eats", "food", "Nomad Eats", "Delivery credit", "Order from thousands of restaurants. Credit never expires.", 18, "Worldwide", 4.5, 3020, 14000, false, 9,
    [["$20", 20, false], ["$40", 40, false]]],
  ["fresh-basket", "food", "Fresh Basket", "Grocery voucher", "Fresh produce and pantry staples delivered same‑day.", 112, "GCC only", 4.6, 940, 4100, false, null,
    [["$30", 30, false], ["$60", 60, false]]],
  ["atelier-gift", "shopping", "Atelier", "Gift card", "Fashion, beauty and home from 400+ designers.", 350, "Worldwide", 4.7, 1500, 6900, false, null,
    [["$50", 50, false], ["$100", 100, false], ["$200", 200, false]]],
  ["circuit-voucher", "shopping", "Circuit", "Electronics voucher", "Phones, laptops and accessories — online or in store.", 200, "Worldwide", 4.4, 410, 1900, false, 70,
    [["$100", 100, false], ["$250", 250, true]]],
  ["dune-air", "travel", "Dune Air", "Flight voucher", "Use toward any fare on 120 routes. Taxes included.", 32, "GCC & Europe", 4.5, 280, 1300, false, 20,
    [["$150", 150, false], ["$300", 300, false]]],
  ["oasis-stays", "travel", "Oasis Stays", "Hotel credit", "Book boutique hotels and resorts in 60 countries.", 172, "Worldwide", 4.6, 610, 2700, false, null,
    [["$100", 100, false]]],
  ["noteworthy-pro", "software", "Noteworthy", "Pro · 1 year", "Unlimited notes, sync across devices and AI search.", 44, "Worldwide", 4.8, 990, 7600, false, 4,
    [["1 year", 59.99, true]]],
  ["vaultline-vpn", "software", "Vaultline VPN", "VPN subscription", "Private browsing on unlimited devices. No‑logs policy.", 150, "Worldwide", 4.7, 2200, 9900, false, null,
    [["1 year", 71.88, false], ["2 years", 143.76, true]]],
];

// Same demo pricing as the seeder: placeholder rate + 8%, rounded to 500 SDG.
const DEMO_SDG_PER_USD = 3000;
const roundSdg = (pounds: number) => Math.round(pounds / 500) * 500;
const demoPrice = (usd: number) => roundSdg(usd * DEMO_SDG_PER_USD * 1.08) * 100;

export function fixtureCatalog(now: number): { categories: Category[]; deals: Deal[] } {
  let optionId = 0;
  const deals: Deal[] = DEALS.map(([slug, category, merchant, title, blurb, hue, region, rating, reviewsCount, soldCount, isFeatured, endsIn, options]) => ({
    slug, category, merchant, title, blurb, hue, region, rating, reviewsCount, soldCount, isFeatured,
    endsAt: endsIn ? new Date(now + endsIn * 36e5).toISOString() : null,
    options: options.map(([label, usd, onSale]) => {
      const priceMinor = demoPrice(usd);
      const compareAtMinor = onSale ? roundSdg((priceMinor / 100) * 1.15) * 100 : null;
      return {
        id: ++optionId,
        label,
        priceMinor,
        compareAtMinor,
        discountPercent: compareAtMinor ? Math.round((1 - priceMinor / compareAtMinor) * 100) : null,
        inStock: true,
      };
    }),
  }));
  const categories = CATEGORIES.map((c) => ({ ...c, dealsCount: deals.filter((d) => d.category === c.slug).length }));
  return { categories, deals: deals.sort((a, b) => b.soldCount - a.soldCount) };
}

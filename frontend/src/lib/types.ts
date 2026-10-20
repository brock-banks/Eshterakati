export type Category = {
  slug: string;
  name: string;
  icon: string;
  hue: number;
  blurb: string;
  dealsCount: number;
};

export type DealOption = {
  id: number;
  label: string;
  faceValueCents: number;
  priceCents: number;
  discountPercent: number;
  /** Only present on the deal detail response. */
  inStock?: boolean;
};

export type Deal = {
  slug: string;
  category: string;
  merchant: string;
  title: string;
  blurb: string;
  hue: number;
  region: string;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  isFeatured: boolean;
  endsAt: string | null;
  options: DealOption[];
};

/** What the client keeps about a purchasable option, so the bag and wallet don't need the catalogue. */
export type LineSnapshot = {
  optionId: number;
  dealSlug: string;
  merchant: string;
  title: string;
  hue: number;
  label: string;
  priceCents: number;
  faceValueCents: number;
};

export type BagLine = LineSnapshot & { qty: number };

export type OwnedCode = LineSnapshot & {
  id: string;
  code: string;
  purchasedAt: string;
  expiresAt: string | null;
  status: "active" | "used";
};

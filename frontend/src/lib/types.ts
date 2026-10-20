export type Category = {
  slug: string;
  name: string;
  icon: string;
  hue: number;
  blurb: string;
  dealsCount: number;
};

/** Prices are in minor units of the store currency (SDG: 1 pound = 100 piastres). */
export type DealOption = {
  id: number;
  /** The card's own denomination, e.g. "$25". */
  label: string;
  priceMinor: number;
  /** Set only when the option is on sale. */
  compareAtMinor: number | null;
  discountPercent: number | null;
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

export type PaymentMethod = { key: string; name: string; provider: string };

/** What the client keeps about a purchasable option, so the bag doesn't need the catalogue. */
export type LineSnapshot = {
  optionId: number;
  dealSlug: string;
  merchant: string;
  title: string;
  hue: number;
  label: string;
  priceMinor: number;
  compareAtMinor: number | null;
};

export type BagLine = LineSnapshot & { qty: number };

export type OrderStatus = "awaiting_payment" | "in_review" | "paid" | "expired" | "cancelled";

export type ReportReason = "invalid" | "already_used" | "wrong_region" | "other";

/** A "this code doesn't work" report and its outcome. */
export type CodeReport = {
  status: "open" | "replaced" | "refunded" | "declined";
  reason: ReportReason;
  preference: "replacement" | "refund";
  createdAt: string;
  resolvedAt: string | null;
  /** Shown to the customer: decline reason and/or the admin's note, already translated. */
  message: string | null;
  replacementCodeId: number | null;
  refundAmountMinor: number | null;
  refundReference: string | null;
  responseTime: string;
};

export type OrderCode = {
  id: number;
  code: string;
  expiresAt: string | null;
  /** "disputed" once a report was resolved with a replacement or refund. */
  status: "sold" | "disputed";
  reportableUntil: string | null;
  report: CodeReport | null;
};

export type OrderItem = {
  quantity: number;
  unitPriceMinor: number;
  optionId: number;
  label: string;
  dealSlug: string;
  merchant: string;
  title: string;
  hue: number;
  codes: OrderCode[];
};

export type Order = {
  id: string;
  reference: string;
  status: OrderStatus;
  currency: string;
  totalMinor: number;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  reviewTime: string;
  receiptSubmittedAt: string | null;
  payment: { method: string; name: string; provider: string | null; accountName: string | null; accountNumber: string | null };
  items: OrderItem[];
};

/** A guest's handle on an order: the token proves it's theirs. */
export type OrderRef = {
  id: string;
  token: string;
  reference: string;
  totalMinor: number;
  createdAt: string;
  status: OrderStatus;
};

export type OwnedCode = {
  id: string;
  code: string;
  orderId: string;
  purchasedAt: string;
  expiresAt: string | null;
  status: "active" | "used";
  /** Retired after a replacement or refund. Older saved codes lack these fields. */
  disputed?: boolean;
  reportableUntil?: string | null;
  report?: CodeReport | null;
  dealSlug: string;
  merchant: string;
  title: string;
  hue: number;
  label: string;
  priceMinor: number;
};

import Link from "next/link";
import { bestPercent, cheapest, money } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { EndsBadge } from "./EndsBadge";
import { MerchantTile } from "./MerchantTile";

export function DealCard({ deal }: { deal: Deal }) {
  const o = cheapest(deal);
  const several = deal.options.length > 1;
  return (
    <Link className="deal-card" href={`/deals/${deal.slug}`}>
      <MerchantTile merchant={deal.merchant} hue={deal.hue} />
      <span className="deal-card-body">
        <span className="deal-merchant">{deal.merchant}</span>
        <span className="deal-title">{deal.title}</span>
        <span className="price-row">
          <span className="price">
            {several && <span className="from">From </span>}
            {money(o.priceCents)}
          </span>
          <s className="was">
            <span className="visually-hidden">Face value </span>
            {money(o.faceValueCents)}
          </s>
        </span>
        <span className="meta-row">
          <span className="badge badge-save">
            Save {several && "up to "}
            {bestPercent(deal)}%
          </span>
          {deal.endsAt && <EndsBadge endsAt={deal.endsAt} />}
        </span>
      </span>
    </Link>
  );
}

export function DealGrid({ deals }: { deals: Deal[] }) {
  return (
    <div className="deal-grid">
      {deals.map((d) => (
        <DealCard key={d.slug} deal={d} />
      ))}
    </div>
  );
}

export function DealGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="deal-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ minHeight: 140, borderRadius: "var(--r-lg)" }} />
      ))}
    </div>
  );
}

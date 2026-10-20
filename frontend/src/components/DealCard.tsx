"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { bestPercent, cheapest } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { EndsBadge } from "./EndsBadge";
import { MerchantTile } from "./MerchantTile";

export function DealCard({ deal }: { deal: Deal }) {
  const { dict: d, t, fmt, href } = useI18n();
  const o = cheapest(deal);
  const several = deal.options.length > 1;
  const pct = bestPercent(deal);
  return (
    <Link className="deal-card" href={href(`/deals/${deal.slug}`)}>
      <MerchantTile merchant={deal.merchant} hue={deal.hue} />
      <span className="deal-card-body">
        <span className="deal-merchant">{deal.merchant}</span>
        <span className="deal-title">{deal.title}</span>
        <span className="price-row">
          <span className="price">
            {several && <span className="from">{d.common.from} </span>}
            {fmt.money(o.priceMinor)}
          </span>
          {o.compareAtMinor && (
            <s className="was">
              <span className="visually-hidden">{d.common.was} </span>
              {fmt.money(o.compareAtMinor)}
            </s>
          )}
        </span>
        {(pct !== null || deal.endsAt) && (
          <span className="meta-row">
            {pct !== null && <span className="badge badge-save">{t(several ? d.common.saleUpTo : d.common.sale, { pct })}</span>}
            {deal.endsAt && <EndsBadge endsAt={deal.endsAt} />}
          </span>
        )}
      </span>
    </Link>
  );
}

export function DealGrid({ deals }: { deals: Deal[] }) {
  return (
    <div className="deal-grid">
      {deals.map((deal) => (
        <DealCard key={deal.slug} deal={deal} />
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

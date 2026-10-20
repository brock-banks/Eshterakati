"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { bestPercent, cheapest, snapshot } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { EndsSoon } from "./EndsBadge";
import { useUI } from "./UIProvider";

/**
 * A gift-card "face" over the price and a Buy button. The whole card links to the deal;
 * Buy sits above that link and opens checkout directly (via a value picker when needed).
 */
export function DealCard({ deal }: { deal: Deal }) {
  const { openSheet } = useUI();
  const { dict: d, t, fmt, href } = useI18n();
  const o = cheapest(deal);
  const several = deal.options.length > 1;
  const pct = bestPercent(deal);
  const inStock = deal.options.filter((x) => x.inStock !== false);
  const name = `${deal.merchant} ${deal.title}`;

  const buy = () =>
    inStock.length > 1
      ? openSheet({ step: "pick", deal })
      : openSheet({ step: "checkout", from: "express", items: [{ ...snapshot(deal, inStock[0]), qty: 1 }] });

  return (
    <article className="deal-card" style={{ "--h": deal.hue } as CSSProperties}>
      <div className="deal-face" aria-hidden="true">
        <span className="deal-face-mono">{deal.merchant[0]}</span>
        {pct !== null && (
          <span className="deal-face-off">
            <bdi>−{pct}%</bdi>
          </span>
        )}
        <span className="deal-face-name">{deal.merchant}</span>
      </div>
      <div className="deal-card-body">
        <Link className="deal-card-link" href={href(`/deals/${deal.slug}`)}>
          <span className="visually-hidden">{deal.merchant} </span>
          {deal.title}
        </Link>
        <div className="deal-card-foot">
          <div className="deal-card-price">
            {several && <span className="from">{d.common.from}</span>}
            <span className="price-row">
              <span className="price">{fmt.money(o.priceMinor)}</span>
              {!several && o.compareAtMinor && (
                <s className="was">
                  <span className="visually-hidden">{d.common.was} </span>
                  {fmt.money(o.compareAtMinor)}
                </s>
              )}
            </span>
            {pct !== null && <span className="visually-hidden">{t(several ? d.common.saleUpTo : d.common.sale, { pct })}</span>}
            {deal.endsAt && <EndsSoon endsAt={deal.endsAt} />}
          </div>
          <button
            className="btn btn-tinted btn-sm"
            type="button"
            disabled={!inStock.length}
            aria-label={inStock.length ? t(d.deal.buyLabel, { name }) : undefined}
            onClick={buy}
          >
            {inStock.length ? d.deal.buy : d.deal.soldOut}
          </button>
        </div>
      </div>
    </article>
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
        <div key={i} className="skeleton" style={{ aspectRatio: "4 / 5", borderRadius: "var(--r-lg)" }} />
      ))}
    </div>
  );
}

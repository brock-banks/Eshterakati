"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { bestPercent, cheapest } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { GiftCardFace, useQuickBuy } from "./DealCard";

/** Today's pick: the deal's gift card, large, with the same quick Buy as the cards. */
export function Hero({ deal }: { deal: Deal }) {
  const { dict: d, t, fmt, href } = useI18n();
  const { buy, available } = useQuickBuy(deal);
  const o = cheapest(deal);
  const pct = bestPercent(deal);
  const name = `${deal.merchant} ${deal.title}`;

  return (
    <section className="hero" style={{ "--h": deal.hue } as CSSProperties} aria-labelledby="hero-title">
      <div className="hero-art">
        <GiftCardFace deal={deal} className="hero-card" />
      </div>
      <div className="hero-copy">
        <p className="hero-eyebrow">{pct !== null ? t(d.discover.todaysPickSale, { pct }) : d.discover.todaysPick}</p>
        <h2 className="hero-title" id="hero-title">
          <Link className="hero-link" href={href(`/deals/${deal.slug}`)}>
            {name}
          </Link>
        </h2>
        <p className="hero-sub">{deal.blurb}</p>
        <div className="hero-cta">
          <p className="hero-price">
            {deal.options.length > 1 && <span className="from">{d.common.from}</span>}
            {fmt.money(o.priceMinor)}
            {o.compareAtMinor && (
              <s>
                <span className="visually-hidden">{d.common.was} </span>
                {fmt.money(o.compareAtMinor)}
              </s>
            )}
          </p>
          <button
            className="btn btn-on-color"
            type="button"
            disabled={!available}
            aria-label={available ? t(d.deal.buyLabel, { name }) : undefined}
            onClick={buy}
          >
            {available ? d.deal.buy : d.deal.soldOut}
          </button>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { CSSProperties } from "react";
import { DealGrid } from "@/components/DealCard";
import { EndsBadge } from "@/components/EndsBadge";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { MerchantTile } from "@/components/MerchantTile";
import { Today } from "@/components/Today";
import { getCategories, getDeals } from "@/lib/api";
import { bestPercent, cheapest, money } from "@/lib/format";

export default async function DiscoverPage() {
  const [deals, categories] = await Promise.all([getDeals(), getCategories()]);
  const featured = deals.find((d) => d.isFeatured) ?? deals[0];
  const fo = featured && cheapest(featured);
  const trending = deals.slice(0, 6);
  const ending = deals
    .filter((d) => d.endsAt)
    .sort((a, b) => a.endsAt!.localeCompare(b.endsAt!))
    .slice(0, 4);

  return (
    <>
      <header className="page-head">
        <Today />
        <h1 className="large-title" tabIndex={-1}>
          Discover
        </h1>
      </header>

      {featured && (
        <Link className="hero" href={`/deals/${featured.slug}`} style={{ "--h": featured.hue } as CSSProperties}>
          <span className="hero-art" aria-hidden="true">
            <span className="tile tile-xl">{featured.merchant[0]}</span>
          </span>
          <span className="hero-copy">
            <span className="hero-eyebrow">Today’s pick · Save up to {bestPercent(featured)}%</span>
            <span className="hero-title" role="heading" aria-level={2}>
              {featured.merchant} {featured.title}
            </span>
            <span className="hero-sub">{featured.blurb}</span>
            <span className="hero-cta">
              <span className="hero-price">
                From {money(fo.priceCents)}
                <s>
                  <span className="visually-hidden">Face value </span>
                  {money(fo.faceValueCents)}
                </s>
              </span>
              <span className="btn btn-on-color">View Deal</span>
            </span>
          </span>
        </Link>
      )}

      <nav className="section" aria-label="Categories">
        <ul className="chips" role="list">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link className="chip" href={`/browse/${c.slug}`}>
                <Icon name={c.icon} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="section" aria-labelledby="trending-h">
        <div className="section-head">
          <h2 className="section-title" id="trending-h">
            Trending now
          </h2>
          <Link className="section-link" href="/browse">
            See All
          </Link>
        </div>
        <DealGrid deals={trending} />
      </section>

      {ending.length > 0 && (
        <section className="section" aria-labelledby="ending-h">
          <div className="section-head">
            <h2 className="section-title" id="ending-h">
              Ending soon
            </h2>
          </div>
          <ul className="list" role="list">
            {ending.map((d) => (
              <li key={d.slug}>
                <Link className="list-row" href={`/deals/${d.slug}`}>
                  <MerchantTile merchant={d.merchant} hue={d.hue} size="sm" />
                  <span className="list-row-main">
                    <span className="list-row-title headline">
                      {d.merchant} {d.title}
                    </span>
                    <span className="list-row-sub">
                      From {money(cheapest(d).priceCents)} · Save up to {bestPercent(d)}%
                    </span>
                  </span>
                  <EndsBadge endsAt={d.endsAt!} />
                  <Icon name="chevron-right" className="chev flip-rtl" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="trust-h">
        <div className="section-head">
          <h2 className="section-title" id="trust-h">
            Why buy here
          </h2>
        </div>
        <ul className="trust" role="list">
          <li className="trust-item">
            <span className="trust-icon"><Icon name="bolt" /></span>
            <div>
              <h3 className="headline">Instant delivery</h3>
              <p>Your code appears the moment you pay, and we email a copy.</p>
            </div>
          </li>
          <li className="trust-item">
            <span className="trust-icon"><Icon name="shield" /></span>
            <div>
              <h3 className="headline">Verified codes</h3>
              <p>Every code is checked with the merchant before it’s listed.</p>
            </div>
          </li>
          <li className="trust-item">
            <span className="trust-icon"><Icon name="refund" /></span>
            <div>
              <h3 className="headline">Money‑back promise</h3>
              <p>Code doesn’t work? Report it within 30 days for a full refund.</p>
            </div>
          </li>
        </ul>
      </section>
      <Footer />
    </>
  );
}

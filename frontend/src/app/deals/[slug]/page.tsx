import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { DealGrid } from "@/components/DealCard";
import { DealPurchase } from "@/components/DealPurchase";
import { EndsBadge } from "@/components/EndsBadge";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getCategories, getDeal, getDeals } from "@/lib/api";
import { bestPercent, compact, LOCALE } from "@/lib/format";

export async function generateStaticParams() {
  return (await getDeals()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/deals/[slug]">): Promise<Metadata> {
  const deal = await getDeal((await params).slug);
  return deal ? { title: `${deal.merchant} ${deal.title}`, description: deal.blurb } : { title: "Deal not found" };
}

export default async function DealPage({ params }: PageProps<"/deals/[slug]">) {
  const { slug } = await params;
  const [deal, categories, all] = await Promise.all([getDeal(slug), getCategories(), getDeals()]);
  if (!deal) notFound();
  const cat = categories.find((c) => c.slug === deal.category);
  const related = [...all.filter((d) => d.category === deal.category), ...all.filter((d) => d.category !== deal.category)]
    .filter((d) => d.slug !== deal.slug)
    .slice(0, 3);

  return (
    <>
      <Link className="back-link" href={cat ? `/browse/${cat.slug}` : "/browse"}>
        <Icon name="chevron-left" className="flip-rtl" />
        {cat?.name ?? "Browse"}
      </Link>

      <div className="deal-layout">
        <div className="deal-art" style={{ "--h": deal.hue } as CSSProperties} aria-hidden="true">
          <span className="badge">Save up to {bestPercent(deal)}%</span>
          <span className="tile tile-xl">{deal.merchant[0]}</span>
          <span className="deal-art-name">{deal.merchant}</span>
        </div>

        <div className="deal-panel">
          <div className="deal-byline">
            <span>{deal.merchant}</span>
            <span className="badge badge-verified">
              <Icon name="shield" />
              Verified
            </span>
            {deal.endsAt && <EndsBadge endsAt={deal.endsAt} />}
          </div>
          <h1 className="title1" tabIndex={-1}>
            {deal.merchant} {deal.title}
          </h1>
          <p className="secondary">{deal.blurb}</p>
          <p className="rating">
            <Icon name="star" className="icon-fill" />
            <span>{deal.rating.toFixed(1)}</span>
            <span aria-hidden="true">·</span>
            <span>{deal.reviewsCount.toLocaleString(LOCALE)} ratings</span>
            <span aria-hidden="true">·</span>
            <span>{compact(deal.soldCount)} sold</span>
          </p>

          <DealPurchase deal={deal} />

          <ul className="assurances" role="list">
            <li>
              <Icon name="bolt" />
              <span>
                <strong>Instant delivery.</strong> Shown on screen and emailed after payment.
              </span>
            </li>
            <li>
              <Icon name="globe" />
              <span>
                <strong>Redeemable in:</strong> {deal.region}.
              </span>
            </li>
            <li>
              <Icon name="refund" />
              <span>
                <strong>Guaranteed.</strong> Full refund if the code doesn’t work.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <section className="section" aria-labelledby="redeem-h">
        <div className="section-head">
          <h2 className="section-title" id="redeem-h">
            How to redeem
          </h2>
        </div>
        <ol className="steps" role="list">
          <li>Copy your code from My Codes after purchase.</li>
          <li>Open {deal.merchant} and go to Account › Redeem Code.</li>
          <li>Paste the code and confirm. The value is added instantly.</li>
        </ol>
      </section>

      <section className="section" aria-labelledby="details-h">
        <div className="section-head">
          <h2 className="section-title" id="details-h">
            Details
          </h2>
        </div>
        <details className="disclosure">
          <summary>
            Terms & conditions <Icon name="chevron-right" className="chev flip-rtl" />
          </summary>
          <div className="disclosure-body">
            <ul>
              <li>Single‑use code. It can’t be exchanged for cash once redeemed.</li>
              <li>Valid for 12 months from purchase unless the merchant states otherwise.</li>
              <li>Redeemable in: {deal.region}. Accounts registered elsewhere may be refused by the merchant.</li>
              <li>If a code is rejected, report it from My Codes within 30 days for a full refund.</li>
            </ul>
          </div>
        </details>
      </section>

      <section className="section" aria-labelledby="more-h">
        <div className="section-head">
          <h2 className="section-title" id="more-h">
            You might also like
          </h2>
        </div>
        <DealGrid deals={related} />
      </section>
      <Footer />
    </>
  );
}

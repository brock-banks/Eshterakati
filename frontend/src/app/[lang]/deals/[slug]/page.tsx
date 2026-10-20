import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { DealGrid } from "@/components/DealCard";
import { DealPurchase } from "@/components/DealPurchase";
import { EndsBadge } from "@/components/EndsBadge";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getDictionary, hasLocale, localePath, locales, plural, t } from "@/i18n";
import { getCategories, getDeal, getDeals, getPaymentMethods } from "@/lib/api";
import { bestPercent, formatters } from "@/lib/format";

export async function generateStaticParams() {
  const all = await Promise.all(locales.map(async (lang) => (await getDeals(lang)).map((x) => ({ lang, slug: x.slug }))));
  return all.flat();
}

export async function generateMetadata({ params }: PageProps<"/[lang]/deals/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const deal = await getDeal(slug, lang);
  return deal ? { title: `${deal.merchant} ${deal.title}`, description: deal.blurb } : { title: getDictionary(lang).deal.notFound };
}

export default async function DealPage({ params }: PageProps<"/[lang]/deals/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  const f = formatters(lang);
  const [deal, categories, all, methods] = await Promise.all([getDeal(slug, lang), getCategories(lang), getDeals(lang), getPaymentMethods(lang)]);
  if (!deal) notFound();
  const pct = bestPercent(deal);
  const cat = categories.find((c) => c.slug === deal.category);
  const related = [...all.filter((x) => x.category === deal.category), ...all.filter((x) => x.category !== deal.category)]
    .filter((x) => x.slug !== deal.slug)
    .slice(0, 3);

  return (
    <>
      <Link className="back-link" href={localePath(lang, cat ? `/browse/${cat.slug}` : "/browse")}>
        <Icon name="chevron-left" className="flip-rtl" />
        {cat?.name ?? d.browse.title}
      </Link>

      <div className="deal-layout">
        <div className="deal-art" style={{ "--h": deal.hue } as CSSProperties} aria-hidden="true">
          {pct !== null && <span className="badge">{t(d.common.saleUpTo, { pct })}</span>}
          <span className="tile tile-xl">{deal.merchant[0]}</span>
          <span className="deal-art-name">{deal.merchant}</span>
        </div>

        <div className="deal-panel">
          <div className="deal-byline">
            <span>{deal.merchant}</span>
            <span className="badge badge-verified">
              <Icon name="shield" />
              {d.common.verified}
            </span>
            {deal.endsAt && <EndsBadge endsAt={deal.endsAt} />}
          </div>
          <h1 className="title1" tabIndex={-1}>
            {deal.merchant} {deal.title}
          </h1>
          <p className="secondary">{deal.blurb}</p>
          <p className="rating">
            <Icon name="star" className="icon-fill" />
            <span>{f.number(deal.rating)}</span>
            <span aria-hidden="true">·</span>
            <span>{plural(lang, d.plurals.ratings, deal.reviewsCount)}</span>
            <span aria-hidden="true">·</span>
            <span>{t(d.deal.sold, { n: f.compact(deal.soldCount) })}</span>
          </p>

          <DealPurchase deal={deal} />

          <ul className="assurances" role="list">
            <li>
              <Icon name="wallet" />
              <span>
                <strong>{d.deal.payTitle}</strong> {methods.length ? t(d.deal.payWith, { methods: f.or(methods.map((m) => m.name)) }) : d.deal.payNoMethods}
              </span>
            </li>
            <li>
              <Icon name="bolt" />
              <span>
                <strong>{d.deal.fastTitle}</strong> {d.deal.fastBody}
              </span>
            </li>
            <li>
              <Icon name="globe" />
              <span>
                <strong>{d.deal.regionTitle}</strong> {deal.region}.
              </span>
            </li>
            <li>
              <Icon name="refund" />
              <span>
                <strong>{d.deal.guaranteeTitle}</strong> {d.deal.guaranteeBody}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <section className="section" aria-labelledby="redeem-h">
        <div className="section-head">
          <h2 className="section-title" id="redeem-h">
            {d.deal.howToRedeem}
          </h2>
        </div>
        <ol className="steps" role="list">
          <li>{d.deal.step1}</li>
          <li>{t(d.deal.step2, { merchant: deal.merchant })}</li>
          <li>{d.deal.step3}</li>
        </ol>
      </section>

      <section className="section" aria-labelledby="details-h">
        <div className="section-head">
          <h2 className="section-title" id="details-h">
            {d.deal.details}
          </h2>
        </div>
        <details className="disclosure">
          <summary>
            {d.deal.terms} <Icon name="chevron-right" className="chev flip-rtl" />
          </summary>
          <div className="disclosure-body">
            <ul>
              <li>{d.deal.term1}</li>
              <li>{d.deal.term2}</li>
              <li>{t(d.deal.term3, { region: deal.region })}</li>
              <li>{d.deal.term4}</li>
            </ul>
          </div>
        </details>
      </section>

      <section className="section" aria-labelledby="more-h">
        <div className="section-head">
          <h2 className="section-title" id="more-h">
            {d.deal.alsoLike}
          </h2>
        </div>
        <DealGrid deals={related} />
      </section>
      <Footer />
    </>
  );
}

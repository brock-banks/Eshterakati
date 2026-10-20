import Link from "next/link";
import { notFound } from "next/navigation";
import { DealGrid } from "@/components/DealCard";
import { EndsBadge } from "@/components/EndsBadge";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { MerchantTile } from "@/components/MerchantTile";
import { Today } from "@/components/Today";
import { getDictionary, hasLocale, localePath, t } from "@/i18n";
import { getCategories, getDeals, getPaymentMethods } from "@/lib/api";
import { bestPercent, cheapest, formatters } from "@/lib/format";

export default async function DiscoverPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  const f = formatters(lang);
  const href = (path: string) => localePath(lang, path);

  const [deals, categories, methods] = await Promise.all([getDeals(lang), getCategories(lang), getPaymentMethods(lang)]);
  const featured = deals.find((x) => x.isFeatured) ?? deals[0];
  const trending = deals.slice(0, 6);
  const ending = deals
    .filter((x) => x.endsAt)
    .sort((a, b) => a.endsAt!.localeCompare(b.endsAt!))
    .slice(0, 4);
  const paymentNames = methods.length ? f.or(methods.map((m) => m.name)) : d.discover.yourBankApp;

  return (
    <>
      <header className="page-head">
        <Today />
        <h1 className="large-title" tabIndex={-1}>
          {d.discover.title}
        </h1>
      </header>

      {featured && <Hero deal={featured} />}

      <nav className="section" aria-label={d.discover.categories}>
        <ul className="chips" role="list">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link className="chip" href={href(`/browse/${c.slug}`)}>
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
            {d.discover.trending}
          </h2>
          <Link className="section-link" href={href("/browse")}>
            {d.common.seeAll}
          </Link>
        </div>
        <DealGrid deals={trending} />
      </section>

      {ending.length > 0 && (
        <section className="section" aria-labelledby="ending-h">
          <div className="section-head">
            <h2 className="section-title" id="ending-h">
              {d.discover.endingSoon}
            </h2>
          </div>
          <ul className="list" role="list">
            {ending.map((x) => {
              const pct = bestPercent(x);
              return (
                <li key={x.slug}>
                  <Link className="list-row" href={href(`/deals/${x.slug}`)}>
                    <MerchantTile merchant={x.merchant} hue={x.hue} size="sm" />
                    <span className="list-row-main">
                      <span className="list-row-title headline">
                        {x.merchant} {x.title}
                      </span>
                      <span className="list-row-sub">
                        {t(d.discover.endingFrom, { price: f.money(cheapest(x).priceMinor) })}
                        {pct !== null && t(d.discover.endingSale, { pct })}
                      </span>
                    </span>
                    <EndsBadge endsAt={x.endsAt!} />
                    <Icon name="chevron-right" className="chev flip-rtl" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="trust-h">
        <div className="section-head">
          <h2 className="section-title" id="trust-h">
            {d.discover.whyBuy}
          </h2>
        </div>
        <ul className="trust" role="list">
          <li className="trust-item">
            <span className="trust-icon"><Icon name="wallet" /></span>
            <div>
              <h3 className="headline">{d.discover.payTitle}</h3>
              <p>{t(d.discover.payBody, { methods: paymentNames })}</p>
            </div>
          </li>
          <li className="trust-item">
            <span className="trust-icon"><Icon name="bolt" /></span>
            <div>
              <h3 className="headline">{d.discover.fastTitle}</h3>
              <p>{d.discover.fastBody}</p>
            </div>
          </li>
          <li className="trust-item">
            <span className="trust-icon"><Icon name="refund" /></span>
            <div>
              <h3 className="headline">{d.discover.refundTitle}</h3>
              <p>{d.discover.refundBody}</p>
            </div>
          </li>
        </ul>
      </section>
      <Footer />
    </>
  );
}

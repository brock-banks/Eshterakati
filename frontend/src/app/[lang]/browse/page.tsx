import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { DealGrid } from "@/components/DealCard";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getDictionary, hasLocale, localePath, plural, t } from "@/i18n";
import { getCategories, getDeals } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/browse">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).browse.title } : {};
}

export default async function BrowsePage({ params }: PageProps<"/[lang]/browse">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  const [deals, categories] = await Promise.all([getDeals(lang), getCategories(lang)]);

  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {d.browse.title}
        </h1>
        <p className="page-lede">
          {t(d.browse.lede, {
            deals: plural(lang, d.plurals.deals, deals.length),
            categories: plural(lang, d.plurals.categories, categories.length),
          })}
        </p>
      </header>
      <ul className="cat-grid" role="list">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link className="cat-tile" href={localePath(lang, `/browse/${c.slug}`)}>
              <span className="cat-icon" style={{ "--h": c.hue } as CSSProperties}>
                <Icon name={c.icon} />
              </span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-meta">{plural(lang, d.plurals.deals, c.dealsCount)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="section" aria-labelledby="all-h">
        <div className="section-head">
          <h2 className="section-title" id="all-h">
            {d.browse.allDeals}
          </h2>
        </div>
        <DealGrid deals={deals} />
      </section>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { DealGrid } from "@/components/DealCard";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getCategories, getDeals } from "@/lib/api";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Browse" };

export default async function BrowsePage() {
  const [deals, categories] = await Promise.all([getDeals(), getCategories()]);
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          Browse
        </h1>
        <p className="page-lede">
          {plural(deals.length, "deal")} across {plural(categories.length, "category", "categories")}.
        </p>
      </header>
      <ul className="cat-grid" role="list">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link className="cat-tile" href={`/browse/${c.slug}`}>
              <span className="cat-icon" style={{ "--h": c.hue } as CSSProperties}>
                <Icon name={c.icon} />
              </span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-meta">{plural(c.dealsCount, "deal")}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="section" aria-labelledby="all-h">
        <div className="section-head">
          <h2 className="section-title" id="all-h">
            All deals
          </h2>
        </div>
        <DealGrid deals={deals} />
      </section>
      <Footer />
    </>
  );
}

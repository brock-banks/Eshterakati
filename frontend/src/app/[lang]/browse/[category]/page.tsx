import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DealGrid } from "@/components/DealCard";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { SortableDeals, SortToolbar } from "@/components/SortableDeals";
import { getDictionary, hasLocale, localePath, locales } from "@/i18n";
import { getCategories, getDeals } from "@/lib/api";

export async function generateStaticParams() {
  const all = await Promise.all(locales.map(async (lang) => (await getCategories(lang)).map((c) => ({ lang, category: c.slug }))));
  return all.flat();
}

export async function generateMetadata({ params }: PageProps<"/[lang]/browse/[category]">): Promise<Metadata> {
  const { lang, category } = await params;
  if (!hasLocale(lang)) return {};
  const cat = (await getCategories(lang)).find((c) => c.slug === category);
  return { title: cat?.name ?? getDictionary(lang).browse.title, description: cat?.blurb };
}

export default async function CategoryPage({ params }: PageProps<"/[lang]/browse/[category]">) {
  const { lang, category } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  const [categories, all] = await Promise.all([getCategories(lang), getDeals(lang)]);
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const deals = all.filter((x) => x.category === cat.slug);

  return (
    <>
      <Link className="back-link" href={localePath(lang, "/browse")}>
        <Icon name="chevron-left" className="flip-rtl" />
        {d.browse.title}
      </Link>
      <header className="page-head" style={{ paddingBlockStart: "var(--s-2)" }}>
        <h1 className="large-title" tabIndex={-1}>
          {cat.name}
        </h1>
        <p className="page-lede">{cat.blurb}</p>
      </header>
      {/* The sort control reads ?sort= from the URL, which is only known at request time. */}
      <Suspense
        fallback={
          <>
            <SortToolbar sort="popular" count={deals.length} />
            <DealGrid deals={deals} />
          </>
        }
      >
        <SortableDeals deals={deals} />
      </Suspense>
      <Footer />
    </>
  );
}

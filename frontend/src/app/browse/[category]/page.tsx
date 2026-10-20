import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DealGrid } from "@/components/DealCard";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { SortableDeals, SortToolbar } from "@/components/SortableDeals";
import { getCategories, getDeals } from "@/lib/api";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/browse/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  return { title: cat?.name ?? "Browse", description: cat?.blurb };
}

export default async function CategoryPage({ params }: PageProps<"/browse/[category]">) {
  const { category } = await params;
  const [categories, all] = await Promise.all([getCategories(), getDeals()]);
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const deals = all.filter((d) => d.category === cat.slug);

  return (
    <>
      <Link className="back-link" href="/browse">
        <Icon name="chevron-left" className="flip-rtl" />
        Browse
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

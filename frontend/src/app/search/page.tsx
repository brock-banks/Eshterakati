import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";
import { getCategories, getDeals } from "@/lib/api";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const [deals, categories] = await Promise.all([getDeals(), getCategories()]);
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          Search
        </h1>
      </header>
      {/* The query comes from ?q=, known only at request time. */}
      <Suspense fallback={<div className="skeleton" style={{ height: 44 }} />}>
        <SearchView deals={deals} categories={categories} />
      </Suspense>
    </>
  );
}

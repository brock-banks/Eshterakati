import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";
import { getDictionary, hasLocale } from "@/i18n";
import { getCategories, getDeals } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).search.title } : {};
}

export default async function SearchPage({ params }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [deals, categories] = await Promise.all([getDeals(lang), getCategories(lang)]);
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {getDictionary(lang).search.title}
        </h1>
      </header>
      {/* The query comes from ?q=, known only at request time. */}
      <Suspense fallback={<div className="skeleton" style={{ height: 44 }} />}>
        <SearchView deals={deals} categories={categories} />
      </Suspense>
    </>
  );
}

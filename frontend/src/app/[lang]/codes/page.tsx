import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodesView } from "@/components/CodesView";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getDictionary, hasLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/codes">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).codes.title } : {};
}

export default async function CodesPage({ params }: PageProps<"/[lang]/codes">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {d.codes.title}
        </h1>
        <p className="page-lede">
          {d.codes.ledeBefore} <Icon name="eye" className="icon-sm icon-inline" /> {d.codes.ledeAfter}
        </p>
      </header>
      <Suspense fallback={<div className="skeleton" style={{ height: 44, maxWidth: 240 }} />}>
        <CodesView />
      </Suspense>
      <Footer />
    </>
  );
}

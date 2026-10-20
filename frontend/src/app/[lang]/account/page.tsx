import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountView } from "@/components/AccountView";
import { Footer } from "@/components/Footer";
import { getDictionary, hasLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).account.title } : {};
}

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {getDictionary(lang).account.title}
        </h1>
      </header>
      <AccountView />
      <Footer />
    </>
  );
}

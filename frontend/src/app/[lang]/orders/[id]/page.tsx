import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderView } from "@/components/OrderView";
import { getDictionary, hasLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/orders/[id]">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? getDictionary(lang).order.pageTitle : undefined, robots: { index: false } };
}

async function Order({ params }: { params: PageProps<"/[lang]/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderView id={id} />;
}

export default function OrderPage({ params }: PageProps<"/[lang]/orders/[id]">) {
  return (
    // The order id and the token in ?t= are only known at request time.
    <Suspense fallback={<div className="skeleton" style={{ height: 320, marginBlockStart: "var(--s-8)" }} />}>
      <Order params={params} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderView } from "@/components/OrderView";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

async function Order({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderView id={id} />;
}

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    // The order id and the token in ?t= are only known at request time.
    <Suspense fallback={<div className="skeleton" style={{ height: 320, marginBlockStart: "var(--s-8)" }} />}>
      <Order params={params} />
    </Suspense>
  );
}

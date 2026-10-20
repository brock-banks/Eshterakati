import type { Metadata } from "next";
import { Suspense } from "react";
import { CodesView } from "@/components/CodesView";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "My Codes" };

export default function CodesPage() {
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          My Codes
        </h1>
        <p className="page-lede">
          Codes stay hidden until you tap <Icon name="eye" className="icon-sm icon-inline" /> — you can copy one without revealing it.
        </p>
      </header>
      <Suspense fallback={<div className="skeleton" style={{ height: 44, maxWidth: 240 }} />}>
        <CodesView />
      </Suspense>
      <Footer />
    </>
  );
}

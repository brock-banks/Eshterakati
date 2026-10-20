import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          Account
        </h1>
      </header>
      <AccountView />
      <Footer />
    </>
  );
}

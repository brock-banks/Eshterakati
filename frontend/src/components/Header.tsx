"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { saveRecent, useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { useUI } from "./UIProvider";

export const tabFor = (pathname: string) => {
  if (pathname === "/") return "discover";
  if (pathname.startsWith("/browse") || pathname.startsWith("/deals")) return "browse";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/codes")) return "codes";
  if (pathname.startsWith("/account")) return "account";
  return null;
};

type Tab = ReturnType<typeof tabFor>;

/**
 * The pathname is request-time data on routes like /orders/[id], so everything that
 * reads it sits in <Suspense> with a fallback that renders the same links, none active.
 */
function useTab() {
  return tabFor(usePathname());
}

function TopNav({ tab }: { tab: Tab }) {
  const current = (t: string) => (tab === t ? ("page" as const) : undefined);
  return (
    <nav className="top-nav" aria-label="Primary">
      <Link href="/" aria-current={current("discover")}>Discover</Link>
      <Link href="/browse" aria-current={current("browse")}>Browse</Link>
      <Link href="/codes" aria-current={current("codes")}>My Codes</Link>
    </nav>
  );
}
const ActiveTopNav = () => <TopNav tab={useTab()} />;

function AccountLink({ tab }: { tab: Tab }) {
  return (
    <Link className="icon-btn desktop-only" href="/account" aria-label="Account" aria-current={tab === "account" ? "page" : undefined}>
      <Icon name="person" />
    </Link>
  );
}
const ActiveAccountLink = () => <AccountLink tab={useTab()} />;

export function Header() {
  const router = useRouter();
  const { openSheet } = useUI();
  const count = useStore((s) => s.bag.reduce((n, l) => n + l.qty, 0));

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Eshterakati, home">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="ticket" />
          </span>
          <span className="brand-name">Eshterakati</span>
        </Link>
        <Suspense fallback={<TopNav tab={null} />}>
          <ActiveTopNav />
        </Suspense>
        <span className="header-spacer" />
        <form
          className="header-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
            const q = input.value.trim();
            saveRecent(q);
            input.value = "";
            router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
          }}
        >
          <label className="visually-hidden" htmlFor="header-q">
            Search coupon codes
          </label>
          <Icon name="search" />
          <input id="header-q" name="q" type="search" placeholder="Search codes" autoComplete="off" enterKeyHint="search" />
        </form>
        <button
          className="icon-btn"
          type="button"
          aria-label={count ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag, empty"}
          onClick={() => openSheet({ step: "bag" })}
        >
          <Icon name="bag" />
          {count > 0 && <span className="count-badge">{count > 9 ? "9+" : count}</span>}
        </button>
        <Suspense fallback={<AccountLink tab={null} />}>
          <ActiveAccountLink />
        </Suspense>
      </div>
    </header>
  );
}

const TABS = [
  ["discover", "/", "compass", "Discover"],
  ["browse", "/browse", "grid", "Browse"],
  ["search", "/search", "search", "Search"],
  ["codes", "/codes", "ticket", "My Codes"],
  ["account", "/account", "person", "Account"],
] as const;

function Tabs({ tab }: { tab: Tab }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(([id, href, icon, label]) => (
        <Link key={id} className="tab" href={href} aria-current={tab === id ? "page" : undefined}>
          <Icon name={icon} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

const ActiveTabs = () => <Tabs tab={useTab()} />;

export function TabBar() {
  return (
    <Suspense fallback={<Tabs tab={null} />}>
      <ActiveTabs />
    </Suspense>
  );
}

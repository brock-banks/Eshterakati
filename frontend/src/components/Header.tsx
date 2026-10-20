"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { openSheet } = useUI();
  const count = useStore((s) => s.bag.reduce((n, l) => n + l.qty, 0));
  const tab = tabFor(pathname);
  const current = (t: string) => (tab === t ? ("page" as const) : undefined);

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Eshterakati, home">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="ticket" />
          </span>
          <span className="brand-name">Eshterakati</span>
        </Link>
        <nav className="top-nav" aria-label="Primary">
          <Link href="/" aria-current={current("discover")}>Discover</Link>
          <Link href="/browse" aria-current={current("browse")}>Browse</Link>
          <Link href="/codes" aria-current={current("codes")}>My Codes</Link>
        </nav>
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
        <Link className="icon-btn desktop-only" href="/account" aria-label="Account" aria-current={current("account")}>
          <Icon name="person" />
        </Link>
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

export function TabBar() {
  const tab = tabFor(usePathname());
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

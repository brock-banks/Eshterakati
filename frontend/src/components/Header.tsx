"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { LOCALE_COOKIE, localePath, stripLocale, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { useUI } from "./UIProvider";

export const tabFor = (pathname: string) => {
  const path = stripLocale(pathname);
  if (path === "/") return "discover";
  if (path.startsWith("/browse") || path.startsWith("/deals")) return "browse";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/codes") || path.startsWith("/orders")) return "codes";
  if (path.startsWith("/account")) return "account";
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

/** Same page in the other language; remembers the choice for links without a language. */
export function useSwitchLanguage() {
  const router = useRouter();
  const { lang } = useI18n();
  return (to: Locale = lang === "ar" ? "en" : "ar") => {
    document.cookie = `${LOCALE_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`;
    const { pathname, search, hash } = window.location;
    router.push(localePath(to, stripLocale(pathname)) + search + hash);
  };
}

function TopNav({ tab }: { tab: Tab }) {
  const { dict, href } = useI18n();
  const current = (t: string) => (tab === t ? ("page" as const) : undefined);
  return (
    <nav className="top-nav" aria-label={dict.nav.primary}>
      <Link href={href("/")} aria-current={current("discover")}>{dict.nav.discover}</Link>
      <Link href={href("/browse")} aria-current={current("browse")}>{dict.nav.browse}</Link>
      <Link href={href("/codes")} aria-current={current("codes")}>{dict.nav.myCodes}</Link>
    </nav>
  );
}
const ActiveTopNav = () => <TopNav tab={useTab()} />;

function AccountLink({ tab }: { tab: Tab }) {
  const { dict, href } = useI18n();
  return (
    <Link className="icon-btn desktop-only" href={href("/account")} aria-label={dict.nav.account} aria-current={tab === "account" ? "page" : undefined}>
      <Icon name="person" />
    </Link>
  );
}
const ActiveAccountLink = () => <AccountLink tab={useTab()} />;

function SearchLink({ tab }: { tab: Tab }) {
  const { dict, href } = useI18n();
  return (
    <Link className="icon-btn desktop-only" href={href("/search")} aria-label={dict.nav.search} aria-current={tab === "search" ? "page" : undefined}>
      <Icon name="search" />
    </Link>
  );
}
const ActiveSearchLink = () => <SearchLink tab={useTab()} />;

/** Brand at the start, the sections centred, actions at the end. */
export function Header() {
  const { openSheet } = useUI();
  const { dict, href, plural, t, lang } = useI18n();
  const switchLanguage = useSwitchLanguage();
  const count = useStore((s) => s.bag.reduce((n, l) => n + l.qty, 0));

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-start">
          <Link className="brand" href={href("/")} aria-label={dict.nav.home}>
            <span className="brand-mark" aria-hidden="true">
              <Icon name="ticket" />
            </span>
            <span className="brand-name">{dict.brand}</span>
          </Link>
        </div>
        <Suspense fallback={<TopNav tab={null} />}>
          <ActiveTopNav />
        </Suspense>
        <div className="header-end">
          <Suspense fallback={<SearchLink tab={null} />}>
            <ActiveSearchLink />
          </Suspense>
          <button className="lang-btn" type="button" aria-label={dict.nav.switchLanguage} onClick={() => switchLanguage()}>
            <Icon name="globe" />
            <span lang={lang === "ar" ? "en" : "ar"}>{dict.nav.otherLanguageShort}</span>
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label={count ? t(dict.nav.bag, { items: plural(dict.plurals.items, count) }) : dict.nav.bagEmpty}
            onClick={() => openSheet({ step: "bag" })}
          >
            <Icon name="bag" />
            {count > 0 && <span className="count-badge">{count > 9 ? "9+" : count}</span>}
          </button>
          <Suspense fallback={<AccountLink tab={null} />}>
            <ActiveAccountLink />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  ["discover", "/", "compass"],
  ["browse", "/browse", "grid"],
  ["search", "/search", "search"],
  ["codes", "/codes", "ticket"],
  ["account", "/account", "person"],
] as const;

function Tabs({ tab }: { tab: Tab }) {
  const { dict, href } = useI18n();
  const labels = { discover: dict.nav.discover, browse: dict.nav.browse, search: dict.nav.search, codes: dict.nav.myCodes, account: dict.nav.account };
  return (
    <nav className="tabbar" aria-label={dict.nav.primary}>
      {TABS.map(([id, path, icon]) => (
        <Link key={id} className="tab" href={href(path)} aria-current={tab === id ? "page" : undefined}>
          <Icon name={icon} />
          {labels[id]}
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

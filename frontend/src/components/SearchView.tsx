"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { plural, searchDeals } from "@/lib/format";
import { saveRecent, update, useStore } from "@/lib/store";
import type { Category, Deal } from "@/lib/types";
import { DealGrid } from "./DealCard";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";

const SUGGESTED = ["gift card", "season pass", "VPN", "flight", "family plan", "groceries"];

export function SearchView({ deals, categories }: { deals: Deal[]; categories: Category[] }) {
  const initial = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useStore((s) => s.recent);
  const names = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.name])), [categories]);
  const term = q.trim();
  const results = useMemo(() => (term ? searchDeals(deals, names, term) : []), [deals, names, term]);

  function change(value: string) {
    setQ(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <form
        className="search-field"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          saveRecent(q);
          inputRef.current?.blur(); // dismiss the on-screen keyboard to reveal results
        }}
      >
        <label className="visually-hidden" htmlFor="search-q">
          Search coupon codes
        </label>
        <Icon name="search" className="icon-search" />
        <input
          ref={inputRef}
          id="search-q"
          type="search"
          value={q}
          onChange={(e) => change(e.target.value)}
          placeholder="Merchants, categories and more"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {q && (
          <button
            className="clear"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              change("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </form>

      <div aria-live="polite">
        {!term ? (
          <>
            {recent.length > 0 && (
              <>
                <div className="section-head" style={{ marginBlockStart: "var(--s-6)" }}>
                  <h2 className="section-title">Recent</h2>
                  <button className="btn btn-plain" type="button" onClick={() => update(() => ({ recent: [] }))}>
                    Clear
                  </button>
                </div>
                <ul className="list" role="list">
                  {recent.map((r) => (
                    <li key={r}>
                      <button className="list-row has-icon" type="button" onClick={() => change(r)}>
                        <span className="secondary" style={{ width: 30, display: "grid", placeItems: "center" }}>
                          <Icon name="history" />
                        </span>
                        <span className="list-row-main">{r}</span>
                        <Icon name="chevron-right" className="chev flip-rtl" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="section-head" style={{ marginBlockStart: "var(--s-8)" }}>
              <h2 className="section-title">Suggested</h2>
            </div>
            <ul className="chips" role="list">
              {SUGGESTED.map((s) => (
                <li key={s}>
                  <button className="chip" type="button" onClick={() => change(s)}>
                    <Icon name="search" />
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : results.length ? (
          <>
            <p className="result-count" style={{ marginBlock: "var(--s-4) var(--s-3)" }}>
              {plural(results.length, "result")}
            </p>
            {/* Opening a result remembers the search. */}
            <div onClickCapture={(e) => (e.target as HTMLElement).closest("a") && saveRecent(term)}>
              <DealGrid deals={results} />
            </div>
          </>
        ) : (
          <EmptyState
            icon="search"
            title={`No results for “${term}”`}
            action={
              <Link className="btn btn-tinted" href="/browse">
                Browse Categories
              </Link>
            }
          >
            Check the spelling, or try a merchant name or a category like “gaming”.
          </EmptyState>
        )}
      </div>
    </>
  );
}

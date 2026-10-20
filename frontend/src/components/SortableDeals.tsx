"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { plural, sortDeals, type Sort } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { DealGrid } from "./DealCard";
import { SegmentedControl } from "./SegmentedControl";

const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "savings", label: "Savings" },
  { value: "ending", label: "Ending Soon" },
];
const isSort = (v: string | null): v is Sort => SORTS.some((s) => s.value === v);

/** Sort lives in the URL (?sort=) so it survives back navigation and can be shared. */
export function SortableDeals({ deals }: { deals: Deal[] }) {
  const param = useSearchParams().get("sort");
  const [sort, setSort] = useState<Sort>(isSort(param) ? param : "popular");

  function change(next: Sort) {
    setSort(next);
    const url = new URL(window.location.href);
    if (next === "popular") url.searchParams.delete("sort");
    else url.searchParams.set("sort", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <SortToolbar sort={sort} onChange={change} count={deals.length} />
      <DealGrid deals={sortDeals(deals, sort)} />
    </>
  );
}

export function SortToolbar({ sort, onChange, count }: { sort: Sort; onChange?: (s: Sort) => void; count: number }) {
  return (
    <div className="toolbar">
      <SegmentedControl label="Sort deals" segments={SORTS} value={sort} onChange={onChange ?? (() => {})} />
      <p className="result-count">{plural(count, "deal")}</p>
    </div>
  );
}

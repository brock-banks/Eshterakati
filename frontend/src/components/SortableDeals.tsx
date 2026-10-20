"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { sortDeals, type Sort } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { DealGrid } from "./DealCard";
import { SegmentedControl } from "./SegmentedControl";

const SORTS: Sort[] = ["popular", "savings", "ending"];
const isSort = (v: string | null): v is Sort => SORTS.includes(v as Sort);

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
  const { dict: d, plural } = useI18n();
  const labels: Record<Sort, string> = { popular: d.browse.popular, savings: d.browse.savings, ending: d.browse.endingSoon };
  return (
    <div className="toolbar">
      <SegmentedControl
        label={d.browse.sortLabel}
        segments={SORTS.map((value) => ({ value, label: labels[value] }))}
        value={sort}
        onChange={onChange ?? (() => {})}
      />
      <p className="result-count">{plural(d.plurals.deals, count)}</p>
    </div>
  );
}

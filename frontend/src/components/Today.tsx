"use client";

import { useNow } from "@/lib/clock";
import { LOCALE } from "@/lib/format";

/** Today's date, App Store "Today" style. Client-only so it reflects the shopper's clock. */
export function Today() {
  const now = useNow();
  return (
    <p className="eyebrow" style={{ minHeight: "1.3em" }}>
      {now !== null && new Date(now).toLocaleDateString(LOCALE, { weekday: "long", month: "long", day: "numeric" })}
    </p>
  );
}

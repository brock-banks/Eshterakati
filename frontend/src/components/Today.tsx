"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { useNow } from "@/lib/clock";

/** Today's date, App Store "Today" style. Client-only so it reflects the shopper's clock. */
export function Today() {
  const { fmt } = useI18n();
  const now = useNow();
  return (
    <p className="eyebrow" style={{ minHeight: "1.3em" }}>
      {now !== null && fmt.today(now)}
    </p>
  );
}

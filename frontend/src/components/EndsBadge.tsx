"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { useNow } from "@/lib/clock";
import { timeLeft } from "@/lib/format";
import { Icon } from "./Icon";

export function EndsBadge({ endsAt }: { endsAt: string }) {
  const { dict } = useI18n();
  const now = useNow();
  return (
    <span className="badge badge-ends">
      <Icon name="clock" />
      <span>{now === null ? dict.common.limitedTime : timeLeft(endsAt, now, dict)}</span>
    </span>
  );
}

const DAY = 24 * 60 * 60 * 1000;

/** Quiet countdown for deal cards: shown only in the last 24 hours, so urgency stays meaningful. */
export function EndsSoon({ endsAt }: { endsAt: string }) {
  const { dict } = useI18n();
  const now = useNow();
  if (now === null) return null;
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0 || left >= DAY) return null;
  return (
    <span className="ends-soon">
      <Icon name="clock" />
      {timeLeft(endsAt, now, dict)}
    </span>
  );
}

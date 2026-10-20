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

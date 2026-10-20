"use client";

import { useNow } from "@/lib/clock";
import { timeLeft } from "@/lib/format";
import { Icon } from "./Icon";

export function EndsBadge({ endsAt }: { endsAt: string }) {
  const now = useNow();
  return (
    <span className="badge badge-ends">
      <Icon name="clock" />
      <span>{now === null ? "Limited time" : timeLeft(endsAt, now)}</span>
    </span>
  );
}

export type IconName =
  | "ticket" | "compass" | "grid" | "search" | "person" | "bag" | "bag-plus" | "chevron-right" | "chevron-left"
  | "close" | "check" | "check-circle" | "copy" | "eye" | "eye-off" | "shield" | "bolt" | "refund" | "clock"
  | "history" | "star" | "tv" | "gamepad" | "utensils" | "tag" | "plane" | "layers" | "plus" | "minus" | "trash"
  | "card" | "wallet" | "bell" | "globe" | "moon" | "help" | "flag" | "info" | "lock" | "mail" | "doc" | "alert";

/** Decorative by default — give the surrounding control an accessible name. */
export function Icon({ name, className = "" }: { name: IconName | string; className?: string }) {
  return (
    <svg className={`icon ${className}`} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

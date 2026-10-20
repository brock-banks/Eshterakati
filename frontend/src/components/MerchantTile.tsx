import type { CSSProperties } from "react";

/** Gradient monogram tile — a placeholder until licensed merchant artwork exists. */
export function MerchantTile({ merchant, hue, size }: { merchant: string; hue: number; size?: "sm" | "lg" | "xl" }) {
  return (
    <span className={`tile${size ? ` tile-${size}` : ""}`} style={{ "--h": hue } as CSSProperties} aria-hidden="true">
      {merchant[0]}
    </span>
  );
}

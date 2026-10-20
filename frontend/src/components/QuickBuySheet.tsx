"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { snapshot } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { SheetNav } from "./CheckoutSheet";
import { firstInStock, OptionPicker } from "./DealPurchase";
import { MerchantTile } from "./MerchantTile";
import { useUI } from "./UIProvider";

/** Buy from a deal card: pick a value, then go straight to checkout. */
export function PickView({ deal, optionId }: { deal: Deal; optionId?: number }) {
  const { showView } = useUI();
  const { dict: d, fmt } = useI18n();
  // Coming back from checkout keeps the value the shopper picked.
  const [selected, setSelected] = useState(() => {
    const i = deal.options.findIndex((o) => o.id === optionId);
    return i >= 0 ? i : firstInStock(deal);
  });
  const option = deal.options[selected];

  return (
    <>
      <SheetNav title={d.checkout.title} />
      <div className="sheet-body">
        <div className="pick-head">
          <MerchantTile merchant={deal.merchant} hue={deal.hue} size="sm" />
          <div>
            <p className="headline">{deal.title}</p>
            <p className="list-row-sub">{deal.merchant}</p>
          </div>
        </div>
        <OptionPicker deal={deal} selected={selected} onSelect={setSelected} />
      </div>
      <div className="sheet-foot">
        <button
          className="btn btn-filled btn-lg"
          type="button"
          disabled={option.inStock === false}
          onClick={() => showView({ step: "checkout", from: "pick", deal, items: [{ ...snapshot(deal, option), qty: 1 }] })}
        >
          {d.deal.buyNow} · {fmt.money(option.priceMinor)}
        </button>
      </div>
    </>
  );
}

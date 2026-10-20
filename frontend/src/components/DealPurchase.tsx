"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { snapshot } from "@/lib/format";
import { addToBag } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { Icon } from "./Icon";
import { useUI } from "./UIProvider";

/** Option picker, live price and the purchase actions (inline on desktop, sticky bar on phones). */
export function DealPurchase({ deal }: { deal: Deal }) {
  const { openSheet, toast } = useUI();
  const { dict: d, t, fmt } = useI18n();
  const firstInStock = Math.max(0, deal.options.findIndex((o) => o.inStock !== false));
  const [selected, setSelected] = useState(firstInStock);
  const option = deal.options[selected];
  const soldOut = option.inStock === false;

  const buyNow = () => openSheet({ step: "checkout", from: "express", items: [{ ...snapshot(deal, option), qty: 1 }] });
  const add = () => {
    addToBag(snapshot(deal, option));
    toast(d.deal.added, { label: d.deal.viewBag, run: () => openSheet({ step: "bag" }) });
  };

  return (
    <>
      <fieldset className="options">
        <legend className="field-label">{deal.options.length > 1 ? d.deal.chooseValue : d.deal.value}</legend>
        <div className="option-grid">
          {deal.options.map((o, i) => (
            <label key={o.id} className="option">
              <input
                type="radio"
                name="option"
                value={o.id}
                checked={i === selected}
                disabled={o.inStock === false}
                onChange={() => setSelected(i)}
              />
              <span className="option-body">
                <span className="option-label">{o.label}</span>
                <span className="option-price">
                  {o.inStock === false ? d.deal.soldOut : fmt.money(o.priceMinor)}
                  {o.inStock !== false && o.discountPercent && (
                    <>
                      {" · "}
                      <bdi>−{o.discountPercent}%</bdi>
                    </>
                  )}
                </span>
                <span className="option-check">
                  <Icon name="check" />
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="price-block" aria-live="polite">
        <span className="price-lg">{fmt.money(option.priceMinor)}</span>
        {option.compareAtMinor && (
          <>
            <s className="was">
              <span className="visually-hidden">{d.common.was} </span>
              {fmt.money(option.compareAtMinor)}
            </s>
            <span className="badge badge-save">{t(d.deal.youSave, { amount: fmt.money(option.compareAtMinor - option.priceMinor) })}</span>
          </>
        )}
      </div>

      <div className="cta-row desktop-only">
        <button className="btn btn-filled btn-lg" type="button" onClick={buyNow} disabled={soldOut}>
          {d.deal.buyNow}
        </button>
        <button className="btn btn-tinted btn-lg" type="button" onClick={add} disabled={soldOut}>
          <Icon name="bag-plus" />
          {d.deal.addToBag}
        </button>
      </div>

      <div className="buy-bar mobile-only">
        <div className="buy-bar-price">
          <span className="price">{fmt.money(option.priceMinor)}</span>
          <span className="secondary">
            {option.label}
            {option.discountPercent && <> · {t(d.common.sale, { pct: option.discountPercent })}</>}
          </span>
        </div>
        <button className="btn btn-tinted" type="button" aria-label={d.deal.addToBag} onClick={add} disabled={soldOut}>
          <Icon name="bag-plus" />
        </button>
        <button className="btn btn-filled" type="button" onClick={buyNow} disabled={soldOut}>
          {d.deal.buyNow}
        </button>
      </div>
    </>
  );
}

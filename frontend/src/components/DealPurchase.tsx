"use client";

import { useState } from "react";
import { money, snapshot } from "@/lib/format";
import { addToBag } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { Icon } from "./Icon";
import { useUI } from "./UIProvider";

/** Option picker, live price and the purchase actions (inline on desktop, sticky bar on phones). */
export function DealPurchase({ deal }: { deal: Deal }) {
  const { openSheet, toast } = useUI();
  const firstInStock = Math.max(0, deal.options.findIndex((o) => o.inStock !== false));
  const [selected, setSelected] = useState(firstInStock);
  const option = deal.options[selected];
  const soldOut = option.inStock === false;

  const buyNow = () => openSheet({ step: "checkout", from: "express", items: [{ ...snapshot(deal, option), qty: 1 }] });
  const add = () => {
    addToBag(snapshot(deal, option));
    toast("Added to Bag", { label: "View Bag", run: () => openSheet({ step: "bag" }) });
  };

  return (
    <>
      <fieldset className="options">
        <legend className="field-label">{deal.options.length > 1 ? "Choose a value" : "Value"}</legend>
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
                  {o.inStock === false ? "Sold out" : `${money(o.priceCents)} · −${o.discountPercent}%`}
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
        <span className="price-lg">{money(option.priceCents)}</span>
        <s className="was">
          <span className="visually-hidden">Face value </span>
          {money(option.faceValueCents)}
        </s>
        <span className="badge badge-save">You save {money(option.faceValueCents - option.priceCents)}</span>
      </div>

      <div className="cta-row desktop-only">
        <button className="btn btn-filled btn-lg" type="button" onClick={buyNow} disabled={soldOut}>
          Buy Now
        </button>
        <button className="btn btn-tinted btn-lg" type="button" onClick={add} disabled={soldOut}>
          <Icon name="bag-plus" />
          Add to Bag
        </button>
      </div>

      <div className="buy-bar mobile-only">
        <div className="buy-bar-price">
          <span className="price">{money(option.priceCents)}</span>
          <span className="secondary">
            {option.label} · save {option.discountPercent}%
          </span>
        </div>
        <button className="btn btn-tinted" type="button" aria-label="Add to Bag" onClick={add} disabled={soldOut}>
          <Icon name="bag-plus" />
        </button>
        <button className="btn btn-filled" type="button" onClick={buyNow} disabled={soldOut}>
          Buy Now
        </button>
      </div>
    </>
  );
}

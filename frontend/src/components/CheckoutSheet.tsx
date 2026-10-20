"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { placeOrder } from "@/app/actions";
import { money, plural } from "@/lib/format";
import { addCodes, clearBag, MAX_QTY, removeLine, restoreLine, setQty, update, useStore } from "@/lib/store";
import type { BagLine } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { CodeField } from "./CodeField";
import { MerchantTile } from "./MerchantTile";
import { useUI, type SheetView } from "./UIProvider";

const totals = (lines: BagLine[]) =>
  lines.reduce(
    (t, l) => ({ face: t.face + l.faceValueCents * l.qty, price: t.price + l.priceCents * l.qty, count: t.count + l.qty }),
    { face: 0, price: 0, count: 0 },
  );

function SheetNav({ title, leading, trailing }: { title: string; leading?: ReactNode; trailing?: ReactNode }) {
  const { closeSheet } = useUI();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Each step replaces the sheet's content; put focus somewhere predictable.
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), []);
  return (
    <>
      <div className="grabber" aria-hidden="true" />
      <div className="sheet-nav">
        {leading ?? <span />}
        <h2 className="sheet-title" id="sheet-title">
          {title}
        </h2>
        {trailing ?? (
          <button ref={closeRef} className="close-btn" type="button" aria-label="Close" onClick={closeSheet}>
            <span>
              <Icon name="close" />
            </span>
          </button>
        )}
      </div>
    </>
  );
}

function Summary({ face, price }: { face: number; price: number }) {
  return (
    <ul className="list summary" role="list">
      <li className="list-row">
        <span className="list-row-main">Face value</span>
        <span className="list-row-value tabular">{money(face)}</span>
      </li>
      <li className="list-row saving">
        <span className="list-row-main">You save</span>
        <span className="list-row-value tabular">−{money(face - price)}</span>
      </li>
      <li className="list-row total">
        <span className="list-row-main list-row-title">Total</span>
        <span className="list-row-value tabular">{money(price)}</span>
      </li>
    </ul>
  );
}

export function BagView() {
  const { closeSheet, showView, toast } = useUI();
  const bag = useStore((s) => s.bag);
  const t = totals(bag);

  if (!bag.length) {
    return (
      <>
        <SheetNav title="Bag" />
        <div className="sheet-body">
          <EmptyState
            icon="bag"
            title="Your Bag is empty"
            action={
              <Link className="btn btn-filled" href="/" onClick={closeSheet}>
                Discover Deals
              </Link>
            }
          >
            Add codes to buy several at once, or use Buy Now on any deal.
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <SheetNav title="Bag" />
      <div className="sheet-body">
        <h3 className="list-header">{plural(t.count, "item")}</h3>
        <ul className="list" role="list">
          {bag.map((l) => {
            const name = `${l.merchant} ${l.title}`;
            return (
              <li key={l.optionId} className="list-row line-item">
                <MerchantTile merchant={l.merchant} hue={l.hue} size="sm" />
                <div className="list-row-main">
                  <p className="headline">{name}</p>
                  <p className="list-row-sub">
                    {l.label} · {money(l.priceCents)} each
                  </p>
                  <div className="line-item-actions">
                    <div className="stepper" role="group" aria-label={`Quantity for ${name}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => setQty(l.optionId, l.qty - 1)}>
                        <Icon name="minus" />
                      </button>
                      <output aria-live="polite">{l.qty}</output>
                      <button type="button" aria-label="Increase quantity" disabled={l.qty >= MAX_QTY} onClick={() => setQty(l.optionId, l.qty + 1)}>
                        <Icon name="plus" />
                      </button>
                    </div>
                    <button
                      className="icon-btn remove-btn"
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => {
                        const removed = removeLine(l.optionId);
                        if (removed) toast(`Removed ${name}`, { label: "Undo", run: () => restoreLine(removed.line, removed.index) });
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <div className="line-item-price">
                  {money(l.priceCents * l.qty)}
                  <s>
                    <span className="visually-hidden">Face value </span>
                    {money(l.faceValueCents * l.qty)}
                  </s>
                </div>
              </li>
            );
          })}
        </ul>
        <h3 className="list-header">Summary</h3>
        <Summary face={t.face} price={t.price} />
      </div>
      <div className="sheet-foot">
        <button className="btn btn-filled btn-lg" type="button" onClick={() => showView({ step: "checkout", from: "bag", items: bag })}>
          Check Out
        </button>
      </div>
    </>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function emailError(value: string) {
  if (!value.trim()) return "Enter an email address so we can send your codes.";
  if (!EMAIL_RE.test(value.trim())) return "That email looks incomplete. Check for a missing “@” or domain, like name@example.com.";
  return "";
}

type Pay = "card" | "new";

export function CheckoutView({ view }: { view: Extract<SheetView, { step: "checkout" }> }) {
  const { showView, setBusy } = useUI();
  const storedEmail = useStore((s) => s.email);
  const [email, setEmail] = useState(storedEmail);
  const [pay, setPay] = useState<Pay>("card");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [processing, setProcessing] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const t = totals(view.items);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = emailError(email);
    if (err) {
      setFieldError(err);
      emailRef.current?.focus();
      return;
    }
    if (pay === "new") {
      setFormError("Adding a new card isn’t available yet. Choose the saved test card.");
      return;
    }
    setFormError("");
    setProcessing(true);
    setBusy(true);
    const result = await placeOrder({ email, items: view.items.map((i) => ({ optionId: i.optionId, qty: i.qty })) });
    setBusy(false);
    setProcessing(false);

    if (!result.ok) {
      if (result.field === "email") {
        setFieldError(result.message);
        emailRef.current?.focus();
      } else {
        setFormError(result.message);
      }
      return;
    }
    addCodes(result.codes);
    update(() => ({ email: result.email }));
    if (view.from === "bag") clearBag();
    showView({ step: "done", email: result.email, codes: result.codes });
  }

  return (
    <form className="sheet-form" onSubmit={onSubmit} noValidate aria-busy={processing}>
      <SheetNav
        title="Checkout"
        leading={
          view.from === "bag" ? (
            <button className="btn btn-plain" type="button" disabled={processing} onClick={() => showView({ step: "bag" })}>
              <Icon name="chevron-left" className="flip-rtl" />
              Bag
            </button>
          ) : undefined
        }
        trailing={processing ? <span /> : undefined}
      />
      <div className="sheet-body">
        <h3 className="list-header">Order</h3>
        <ul className="list" role="list">
          {view.items.map((l) => (
            <li key={l.optionId} className="list-row">
              <MerchantTile merchant={l.merchant} hue={l.hue} size="sm" />
              <span className="list-row-main">
                <span className="list-row-title">
                  {l.merchant} {l.title}
                </span>
                <span className="list-row-sub">
                  {l.label}
                  {l.qty > 1 && ` × ${l.qty}`}
                </span>
              </span>
              <span className="list-row-value tabular">{money(l.priceCents * l.qty)}</span>
            </li>
          ))}
        </ul>

        <h3 className="list-header">
          <label htmlFor="email">Deliver codes to</label>
        </h3>
        <div className="field">
          <input
            ref={emailRef}
            className="text-input"
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            value={email}
            disabled={processing}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby="email-msg"
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError && !emailError(e.target.value)) setFieldError("");
            }}
            onBlur={() => email && setFieldError(emailError(email))}
          />
          <div id="email-msg">
            {fieldError ? (
              <p className="field-error" role="alert">
                <Icon name="alert" />
                {fieldError}
              </p>
            ) : (
              <p className="field-help">We’ll email a copy of your codes. No account needed.</p>
            )}
          </div>
        </div>

        <h3 className="list-header" id="pay-h">
          Pay with <span className="badge badge-neutral">Test mode</span>
        </h3>
        <ul className="list" role="radiogroup" aria-labelledby="pay-h">
          {(
            [
              ["card", "card", 220, "Test card ending 4242", "No real payment is taken yet"],
              ["new", "plus", 0, "Add a new card", ""],
            ] as const
          ).map(([value, icon, hue, title, sub]) => (
            <li key={value}>
              <label className="list-row has-icon pay-option">
                <span className="row-icon" style={{ "--h": hue } as React.CSSProperties}>
                  <Icon name={icon} />
                </span>
                <span className="list-row-main">
                  <span className="list-row-title">{title}</span>
                  {sub && <span className="list-row-sub">{sub}</span>}
                </span>
                <input type="radio" name="pay" value={value} checked={pay === value} disabled={processing} onChange={() => setPay(value)} />
              </label>
            </li>
          ))}
        </ul>

        <h3 className="list-header">Summary</h3>
        <Summary face={t.face} price={t.price} />
      </div>
      <div className="sheet-foot">
        {formError && (
          <p className="field-error" role="alert">
            <Icon name="alert" />
            {formError}
          </p>
        )}
        <button className="btn btn-filled btn-lg" type="submit" disabled={processing}>
          {processing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              <Icon name="lock" />
              Pay {money(t.price)}
            </>
          )}
        </button>
        <p className="footnote secondary">
          <Icon name="shield" />
          Secure checkout · Full refund if a code doesn’t work
        </p>
      </div>
    </form>
  );
}

export function DoneView({ view }: { view: Extract<SheetView, { step: "done" }> }) {
  const { closeSheet } = useUI();
  const one = view.codes.length === 1;
  return (
    <>
      <SheetNav title="Order Complete" />
      <div className="sheet-body">
        <div className="success">
          <span className="success-mark" aria-hidden="true">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h3 className="title3">You’re all set</h3>
          <p>
            Your {one ? "code is" : "codes are"} ready. We’ll also email {one ? "it" : "them"} to {view.email}.
          </p>
        </div>
        <div className="new-codes">
          {view.codes.map((c) => (
            <div key={c.id} className="new-code">
              <div className="new-code-head">
                <MerchantTile merchant={c.merchant} hue={c.hue} size="sm" />
                <div>
                  <p className="headline">
                    {c.merchant} {c.title}
                  </p>
                  <p className="list-row-sub">
                    {c.label} · worth {money(c.faceValueCents)}
                  </p>
                </div>
              </div>
              <CodeField code={c.code} merchant={c.merchant} revealed />
            </div>
          ))}
        </div>
      </div>
      <div className="sheet-foot">
        <Link className="btn btn-filled btn-lg" href="/codes" onClick={closeSheet}>
          View My Codes
        </Link>
        <button className="btn btn-plain" type="button" onClick={closeSheet}>
          Done
        </button>
      </div>
    </>
  );
}

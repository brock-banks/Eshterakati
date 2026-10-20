"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createOrder } from "@/app/actions";
import { money, plural } from "@/lib/format";
import { clearBag, MAX_QTY, removeLine, restoreLine, saveOrder, setQty, update, useStore } from "@/lib/store";
import type { BagLine } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { MerchantTile } from "./MerchantTile";
import { useUI, type SheetView } from "./UIProvider";

const totals = (lines: BagLine[]) =>
  lines.reduce(
    (t, l) => ({
      price: t.price + l.priceMinor * l.qty,
      was: t.was + (l.compareAtMinor ?? l.priceMinor) * l.qty,
      count: t.count + l.qty,
    }),
    { price: 0, was: 0, count: 0 },
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

function Summary({ price, was }: { price: number; was: number }) {
  return (
    <ul className="list summary" role="list">
      {was > price && (
        <>
          <li className="list-row">
            <span className="list-row-main">Subtotal</span>
            <span className="list-row-value tabular">{money(was)}</span>
          </li>
          <li className="list-row saving">
            <span className="list-row-main">Sale discount</span>
            <span className="list-row-value tabular">−{money(was - price)}</span>
          </li>
        </>
      )}
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
                    {l.label} · {money(l.priceMinor)} each
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
                  {money(l.priceMinor * l.qty)}
                  {l.compareAtMinor && (
                    <s>
                      <span className="visually-hidden">Was </span>
                      {money(l.compareAtMinor * l.qty)}
                    </s>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <h3 className="list-header">Summary</h3>
        <Summary price={t.price} was={t.was} />
      </div>
      <div className="sheet-foot">
        <button className="btn btn-filled btn-lg" type="button" onClick={() => showView({ step: "checkout", from: "bag", items: bag })}>
          Check Out
        </button>
      </div>
    </>
  );
}

// Mirrors the backend rule: Sudanese mobile numbers, typed in any common form.
const PHONE_RE = /^(?:\+?249|00249|0)?[19]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneError(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  if (!digits) return "Enter your phone number so we can reach you about this order.";
  if (!PHONE_RE.test(digits)) return "Enter a Sudanese mobile number, like 0912 345 678.";
  return "";
}
function emailError(value: string) {
  if (!value.trim() || EMAIL_RE.test(value.trim())) return "";
  return "That email looks incomplete. Check for a missing “@” or domain, like name@example.com.";
}

type Errors = { phone?: string; email?: string; paymentMethod?: string; form?: string };

export function CheckoutView({ view }: { view: Extract<SheetView, { step: "checkout" }> }) {
  const { showView, setBusy, closeSheet, paymentMethods } = useUI();
  const router = useRouter();
  const storedPhone = useStore((s) => s.phone);
  const storedEmail = useStore((s) => s.email);
  const [phone, setPhone] = useState(storedPhone);
  const [email, setEmail] = useState(storedEmail);
  const [method, setMethod] = useState(paymentMethods[0]?.key ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [processing, setProcessing] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const t = totals(view.items);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = { phone: phoneError(phone) || undefined, email: emailError(email) || undefined };
    if (!method) next.paymentMethod = "Choose how you’ll pay.";
    if (next.phone || next.email || next.paymentMethod) {
      setErrors(next);
      (next.phone ? phoneRef : emailRef).current?.focus();
      return;
    }

    setErrors({});
    setProcessing(true);
    setBusy(true);
    const result = await createOrder({ phone, email, paymentMethod: method, items: view.items.map((i) => ({ optionId: i.optionId, qty: i.qty })) });
    setBusy(false);

    if (!result.ok) {
      setProcessing(false);
      const f = result.fields ?? {};
      setErrors({ phone: f.phone, email: f.email, paymentMethod: f.paymentMethod, form: f.phone || f.email ? undefined : result.message });
      if (f.phone) phoneRef.current?.focus();
      else if (f.email) emailRef.current?.focus();
      return;
    }

    const { order, token } = result;
    saveOrder({ id: order.id, token: token!, reference: order.reference, totalMinor: order.totalMinor, createdAt: order.createdAt, status: order.status });
    update(() => ({ phone, email }));
    if (view.from === "bag") clearBag();
    router.push(`/orders/${order.id}`);
    closeSheet();
  }

  const fieldError = (id: string, message?: string) =>
    message ? (
      <p className="field-error" id={id} role="alert">
        <Icon name="alert" />
        {message}
      </p>
    ) : null;

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
              <span className="list-row-value tabular">{money(l.priceMinor * l.qty)}</span>
            </li>
          ))}
        </ul>

        <h3 className="list-header">Your details</h3>
        <div className="field-stack">
          <div className="field">
            <label className="field-label" htmlFor="phone">
              Phone <span className="secondary">(WhatsApp)</span>
            </label>
            <input
              ref={phoneRef}
              className="text-input tabular"
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              dir="ltr"
              required
              value={phone}
              disabled={processing}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "phone-error" : "phone-help"}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone && !phoneError(e.target.value)) setErrors((x) => ({ ...x, phone: undefined }));
              }}
              onBlur={() => phone && setErrors((x) => ({ ...x, phone: phoneError(phone) || undefined }))}
            />
            {fieldError("phone-error", errors.phone) ?? (
              <p className="field-help" id="phone-help">
                Only used if there’s a problem with your payment.
              </p>
            )}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="email">
              Email <span className="secondary">(optional)</span>
            </label>
            <input
              ref={emailRef}
              className="text-input"
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              disabled={processing}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : "email-help"}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email && !emailError(e.target.value)) setErrors((x) => ({ ...x, email: undefined }));
              }}
              onBlur={() => setErrors((x) => ({ ...x, email: emailError(email) || undefined }))}
            />
            {fieldError("email-error", errors.email) ?? (
              <p className="field-help" id="email-help">
                We’ll email the payment details and your codes. No account needed.
              </p>
            )}
          </div>
        </div>

        <h3 className="list-header" id="pay-h">
          Pay by bank transfer
        </h3>
        {paymentMethods.length ? (
          <ul className="list" role="radiogroup" aria-labelledby="pay-h" aria-describedby="pay-help">
            {paymentMethods.map((m, i) => (
              <li key={m.key}>
                <label className="list-row has-icon pay-option">
                  <span className="row-icon" style={{ "--h": [205, 150, 28][i % 3] } as CSSProperties}>
                    <Icon name="wallet" />
                  </span>
                  <span className="list-row-main">
                    <span className="list-row-title">{m.name}</span>
                    <span className="list-row-sub">{m.provider}</span>
                  </span>
                  <input type="radio" name="pay" value={m.key} checked={method === m.key} disabled={processing} onChange={() => setMethod(m.key)} />
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-error" role="alert">
            <Icon name="alert" />
            Payments aren’t set up yet. Please try again later.
          </p>
        )}
        <p className="list-footer" id="pay-help">
          Next, you’ll see the account details. Transfer from your banking app, then upload a screenshot of the receipt.
        </p>
        {fieldError("pay-error", errors.paymentMethod)}

        <h3 className="list-header">Summary</h3>
        <Summary price={t.price} was={t.was} />
      </div>
      <div className="sheet-foot">
        {errors.form && (
          <p className="field-error" role="alert">
            <Icon name="alert" />
            {errors.form}
          </p>
        )}
        <button className="btn btn-filled btn-lg" type="submit" disabled={processing || !paymentMethods.length}>
          {processing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Reserving your codes…
            </>
          ) : (
            <>Place Order · {money(t.price)}</>
          )}
        </button>
        <p className="footnote secondary">
          <Icon name="lock" />
          Your codes are held for you while you pay
        </p>
      </div>
    </form>
  );
}

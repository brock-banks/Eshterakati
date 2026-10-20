"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createOrder } from "@/app/actions";
import type { Dictionary } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { dict } = useI18n();
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
          <button ref={closeRef} className="close-btn" type="button" aria-label={dict.common.close} onClick={closeSheet}>
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
  const { dict: d, fmt } = useI18n();
  return (
    <ul className="list summary" role="list">
      {was > price && (
        <>
          <li className="list-row">
            <span className="list-row-main">{d.bag.subtotal}</span>
            <span className="list-row-value tabular">{fmt.money(was)}</span>
          </li>
          <li className="list-row saving">
            <span className="list-row-main">{d.bag.saleDiscount}</span>
            <span className="list-row-value tabular">−{fmt.money(was - price)}</span>
          </li>
        </>
      )}
      <li className="list-row total">
        <span className="list-row-main list-row-title">{d.common.total}</span>
        <span className="list-row-value tabular">{fmt.money(price)}</span>
      </li>
    </ul>
  );
}

export function BagView() {
  const { closeSheet, showView, toast } = useUI();
  const { dict: d, t, plural, fmt, href } = useI18n();
  const bag = useStore((s) => s.bag);
  const total = totals(bag);

  if (!bag.length) {
    return (
      <>
        <SheetNav title={d.bag.title} />
        <div className="sheet-body">
          <EmptyState
            icon="bag"
            title={d.bag.emptyTitle}
            action={
              <Link className="btn btn-filled" href={href("/")} onClick={closeSheet}>
                {d.bag.discover}
              </Link>
            }
          >
            {d.bag.emptyBody}
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <SheetNav title={d.bag.title} />
      <div className="sheet-body">
        <h3 className="list-header">{plural(d.plurals.items, total.count)}</h3>
        <ul className="list" role="list">
          {bag.map((l) => {
            const name = `${l.merchant} ${l.title}`;
            return (
              <li key={l.optionId} className="list-row line-item">
                <MerchantTile merchant={l.merchant} hue={l.hue} size="sm" />
                <div className="list-row-main">
                  <p className="headline">{name}</p>
                  <p className="list-row-sub">{t(d.bag.each, { label: l.label, price: fmt.money(l.priceMinor) })}</p>
                  <div className="line-item-actions">
                    <div className="stepper" role="group" aria-label={t(d.bag.quantityFor, { name })}>
                      <button type="button" aria-label={d.bag.decrease} disabled={l.qty <= 1} onClick={() => setQty(l.optionId, l.qty - 1)}>
                        <Icon name="minus" />
                      </button>
                      <output aria-live="polite">{l.qty}</output>
                      <button type="button" aria-label={d.bag.increase} disabled={l.qty >= MAX_QTY} onClick={() => setQty(l.optionId, l.qty + 1)}>
                        <Icon name="plus" />
                      </button>
                    </div>
                    <button
                      className="icon-btn remove-btn"
                      type="button"
                      aria-label={t(d.bag.remove, { name })}
                      onClick={() => {
                        const removed = removeLine(l.optionId);
                        if (removed) toast(t(d.bag.removed, { name }), { label: d.common.undo, run: () => restoreLine(removed.line, removed.index) });
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <div className="line-item-price">
                  {fmt.money(l.priceMinor * l.qty)}
                  {l.compareAtMinor && (
                    <s>
                      <span className="visually-hidden">{d.common.was} </span>
                      {fmt.money(l.compareAtMinor * l.qty)}
                    </s>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <h3 className="list-header">{d.bag.summary}</h3>
        <Summary price={total.price} was={total.was} />
      </div>
      <div className="sheet-foot">
        <button className="btn btn-filled btn-lg" type="button" onClick={() => showView({ step: "checkout", from: "bag", items: bag })}>
          {d.bag.checkout}
        </button>
      </div>
    </>
  );
}

// Mirrors the backend rule: Sudanese mobile numbers, typed in any common form.
const PHONE_RE = /^(?:\+?249|00249|0)?[19]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneError(value: string, d: Dictionary) {
  const digits = value.replace(/[\s-]/g, "");
  if (!digits) return d.checkout.phoneRequired;
  if (!PHONE_RE.test(digits)) return d.checkout.phoneInvalid;
  return "";
}
function emailError(value: string, d: Dictionary) {
  if (!value.trim() || EMAIL_RE.test(value.trim())) return "";
  return d.checkout.emailInvalid;
}

type Errors = { phone?: string; email?: string; paymentMethod?: string; form?: string };

export function CheckoutView({ view }: { view: Extract<SheetView, { step: "checkout" }> }) {
  const { showView, setBusy, closeSheet, paymentMethods } = useUI();
  const { dict: d, t, fmt, href, lang } = useI18n();
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
  const total = totals(view.items);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = { phone: phoneError(phone, d) || undefined, email: emailError(email, d) || undefined };
    if (!method) next.paymentMethod = d.checkout.chooseMethod;
    if (next.phone || next.email || next.paymentMethod) {
      setErrors(next);
      (next.phone ? phoneRef : emailRef).current?.focus();
      return;
    }

    setErrors({});
    setProcessing(true);
    setBusy(true);
    const result = await createOrder({ lang, phone, email, paymentMethod: method, items: view.items.map((i) => ({ optionId: i.optionId, qty: i.qty })) });
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
    router.push(href(`/orders/${order.id}`));
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
        title={d.checkout.title}
        leading={
          view.from === "bag" ? (
            <button className="btn btn-plain" type="button" disabled={processing} onClick={() => showView({ step: "bag" })}>
              <Icon name="chevron-left" className="flip-rtl" />
              {d.checkout.back}
            </button>
          ) : undefined
        }
        trailing={processing ? <span /> : undefined}
      />
      <div className="sheet-body">
        <h3 className="list-header">{d.checkout.order}</h3>
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
              <span className="list-row-value tabular">{fmt.money(l.priceMinor * l.qty)}</span>
            </li>
          ))}
        </ul>

        <h3 className="list-header">{d.checkout.details}</h3>
        <div className="field-stack">
          <div className="field">
            <label className="field-label" htmlFor="phone">
              {d.checkout.phone} <span className="secondary">{d.checkout.whatsapp}</span>
            </label>
            <input
              ref={phoneRef}
              className="text-input tabular"
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={d.checkout.phonePlaceholder}
              dir="ltr"
              required
              value={phone}
              disabled={processing}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "phone-error" : "phone-help"}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone && !phoneError(e.target.value, d)) setErrors((x) => ({ ...x, phone: undefined }));
              }}
              onBlur={() => phone && setErrors((x) => ({ ...x, phone: phoneError(phone, d) || undefined }))}
            />
            {fieldError("phone-error", errors.phone) ?? (
              <p className="field-help" id="phone-help">
                {d.checkout.phoneHelp}
              </p>
            )}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="email">
              {d.checkout.email} <span className="secondary">{d.checkout.optional}</span>
            </label>
            <input
              ref={emailRef}
              className="text-input"
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              dir="ltr"
              value={email}
              disabled={processing}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : "email-help"}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email && !emailError(e.target.value, d)) setErrors((x) => ({ ...x, email: undefined }));
              }}
              onBlur={() => setErrors((x) => ({ ...x, email: emailError(email, d) || undefined }))}
            />
            {fieldError("email-error", errors.email) ?? (
              <p className="field-help" id="email-help">
                {d.checkout.emailHelp}
              </p>
            )}
          </div>
        </div>

        <h3 className="list-header" id="pay-h">
          {d.checkout.payTitle}
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
            {d.checkout.notSetUp}
          </p>
        )}
        <p className="list-footer" id="pay-help">
          {d.checkout.payHelp}
        </p>
        {fieldError("pay-error", errors.paymentMethod)}

        <h3 className="list-header">{d.bag.summary}</h3>
        <Summary price={total.price} was={total.was} />
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
              {d.checkout.reserving}
            </>
          ) : (
            t(d.checkout.placeOrder, { total: fmt.money(total.price) })
          )}
        </button>
        <p className="footnote secondary">
          <Icon name="lock" />
          {d.checkout.held}
        </p>
      </div>
    </form>
  );
}

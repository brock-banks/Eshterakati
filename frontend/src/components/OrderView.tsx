"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getOrder, submitReceipt, type OrderResult } from "@/app/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { useNow } from "@/lib/clock";
import { remaining } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { saveOrder, syncOrder, useStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import { CodeField } from "./CodeField";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { MerchantTile } from "./MerchantTile";
import { useUI } from "./UIProvider";

const POLL_MS = 15_000;

export function OrderView({ id }: { id: string }) {
  const router = useRouter();
  const { dict: d, t, href, lang } = useI18n();
  const linkToken = useSearchParams().get("t");
  const saved = useStore((s) => s.orders.find((o) => o.id === id));
  const token = saved?.token ?? linkToken;
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const status = order?.status;

  // The heading names the current step; focus it when the order loads or moves on, so it's announced.
  useEffect(() => {
    if (status) headingRef.current?.focus();
  }, [status]);

  const apply = useCallback((result: OrderResult) => {
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    setOrder(result.order);
    syncOrder(result.order);
  }, []);

  const load = useCallback(async () => {
    if (token) apply(await getOrder(id, token, lang));
  }, [id, token, lang, apply]);

  // Opened from an email link: remember the order on this device, then drop the token from the address bar.
  useEffect(() => {
    if (!order || saved || !linkToken) return;
    saveOrder({ id, token: linkToken, reference: order.reference, totalMinor: order.totalMinor, createdAt: order.createdAt, status: order.status });
    router.replace(href(`/orders/${id}`));
  }, [order, saved, linkToken, id, router, href]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    getOrder(id, token, lang).then((result) => live && apply(result));
    return () => {
      live = false;
    };
  }, [id, token, lang, apply]);

  // Keep the page current while it's waiting on the shopper or on us.
  const waiting = order?.status === "in_review" || order?.status === "awaiting_payment";
  useEffect(() => {
    if (!waiting) return;
    const tick = () => document.visibilityState === "visible" && void load();
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [waiting, load]);

  if (!token) {
    return (
      <EmptyState
        icon="ticket"
        title={d.order.noTokenTitle}
        action={
          <Link className="btn btn-filled" href={href("/codes")}>
            {d.order.goToCodes}
          </Link>
        }
      >
        {d.order.noTokenBody}
      </EmptyState>
    );
  }

  if (!order) {
    return error ? (
      <EmptyState
        icon="alert"
        title={d.order.loadErrorTitle}
        action={
          <button className="btn btn-filled" type="button" onClick={() => void load()}>
            {d.common.tryAgain}
          </button>
        }
      >
        {error}
      </EmptyState>
    ) : (
      <OrderSkeleton />
    );
  }

  return (
    <>
      <header className="page-head" style={{ paddingBlockEnd: "var(--s-2)" }}>
        <p className="eyebrow">{t(d.order.eyebrow, { reference: order.reference })}</p>
        <h1 ref={headingRef} className="large-title" tabIndex={-1}>
          {d.order.heading[order.status]}
        </h1>
      </header>
      <Progress status={order.status} />
      {error && (
        <p className="callout callout-warning" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      <div className="order-layout">
        <div className="order-main">
          {order.status === "awaiting_payment" && (
            <PayStep
              order={order}
              token={token}
              onSubmitted={(o) => {
                setOrder(o);
                syncOrder(o);
              }}
            />
          )}
          {order.status === "in_review" && <ReviewStep order={order} />}
          {order.status === "paid" && <PaidStep order={order} />}
          {(order.status === "expired" || order.status === "cancelled") && <ExpiredStep />}
        </div>
        <OrderSummary order={order} />
      </div>
    </>
  );
}

function Progress({ status }: { status: Order["status"] }) {
  const { dict: d } = useI18n();
  const current = { awaiting_payment: 1, in_review: 2, paid: 4, expired: -1, cancelled: -1 }[status];
  if (current < 0) return null;
  return (
    <ol className="progress" aria-label={d.order.progressLabel}>
      {d.order.steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`progress-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="progress-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" /> : i + 1}
            </span>
            <span className="progress-label">
              {label}
              <span className="visually-hidden"> {state === "done" ? d.order.stepDone : state === "current" ? d.order.stepCurrent : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyRow({ label, value, display, hint }: { label: string; value: string; display?: string; hint?: string }) {
  const { toast } = useUI();
  const { dict: d, t } = useI18n();
  return (
    <li className="list-row copy-row">
      <span className="list-row-main">
        <span className="list-row-sub">{label}</span>
        {/* "auto": account numbers and references stay LTR, an Arabic currency amount stays RTL. */}
        <bdi className="copy-value tabular" dir="auto">
          {display ?? value}
        </bdi>
        {hint && <span className="list-row-sub">{hint}</span>}
      </span>
      <button
        className="btn btn-tinted btn-sm"
        type="button"
        aria-label={t(d.order.copyLabel, { label })}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast(t(d.order.copied, { label }));
          } catch {
            toast(d.order.copyFailed);
          }
        }}
      >
        <Icon name="copy" />
        <span className="copy-label">{d.common.copy}</span>
      </button>
    </li>
  );
}

function PayStep({ order, token, onSubmitted }: { order: Order; token: string; onSubmitted: (o: Order) => void }) {
  const { dict: d, t, fmt } = useI18n();
  const now = useNow();
  const pounds = String(Math.round(order.totalMinor / 100));
  const p = order.payment;

  return (
    <>
      {order.rejectionReason && (
        <div className="callout callout-warning" role="alert">
          <Icon name="alert" />
          <div>
            <p className="headline">{d.order.rejectedTitle}</p>
            <p>{order.rejectionReason}</p>
          </div>
        </div>
      )}
      {order.expiresAt && (
        <p className="deadline">
          <Icon name="clock" />
          <span>
            {t(d.order.heldUntil, { time: fmt.clockTime(order.expiresAt) })}
            {now !== null && <span className="secondary"> · {remaining(order.expiresAt, now, d)}</span>}
          </span>
        </p>
      )}

      <section aria-labelledby="transfer-h">
        <h2 className="list-header" id="transfer-h">
          {t(d.order.transferWith, { method: p.name })}
        </h2>
        <ul className="list" role="list">
          <CopyRow label={d.order.amount} value={pounds} display={fmt.money(order.totalMinor)} hint={d.order.amountHint} />
          {p.accountNumber && (
            <CopyRow label={d.order.accountNumber} value={p.accountNumber} hint={[p.accountName, p.provider].filter(Boolean).join(" · ")} />
          )}
          <CopyRow label={d.order.reference} value={order.reference} hint={d.order.referenceHint} />
        </ul>
      </section>

      <section aria-labelledby="upload-h">
        <h2 className="list-header" id="upload-h">
          {d.order.uploadTitle}
        </h2>
        <ReceiptForm order={order} token={token} onSubmitted={onSubmitted} />
      </section>
    </>
  );
}

function ReceiptForm({ order, token, onSubmitted }: { order: Order; token: string; onSubmitted: (o: Order) => void }) {
  const { dict: d, lang } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<{ receipt?: string; reference?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      receipt: file ? undefined : d.order.receiptRequired,
      reference: reference.trim().length >= 4 ? undefined : d.order.referenceRequired,
    };
    if (next.receipt || next.reference) {
      setErrors(next);
      (next.receipt ? fileRef : refInput).current?.focus();
      return;
    }

    setSending(true);
    setErrors({});
    const form = new FormData();
    form.set("lang", lang);
    form.set("id", order.id);
    form.set("token", token);
    form.set("receipt", await compressImage(file!));
    form.set("transaction_reference", reference.trim());
    const result = await submitReceipt(form);
    setSending(false);

    if (!result.ok) {
      setErrors({
        receipt: result.fields?.receipt,
        reference: result.fields?.transactionReference,
        form: result.fields?.receipt || result.fields?.transactionReference ? undefined : result.message,
      });
      return;
    }
    onSubmitted(result.order);
  }

  return (
    <form className="receipt-form" onSubmit={onSubmit} noValidate aria-busy={sending}>
      <input
        ref={fileRef}
        id="receipt"
        className="visually-hidden"
        type="file"
        accept="image/*"
        aria-describedby={errors.receipt ? "receipt-error" : "receipt-help"}
        aria-invalid={errors.receipt ? true : undefined}
        disabled={sending}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          setFile(picked);
          setPreview(picked ? URL.createObjectURL(picked) : null);
          if (picked) setErrors((x) => ({ ...x, receipt: undefined }));
        }}
      />
      {preview ? (
        <div className="receipt-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={preview} alt={d.order.receiptAlt} />
          <label htmlFor="receipt" className="btn btn-gray btn-sm">
            {d.order.change}
          </label>
        </div>
      ) : (
        <label htmlFor="receipt" className={`receipt-drop${errors.receipt ? " is-invalid" : ""}`}>
          <span className="receipt-drop-icon" aria-hidden="true">
            <Icon name="doc" />
          </span>
          <span className="headline">{d.order.addScreenshot}</span>
          <span className="list-row-sub" id="receipt-help">
            {d.order.addScreenshotHint}
          </span>
        </label>
      )}
      {errors.receipt && (
        <p className="field-error" id="receipt-error" role="alert">
          <Icon name="alert" />
          {errors.receipt}
        </p>
      )}

      <div className="field">
        <label className="field-label" htmlFor="txn">
          {d.order.txnLabel}
        </label>
        <input
          ref={refInput}
          id="txn"
          className="text-input tabular"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={d.order.txnPlaceholder}
          value={reference}
          disabled={sending}
          aria-invalid={errors.reference ? true : undefined}
          aria-describedby={errors.reference ? "txn-error" : "txn-help"}
          onChange={(e) => {
            setReference(e.target.value);
            if (errors.reference && e.target.value.trim().length >= 4) setErrors((x) => ({ ...x, reference: undefined }));
          }}
        />
        {errors.reference ? (
          <p className="field-error" id="txn-error" role="alert">
            <Icon name="alert" />
            {errors.reference}
          </p>
        ) : (
          <p className="field-help" id="txn-help">
            {d.order.txnHelp}
          </p>
        )}
      </div>

      {errors.form && (
        <p className="field-error" role="alert">
          <Icon name="alert" />
          {errors.form}
        </p>
      )}
      <button className="btn btn-filled btn-lg" type="submit" disabled={sending}>
        {sending ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {d.order.uploading}
          </>
        ) : (
          d.order.submit
        )}
      </button>
    </form>
  );
}

function ReviewStep({ order }: { order: Order }) {
  const { dict: d, t, href } = useI18n();
  return (
    <div className="status-card">
      <span className="status-icon is-waiting" aria-hidden="true">
        <Icon name="clock" />
      </span>
      <h2 className="title3">{d.order.reviewTitle}</h2>
      <p>{t(d.order.reviewBody, { time: order.reviewTime })}</p>
      <p className="footnote secondary">{d.order.reviewClose}</p>
      <Link className="btn btn-tinted" href={href("/codes")}>
        {d.order.goToCodes}
      </Link>
    </div>
  );
}

function PaidStep({ order }: { order: Order }) {
  const { dict: d, href } = useI18n();
  return (
    <>
      <div className="success" style={{ paddingBlockStart: 0 }}>
        <span className="success-mark" aria-hidden="true">
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p>{d.order.paidBody}</p>
      </div>
      <div className="new-codes">
        {order.items.flatMap((item) =>
          item.codes.map((c) => (
            <div key={c.id} className="new-code">
              <div className="new-code-head">
                <MerchantTile merchant={item.merchant} hue={item.hue} size="sm" />
                <div>
                  <p className="headline">
                    {item.merchant} {item.title}
                  </p>
                  <p className="list-row-sub">{item.label}</p>
                </div>
              </div>
              <CodeField code={c.code} merchant={item.merchant} revealed />
            </div>
          )),
        )}
      </div>
      <Link className="btn btn-filled btn-lg" href={href("/codes")} style={{ marginBlockStart: "var(--s-6)" }}>
        {d.order.viewInCodes}
      </Link>
    </>
  );
}

function ExpiredStep() {
  const { dict: d, href } = useI18n();
  return (
    <div className="status-card">
      <span className="status-icon" aria-hidden="true">
        <Icon name="clock" />
      </span>
      <h2 className="title3">{d.order.expiredTitle}</h2>
      <p>{d.order.expiredBody}</p>
      <Link className="btn btn-filled" href={href("/")}>
        {d.order.browseDeals}
      </Link>
    </div>
  );
}

function OrderSummary({ order }: { order: Order }) {
  const { dict: d, fmt } = useI18n();
  return (
    <aside className="order-summary" aria-labelledby="summary-h">
      <h2 className="list-header" id="summary-h">
        {d.order.summary}
      </h2>
      <ul className="list" role="list">
        {order.items.map((item) => (
          <li key={item.optionId} className="list-row">
            <MerchantTile merchant={item.merchant} hue={item.hue} size="sm" />
            <span className="list-row-main">
              <span className="list-row-title">
                {item.merchant} {item.title}
              </span>
              <span className="list-row-sub">
                {item.label}
                {item.quantity > 1 && ` × ${item.quantity}`}
              </span>
            </span>
            <span className="list-row-value tabular">{fmt.money(item.unitPriceMinor * item.quantity)}</span>
          </li>
        ))}
        <li className="list-row total" style={{ "--row-inset": "16px" } as CSSProperties}>
          <span className="list-row-main headline">{d.common.total}</span>
          <span className="list-row-value tabular headline" style={{ color: "var(--label)" }}>
            {fmt.money(order.totalMinor)}
          </span>
        </li>
      </ul>
    </aside>
  );
}

function OrderSkeleton() {
  return (
    <div aria-hidden="true" style={{ paddingBlockStart: "var(--s-6)" }}>
      <div className="skeleton skeleton-text" style={{ width: 120 }} />
      <div className="skeleton" style={{ height: 40, width: "60%", marginBlock: "var(--s-2) var(--s-6)" }} />
      <div className="skeleton" style={{ height: 220 }} />
    </div>
  );
}

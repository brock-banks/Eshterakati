"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getOrder, submitReceipt } from "@/app/actions";
import { useNow } from "@/lib/clock";
import { clockTime, money, remaining } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { saveOrder, syncOrder, useStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import type { OrderResult } from "@/app/actions";
import { CodeField } from "./CodeField";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { MerchantTile } from "./MerchantTile";
import { useUI } from "./UIProvider";

const POLL_MS = 15_000;

export function OrderView({ id }: { id: string }) {
  const router = useRouter();
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
    if (token) apply(await getOrder(id, token));
  }, [id, token, apply]);

  // Opened from an email link: remember the order on this device, then drop the token from the address bar.
  useEffect(() => {
    if (!order || saved || !linkToken) return;
    saveOrder({ id, token: linkToken, reference: order.reference, totalMinor: order.totalMinor, createdAt: order.createdAt, status: order.status });
    router.replace(`/orders/${id}`);
  }, [order, saved, linkToken, id, router]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    getOrder(id, token).then((result) => live && apply(result));
    return () => {
      live = false;
    };
  }, [id, token, apply]);

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
        title="Open this order from its link"
        action={
          <Link className="btn btn-filled" href="/codes">
            Go to My Codes
          </Link>
        }
      >
        For your security, orders open only on the device you used to buy, or from the link in your email.
      </EmptyState>
    );
  }

  if (!order) {
    return error ? (
      <EmptyState
        icon="alert"
        title="We couldn’t load this order"
        action={
          <button className="btn btn-filled" type="button" onClick={() => void load()}>
            Try Again
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
        <p className="eyebrow">Order {order.reference}</p>
        <h1 ref={headingRef} className="large-title" tabIndex={-1}>
          {HEADINGS[order.status]}
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
          {order.status === "awaiting_payment" && <PayStep order={order} token={token} onSubmitted={(o) => { setOrder(o); syncOrder(o); }} />}
          {order.status === "in_review" && <ReviewStep order={order} />}
          {order.status === "paid" && <PaidStep order={order} />}
          {(order.status === "expired" || order.status === "cancelled") && <ExpiredStep />}
        </div>
        <OrderSummary order={order} />
      </div>
    </>
  );
}

const HEADINGS: Record<Order["status"], string> = {
  awaiting_payment: "Complete your payment",
  in_review: "Checking your payment",
  paid: "Your codes are ready",
  expired: "This order expired",
  cancelled: "This order was cancelled",
};

function Progress({ status }: { status: Order["status"] }) {
  const steps = ["Order placed", "Transfer & upload", "We confirm", "Get your codes"];
  const current = { awaiting_payment: 1, in_review: 2, paid: 4, expired: -1, cancelled: -1 }[status];
  if (current < 0) return null;
  return (
    <ol className="progress" aria-label="Order progress">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`progress-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="progress-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" /> : i + 1}
            </span>
            <span className="progress-label">
              {label}
              <span className="visually-hidden">{state === "done" ? " (done)" : state === "current" ? " (current step)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyRow({ label, value, display, hint }: { label: string; value: string; display?: string; hint?: string }) {
  const { toast } = useUI();
  return (
    <li className="list-row copy-row">
      <span className="list-row-main">
        <span className="list-row-sub">{label}</span>
        <span className="copy-value tabular" dir="ltr">
          {display ?? value}
        </span>
        {hint && <span className="list-row-sub">{hint}</span>}
      </span>
      <button
        className="btn btn-tinted btn-sm"
        type="button"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast(`${label} copied`);
          } catch {
            toast("Couldn’t copy. Select the text and copy it instead.");
          }
        }}
      >
        <Icon name="copy" />
        <span className="copy-label">Copy</span>
      </button>
    </li>
  );
}

function PayStep({ order, token, onSubmitted }: { order: Order; token: string; onSubmitted: (o: Order) => void }) {
  const now = useNow();
  const pounds = String(Math.round(order.totalMinor / 100));
  const p = order.payment;

  return (
    <>
      {order.rejectionReason && (
        <div className="callout callout-warning" role="alert">
          <Icon name="alert" />
          <div>
            <p className="headline">We couldn’t confirm your last receipt</p>
            <p>{order.rejectionReason}</p>
          </div>
        </div>
      )}
      {order.expiresAt && (
        <p className="deadline">
          <Icon name="clock" />
          <span>
            Your codes are held until <strong>{clockTime(order.expiresAt)}</strong>
            {now !== null && <span className="secondary"> · {remaining(order.expiresAt, now)}</span>}
          </span>
        </p>
      )}

      <section aria-labelledby="transfer-h">
        <h2 className="list-header" id="transfer-h">
          1. Transfer with {p.name}
        </h2>
        <ul className="list" role="list">
          <CopyRow label="Amount" value={pounds} display={money(order.totalMinor)} hint="Send exactly this amount." />
          {p.accountNumber && <CopyRow label="Account number" value={p.accountNumber} hint={[p.accountName, p.provider].filter(Boolean).join(" · ")} />}
          <CopyRow label="Reference" value={order.reference} hint="Write this in the transfer note (التعليق)." />
        </ul>
      </section>

      <section aria-labelledby="upload-h">
        <h2 className="list-header" id="upload-h">
          2. Upload the receipt
        </h2>
        <ReceiptForm order={order} token={token} onSubmitted={onSubmitted} />
      </section>
    </>
  );
}

function ReceiptForm({ order, token, onSubmitted }: { order: Order; token: string; onSubmitted: (o: Order) => void }) {
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
      receipt: file ? undefined : "Add a screenshot or photo of your transfer receipt.",
      reference: reference.trim().length >= 4 ? undefined : "Enter the transaction number shown on the receipt.",
    };
    if (next.receipt || next.reference) {
      setErrors(next);
      (next.receipt ? fileRef : refInput).current?.focus();
      return;
    }

    setSending(true);
    setErrors({});
    const form = new FormData();
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
          <img src={preview} alt="Your receipt" />
          <label htmlFor="receipt" className="btn btn-gray btn-sm">
            Change
          </label>
        </div>
      ) : (
        <label htmlFor="receipt" className={`receipt-drop${errors.receipt ? " is-invalid" : ""}`}>
          <span className="receipt-drop-icon" aria-hidden="true">
            <Icon name="doc" />
          </span>
          <span className="headline">Add receipt screenshot</span>
          <span className="list-row-sub" id="receipt-help">
            Take a screenshot in your banking app after the transfer
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
          Transaction number
        </label>
        <input
          ref={refInput}
          id="txn"
          className="text-input tabular"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. 2026102012345678"
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
            Shown on the receipt as “رقم العملية” or “Transaction ID”.
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
            Uploading…
          </>
        ) : (
          "Submit Receipt"
        )}
      </button>
    </form>
  );
}

function ReviewStep({ order }: { order: Order }) {
  return (
    <div className="status-card">
      <span className="status-icon is-waiting" aria-hidden="true">
        <Icon name="clock" />
      </span>
      <h2 className="title3">We’re checking your transfer</h2>
      <p>
        We confirm every payment in our account before releasing codes — {order.reviewTime}. This page updates by itself.
      </p>
      <p className="footnote secondary">
        You can close this page. Your codes will appear here and in My Codes, and we’ll email them if you gave us your address.
      </p>
      <Link className="btn btn-tinted" href="/codes">
        Go to My Codes
      </Link>
    </div>
  );
}

function PaidStep({ order }: { order: Order }) {
  return (
    <>
      <div className="success" style={{ paddingBlockStart: 0 }}>
        <span className="success-mark" aria-hidden="true">
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p>Payment confirmed. Copy a code and redeem it with the merchant. Each code works once.</p>
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
      <Link className="btn btn-filled btn-lg" href="/codes" style={{ marginBlockStart: "var(--s-6)" }}>
        View in My Codes
      </Link>
    </>
  );
}

function ExpiredStep() {
  return (
    <div className="status-card">
      <span className="status-icon" aria-hidden="true">
        <Icon name="clock" />
      </span>
      <h2 className="title3">No receipt arrived in time</h2>
      <p>The codes we held for you went back on sale. If you already transferred the money, contact us with your receipt and we’ll sort it out.</p>
      <Link className="btn btn-filled" href="/">
        Browse Deals
      </Link>
    </div>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <aside className="order-summary" aria-labelledby="summary-h">
      <h2 className="list-header" id="summary-h">
        Order summary
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
            <span className="list-row-value tabular">{money(item.unitPriceMinor * item.quantity)}</span>
          </li>
        ))}
        <li className="list-row total" style={{ "--row-inset": "16px" } as CSSProperties}>
          <span className="list-row-main headline">Total</span>
          <span className="list-row-value tabular headline" style={{ color: "var(--label)" }}>
            {money(order.totalMinor)}
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

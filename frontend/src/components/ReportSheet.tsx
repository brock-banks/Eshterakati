"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { reportProblem } from "@/app/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { compressImage } from "@/lib/image";
import { syncOrder, useStore } from "@/lib/store";
import type { OwnedCode, ReportReason } from "@/lib/types";
import { SheetNav } from "./CheckoutSheet";
import { Icon } from "./Icon";
import { MerchantTile } from "./MerchantTile";
import { useUI } from "./UIProvider";

const REASONS: ReportReason[] = ["invalid", "already_used", "wrong_region", "other"];

type Errors = Partial<Record<"reason" | "details" | "screenshot" | "refundMethod" | "accountNumber" | "accountName" | "form", string>>;

/** "This code doesn't work": pick what happened, then a replacement or a refund. */
export function ReportView({ code }: { code: OwnedCode }) {
  const { closeSheet, setBusy, paymentMethods } = useUI();
  const { dict: d, t, fmt, lang } = useI18n();
  const token = useStore((s) => s.orders.find((o) => o.id === code.orderId)?.token);

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preference, setPreference] = useState<"replacement" | "refund">("replacement");
  const [method, setMethod] = useState(paymentMethods[0]?.key ?? "");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ responseTime: string } | null>(null);
  const firstReason = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Reporting closes 30 days after purchase (the server enforces it too).
  const [openedAt] = useState(() => Date.now());
  const closed = code.reportableUntil ? new Date(code.reportableUntil).getTime() < openedAt : false;

  if (closed || !token) {
    return (
      <>
        <SheetNav title={d.report.title} />
        <div className="sheet-body">
          <div className="status-card" style={{ boxShadow: "none", background: "var(--bg-sheet-card)" }}>
            <span className="status-icon" aria-hidden="true">
              <Icon name="clock" />
            </span>
            <h3 className="title3">{d.report.closedTitle}</h3>
            <p>{t(d.report.closedBody, { date: fmt.shortDate(code.purchasedAt) })}</p>
          </div>
        </div>
      </>
    );
  }

  if (sent) {
    return (
      <>
        <SheetNav title={d.report.title} />
        <div className="sheet-body">
          <div className="success">
            <span className="success-mark" aria-hidden="true">
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h3 className="title3">{d.report.sentTitle}</h3>
            <p>{t(d.report.sentBody, { time: sent.responseTime })}</p>
          </div>
        </div>
        <div className="sheet-foot">
          <button className="btn btn-filled btn-lg" type="button" onClick={closeSheet}>
            {d.report.done}
          </button>
        </div>
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const refund = preference === "refund";
    const next: Errors = {
      reason: reason ? undefined : d.report.reasonRequired,
      details: reason === "other" && !details.trim() ? d.report.detailsRequired : undefined,
      refundMethod: refund && !method ? d.report.methodRequired : undefined,
      accountNumber: refund && accountNumber.replace(/\s/g, "").length < 4 ? d.report.accountNumberRequired : undefined,
      accountName: refund && !accountName.trim() ? d.report.accountNameRequired : undefined,
    };
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      if (next.reason) firstReason.current?.focus();
      else if (next.details) detailsRef.current?.focus();
      else document.getElementById(next.refundMethod ? "refund-method" : next.accountNumber ? "refund-number" : "refund-name")?.focus();
      return;
    }

    setErrors({});
    setSending(true);
    setBusy(true);
    const form = new FormData();
    form.set("lang", lang);
    form.set("orderId", code.orderId);
    form.set("codeId", code.id);
    form.set("token", token!);
    form.set("reason", reason!);
    form.set("details", details.trim());
    form.set("preference", preference);
    if (file) form.set("screenshot", await compressImage(file));
    if (refund) {
      form.set("refund_method", method);
      form.set("refund_account_number", accountNumber);
      form.set("refund_account_name", accountName);
    }
    const result = await reportProblem(form);
    setBusy(false);
    setSending(false);

    if (!result.ok) {
      const f = result.fields ?? {};
      setErrors({
        reason: f.reason,
        details: f.details,
        screenshot: f.screenshot,
        refundMethod: f.refundMethod,
        accountNumber: f.refundAccountNumber,
        accountName: f.refundAccountName,
        form: Object.keys(f).length ? undefined : result.message,
      });
      return;
    }
    syncOrder(result.order);
    const report = result.order.items.flatMap((i) => i.codes).find((c) => String(c.id) === code.id)?.report;
    setSent({ responseTime: report?.responseTime ?? "" });
  }

  const error = (id: string, message?: string) =>
    message ? (
      <p className="field-error" id={id} role="alert">
        <Icon name="alert" />
        {message}
      </p>
    ) : null;

  return (
    <form className="sheet-form" onSubmit={onSubmit} noValidate aria-busy={sending}>
      <SheetNav title={d.report.title} trailing={sending ? <span /> : undefined} />
      <div className="sheet-body">
        <div className="list" style={{ marginBlockStart: "var(--s-2)" }}>
          <div className="list-row">
            <MerchantTile merchant={code.merchant} hue={code.hue} size="sm" />
            <span className="list-row-main">
              <span className="list-row-title">
                {code.merchant} {code.title}
              </span>
              <span className="list-row-sub">
                {code.label} · {fmt.money(code.priceMinor)}
              </span>
            </span>
          </div>
        </div>

        <fieldset className="plain-fieldset" aria-describedby={errors.reason ? "reason-error" : undefined}>
          <legend className="list-header">{d.report.what}</legend>
          <ul className="list" role="list">
            {REASONS.map((r, i) => (
              <li key={r}>
                <label className="list-row pay-option">
                  <span className="list-row-main">{d.report.reasons[r]}</span>
                  <input
                    ref={i === 0 ? firstReason : undefined}
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    disabled={sending}
                    onChange={() => {
                      setReason(r);
                      setErrors((x) => ({ ...x, reason: undefined }));
                    }}
                  />
                </label>
              </li>
            ))}
          </ul>
          {error("reason-error", errors.reason)}
        </fieldset>

        <div className="field" style={{ marginBlockStart: "var(--s-6)" }}>
          <label className="field-label" htmlFor="report-details">
            {d.report.details} <span className="secondary">{reason === "other" ? d.report.required : d.report.optional}</span>
          </label>
          <textarea
            ref={detailsRef}
            id="report-details"
            className="text-input text-area"
            rows={3}
            maxLength={1000}
            placeholder={d.report.detailsPlaceholder}
            value={details}
            disabled={sending}
            aria-invalid={errors.details ? true : undefined}
            aria-describedby={errors.details ? "details-error" : undefined}
            onChange={(e) => {
              setDetails(e.target.value);
              if (errors.details && e.target.value.trim()) setErrors((x) => ({ ...x, details: undefined }));
            }}
          />
          {error("details-error", errors.details)}
        </div>

        <div className="field" style={{ marginBlockStart: "var(--s-6)" }}>
          <span className="field-label">{d.report.screenshot}</span>
          <input
            id="report-screenshot"
            className="visually-hidden"
            type="file"
            accept="image/*"
            disabled={sending}
            aria-describedby={errors.screenshot ? "screenshot-error" : "screenshot-help"}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              setFile(picked);
              setPreview(picked ? URL.createObjectURL(picked) : null);
            }}
          />
          {preview ? (
            <div className="receipt-preview">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={preview} alt={d.report.screenshotAlt} />
              <label htmlFor="report-screenshot" className="btn btn-gray btn-sm">
                {d.order.change}
              </label>
            </div>
          ) : (
            <label htmlFor="report-screenshot" className="receipt-drop receipt-drop-compact">
              <span className="headline">
                <Icon name="plus" className="icon-sm icon-inline" /> {d.report.addScreenshot}
              </span>
              <span className="list-row-sub" id="screenshot-help">
                {d.report.screenshotHint}
              </span>
            </label>
          )}
          {error("screenshot-error", errors.screenshot)}
        </div>

        <fieldset className="plain-fieldset">
          <legend className="list-header">{d.report.want}</legend>
          <ul className="list" role="list">
            {(["replacement", "refund"] as const).map((p) => (
              <li key={p}>
                <label className="list-row has-icon pay-option">
                  <span className="row-icon" style={{ "--h": p === "replacement" ? 150 : 32 } as CSSProperties}>
                    <Icon name={p === "replacement" ? "ticket" : "refund"} />
                  </span>
                  <span className="list-row-main">
                    <span className="list-row-title">{p === "replacement" ? d.report.replacement : d.report.refund}</span>
                    <span className="list-row-sub">
                      {p === "replacement" ? d.report.replacementHint : t(d.report.refundHint, { amount: fmt.money(code.priceMinor) })}
                    </span>
                  </span>
                  <input type="radio" name="preference" value={p} checked={preference === p} disabled={sending} onChange={() => setPreference(p)} />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {preference === "refund" && (
          <div className="field-stack" style={{ marginBlockStart: "var(--s-4)" }}>
            <div className="field">
              <label className="field-label" htmlFor="refund-method">
                {d.report.refundTo}
              </label>
              <select
                id="refund-method"
                className="text-input"
                value={method}
                disabled={sending}
                aria-invalid={errors.refundMethod ? true : undefined}
                onChange={(e) => setMethod(e.target.value)}
              >
                {paymentMethods.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} · {m.provider}
                  </option>
                ))}
              </select>
              {error("method-error", errors.refundMethod)}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="refund-number">
                {d.report.accountNumber}
              </label>
              <input
                id="refund-number"
                className="text-input tabular"
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                value={accountNumber}
                disabled={sending}
                aria-invalid={errors.accountNumber ? true : undefined}
                aria-describedby={errors.accountNumber ? "number-error" : undefined}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              {error("number-error", errors.accountNumber)}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="refund-name">
                {d.report.accountName}
              </label>
              <input
                id="refund-name"
                className="text-input"
                autoComplete="name"
                value={accountName}
                disabled={sending}
                aria-invalid={errors.accountName ? true : undefined}
                aria-describedby={errors.accountName ? "name-error" : undefined}
                onChange={(e) => setAccountName(e.target.value)}
              />
              {error("name-error", errors.accountName)}
            </div>
          </div>
        )}
      </div>
      <div className="sheet-foot">
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
              {d.report.sending}
            </>
          ) : (
            d.report.submit
          )}
        </button>
      </div>
    </form>
  );
}

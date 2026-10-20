"use server";

import { headers } from "next/headers";
import { getDictionary, hasLocale, type Locale } from "@/i18n";
import { API_URL } from "@/lib/api";
import type { CodeReport, Order } from "@/lib/types";

/**
 * Server Actions are public endpoints: everything is re-validated by Laravel.
 * These only forward requests and translate responses into messages people can act on.
 */

type Field =
  | "phone" | "email" | "paymentMethod" | "items" | "receipt" | "transactionReference"
  | "reason" | "details" | "screenshot" | "preference" | "refundMethod" | "refundAccountNumber" | "refundAccountName";
export type ActionError = { ok: false; message: string; fields?: Partial<Record<Field, string>> };
export type OrderResult = { ok: true; order: Order; token?: string } | ActionError;

export type OrderInput = {
  lang: Locale;
  phone: string;
  email: string;
  paymentMethod: string;
  items: { optionId: number; qty: number }[];
};

type ApiOrder = {
  id: string;
  reference: string;
  access_token?: string;
  status: Order["status"];
  currency: string;
  total_minor: number;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  review_time: string;
  receipt_submitted_at: string | null;
  payment: { method: string; name: string; provider: string | null; account_name: string | null; account_number: string | null };
  items: {
    quantity: number;
    unit_price_minor: number;
    option: { id: number; label: string };
    deal: { slug: string; merchant: string; title: string; hue: number };
    codes: {
      id: number;
      code: string;
      expires_at: string | null;
      status: "sold" | "disputed";
      reportable_until: string | null;
      report: {
        status: CodeReport["status"];
        reason: CodeReport["reason"];
        preference: CodeReport["preference"];
        created_at: string;
        resolved_at: string | null;
        message: string | null;
        replacement_code_id: number | null;
        refund_amount_minor: number | null;
        refund_reference: string | null;
        response_time: string;
      } | null;
    }[];
  }[];
};

const toOrder = (o: ApiOrder): Order => ({
  id: o.id,
  reference: o.reference,
  status: o.status,
  currency: o.currency,
  totalMinor: o.total_minor,
  createdAt: o.created_at,
  expiresAt: o.expires_at,
  paidAt: o.paid_at,
  rejectionReason: o.rejection_reason,
  reviewTime: o.review_time,
  receiptSubmittedAt: o.receipt_submitted_at,
  payment: {
    method: o.payment.method,
    name: o.payment.name,
    provider: o.payment.provider,
    accountName: o.payment.account_name,
    accountNumber: o.payment.account_number,
  },
  items: o.items.map((i) => ({
    quantity: i.quantity,
    unitPriceMinor: i.unit_price_minor,
    optionId: i.option.id,
    label: i.option.label,
    dealSlug: i.deal.slug,
    merchant: i.deal.merchant,
    title: i.deal.title,
    hue: i.deal.hue,
    codes: i.codes.map((c) => ({
      id: c.id,
      code: c.code,
      expiresAt: c.expires_at,
      status: c.status,
      reportableUntil: c.reportable_until,
      report: c.report && {
        status: c.report.status,
        reason: c.report.reason,
        preference: c.report.preference,
        createdAt: c.report.created_at,
        resolvedAt: c.report.resolved_at,
        message: c.report.message,
        replacementCodeId: c.report.replacement_code_id,
        refundAmountMinor: c.report.refund_amount_minor,
        refundReference: c.report.refund_reference,
        responseTime: c.report.response_time,
      },
    })),
  })),
});

/**
 * The shopper's IP for the API's rate limits (Laravel trusts it only from this server; see
 * TRUSTED_PROXIES). Uses the right-most X-Forwarded-For entry: the address the proxy in front of
 * Next saw. In production, that proxy must set the header, since clients can send their own.
 */
async function forwarded(): Promise<Record<string, string>> {
  const value = (await headers()).get("x-forwarded-for") ?? "";
  const ip = value.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return ip ? { "X-Forwarded-For": ip } : {};
}

const langOf = (value: unknown): Locale => (typeof value === "string" && hasLocale(value) ? value : "ar");
const errors = (lang: Locale) => getDictionary(lang).errors;
const fail = (message: string): ActionError => ({ ok: false, message });

const API_FIELDS: Record<string, Field> = {
  phone: "phone",
  email: "email",
  payment_method: "paymentMethod",
  receipt: "receipt",
  transaction_reference: "transactionReference",
  reason: "reason",
  details: "details",
  screenshot: "screenshot",
  preference: "preference",
  refund_method: "refundMethod",
  refund_account_number: "refundAccountNumber",
  refund_account_name: "refundAccountName",
};

async function toError(res: Response, lang: Locale, fallback: string): Promise<ActionError> {
  if (res.status === 422) {
    const { errors = {} } = (await res.json()) as { errors?: Record<string, string[]> };
    const fields: Partial<Record<Field, string>> = {};
    let message = "";
    for (const [key, [first]] of Object.entries(errors)) {
      const field = API_FIELDS[key] ?? (key.startsWith("items") ? "items" : undefined);
      if (field) fields[field] = first;
      message ||= first;
    }
    return { ok: false, message: message || fallback, fields };
  }
  if (res.status === 429) return fail(errors(lang).tooMany);
  if (res.status === 404) return fail(errors(lang).orderNotFound);
  return fail(fallback);
}

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  const lang = langOf(input?.lang);
  if (!API_URL) return fail(errors(lang).offline);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "Accept-Language": lang, ...(await forwarded()) },
      body: JSON.stringify({
        phone: String(input?.phone ?? ""),
        email: String(input?.email ?? ""),
        payment_method: String(input?.paymentMethod ?? ""),
        items: (Array.isArray(input?.items) ? input.items : []).map((i) => ({ option_id: Number(i.optionId), quantity: Number(i.qty) })),
      }),
      cache: "no-store",
    });
  } catch {
    return fail(errors(lang).unreachable);
  }
  if (res.status !== 201) return toError(res, lang, errors(lang).placeFailed);
  const { data } = (await res.json()) as { data: ApiOrder };
  return { ok: true, order: toOrder(data), token: data.access_token };
}

export async function getOrder(id: string, token: string, langInput: Locale): Promise<OrderResult> {
  const lang = langOf(langInput);
  if (!API_URL) return fail(errors(lang).offline);
  if (!/^[0-9A-Za-z]{26}$/.test(id)) return fail(errors(lang).badLink);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders/${id}`, {
      headers: { Accept: "application/json", "X-Order-Token": String(token), "Accept-Language": lang, ...(await forwarded()) },
      cache: "no-store",
    });
  } catch {
    return fail(errors(lang).unreachable);
  }
  if (!res.ok) return toError(res, lang, errors(lang).loadFailed);
  return { ok: true, order: toOrder(((await res.json()) as { data: ApiOrder }).data) };
}

/** FormData: lang, id, token, receipt (image), transaction_reference. */
export async function submitReceipt(form: FormData): Promise<OrderResult> {
  const lang = langOf(form.get("lang"));
  if (!API_URL) return fail(errors(lang).offline);
  const id = String(form.get("id") ?? "");
  const token = String(form.get("token") ?? "");
  const receipt = form.get("receipt");
  if (!/^[0-9A-Za-z]{26}$/.test(id)) return fail(errors(lang).badLink);
  if (!(receipt instanceof File) || receipt.size === 0) {
    const message = getDictionary(lang).order.receiptRequired;
    return { ok: false, message, fields: { receipt: message } };
  }

  const body = new FormData();
  body.set("receipt", receipt, receipt.name || "receipt.jpg");
  body.set("transaction_reference", String(form.get("transaction_reference") ?? ""));

  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders/${id}/receipt`, {
      method: "POST",
      headers: { Accept: "application/json", "X-Order-Token": token, "Accept-Language": lang, ...(await forwarded()) },
      body,
      cache: "no-store",
    });
  } catch {
    return fail(errors(lang).unreachable);
  }
  if (!res.ok) return toError(res, lang, errors(lang).uploadFailed);
  return { ok: true, order: toOrder(((await res.json()) as { data: ApiOrder }).data) };
}

/** FormData: lang, orderId, token, codeId, reason, details?, screenshot?, preference, refund_* when refunding. */
export async function reportProblem(form: FormData): Promise<OrderResult> {
  const lang = langOf(form.get("lang"));
  if (!API_URL) return fail(errors(lang).offline);
  const orderId = String(form.get("orderId") ?? "");
  const codeId = String(form.get("codeId") ?? "");
  if (!/^[0-9A-Za-z]{26}$/.test(orderId) || !/^\d+$/.test(codeId)) return fail(errors(lang).badLink);

  const body = new FormData();
  for (const key of ["reason", "details", "preference", "refund_method", "refund_account_number", "refund_account_name"]) {
    const value = form.get(key);
    if (typeof value === "string" && value !== "") body.set(key, value);
  }
  const screenshot = form.get("screenshot");
  if (screenshot instanceof File && screenshot.size > 0) body.set("screenshot", screenshot, screenshot.name || "screenshot.jpg");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders/${orderId}/codes/${codeId}/report`, {
      method: "POST",
      headers: { Accept: "application/json", "X-Order-Token": String(form.get("token") ?? ""), "Accept-Language": lang, ...(await forwarded()) },
      body,
      cache: "no-store",
    });
  } catch {
    return fail(errors(lang).unreachable);
  }
  if (!res.ok) return toError(res, lang, errors(lang).reportFailed);
  return { ok: true, order: toOrder(((await res.json()) as { data: ApiOrder }).data) };
}

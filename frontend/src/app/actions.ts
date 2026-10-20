"use server";

import { API_URL } from "@/lib/api";
import type { Order } from "@/lib/types";

/**
 * Server Actions are public endpoints: everything is re-validated by Laravel.
 * These only forward requests and translate responses into messages people can act on.
 */

type Field = "phone" | "email" | "paymentMethod" | "items" | "receipt" | "transactionReference";
export type ActionError = { ok: false; message: string; fields?: Partial<Record<Field, string>> };
export type OrderResult = { ok: true; order: Order; token?: string } | ActionError;

export type OrderInput = {
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
    codes: { id: number; code: string; expires_at: string | null }[];
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
    codes: i.codes.map((c) => ({ id: c.id, code: c.code, expiresAt: c.expires_at })),
  })),
});

const OFFLINE: ActionError = {
  ok: false,
  message: "Checkout needs the store API. Set API_URL in frontend/.env.local and start the Laravel backend.",
};
const UNREACHABLE: ActionError = { ok: false, message: "We couldn’t reach the store. Check your connection and try again." };

const API_FIELDS: Record<string, Field> = {
  phone: "phone",
  email: "email",
  payment_method: "paymentMethod",
  receipt: "receipt",
  transaction_reference: "transactionReference",
};

async function toError(res: Response, fallback: string): Promise<ActionError> {
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
  if (res.status === 429) return { ok: false, message: "Too many attempts in a short time. Wait a minute, then try again." };
  if (res.status === 404) return { ok: false, message: "We couldn’t find this order. Open it from the link in your email or from My Codes." };
  return { ok: false, message: fallback };
}

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  if (!API_URL) return OFFLINE;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: String(input?.phone ?? ""),
        email: String(input?.email ?? ""),
        payment_method: String(input?.paymentMethod ?? ""),
        items: (Array.isArray(input?.items) ? input.items : []).map((i) => ({ option_id: Number(i.optionId), quantity: Number(i.qty) })),
      }),
      cache: "no-store",
    });
  } catch {
    return UNREACHABLE;
  }
  if (res.status !== 201) return toError(res, "We couldn’t place your order. Please try again.");
  const { data } = (await res.json()) as { data: ApiOrder };
  return { ok: true, order: toOrder(data), token: data.access_token };
}

export async function getOrder(id: string, token: string): Promise<OrderResult> {
  if (!API_URL) return OFFLINE;
  if (!/^[0-9A-Za-z]{26}$/.test(id)) return { ok: false, message: "That order link isn’t valid." };
  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders/${id}`, {
      headers: { Accept: "application/json", "X-Order-Token": String(token) },
      cache: "no-store",
    });
  } catch {
    return UNREACHABLE;
  }
  if (!res.ok) return toError(res, "We couldn’t load this order. Please try again.");
  return { ok: true, order: toOrder(((await res.json()) as { data: ApiOrder }).data) };
}

/** FormData: id, token, receipt (image), transaction_reference. */
export async function submitReceipt(form: FormData): Promise<OrderResult> {
  if (!API_URL) return OFFLINE;
  const id = String(form.get("id") ?? "");
  const token = String(form.get("token") ?? "");
  const receipt = form.get("receipt");
  if (!/^[0-9A-Za-z]{26}$/.test(id)) return { ok: false, message: "That order link isn’t valid." };
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { ok: false, message: "Add a screenshot of your receipt.", fields: { receipt: "Add a screenshot of your receipt." } };
  }

  const body = new FormData();
  body.set("receipt", receipt, receipt.name || "receipt.jpg");
  body.set("transaction_reference", String(form.get("transaction_reference") ?? ""));

  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders/${id}/receipt`, {
      method: "POST",
      headers: { Accept: "application/json", "X-Order-Token": token },
      body,
      cache: "no-store",
    });
  } catch {
    return UNREACHABLE;
  }
  if (!res.ok) return toError(res, "We couldn’t upload your receipt. Please try again.");
  return { ok: true, order: toOrder(((await res.json()) as { data: ApiOrder }).data) };
}

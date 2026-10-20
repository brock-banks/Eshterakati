"use server";

import { API_URL } from "@/lib/api";
import { fixtureCatalog } from "@/lib/fixtures";
import type { OwnedCode } from "@/lib/types";

export type OrderInput = { email: string; items: { optionId: number; qty: number }[] };
export type OrderResult =
  | { ok: true; email: string; codes: OwnedCode[] }
  | { ok: false; field?: "email" | "items"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NOT_CHARGED = "You haven’t been charged.";

type ApiOrder = {
  id: string;
  created_at: string;
  codes: {
    id: number;
    code: string;
    expires_at: string | null;
    option: { id: number; label: string; face_value_cents: number; price_cents: number };
    deal: { slug: string; merchant: string; title: string; hue: number };
  }[];
};

export async function placeOrder(input: OrderInput): Promise<OrderResult> {
  // Server Actions are public endpoints: re-validate everything the client sent.
  const email = typeof input?.email === "string" ? input.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return { ok: false, field: "email", message: "That email looks incomplete. Check for a missing “@” or domain, like name@example.com." };
  }
  const items = (Array.isArray(input?.items) ? input.items : []).filter(
    (i) => Number.isInteger(i?.optionId) && Number.isInteger(i?.qty) && i.qty >= 1 && i.qty <= 10,
  );
  if (!items.length || items.length > 20) return { ok: false, field: "items", message: "Your bag is empty." };

  return API_URL ? placeWithApi(email, items) : placeWithFixtures(email, items);
}

async function placeWithApi(email: string, items: OrderInput["items"]): Promise<OrderResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email, items: items.map((i) => ({ option_id: i.optionId, quantity: i.qty })) }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: `We couldn’t reach the store. ${NOT_CHARGED} Check your connection and try again.` };
  }

  if (res.status === 201) {
    const { data } = (await res.json()) as { data: ApiOrder };
    return {
      ok: true,
      email,
      codes: data.codes.map((c) => ({
        id: String(c.id),
        code: c.code,
        purchasedAt: data.created_at,
        expiresAt: c.expires_at,
        status: "active",
        optionId: c.option.id,
        dealSlug: c.deal.slug,
        merchant: c.deal.merchant,
        title: c.deal.title,
        hue: c.deal.hue,
        label: c.option.label,
        priceCents: c.option.price_cents,
        faceValueCents: c.option.face_value_cents,
      })),
    };
  }

  if (res.status === 422) {
    const { errors = {} } = (await res.json()) as { errors?: Record<string, string[]> };
    if (errors.email) return { ok: false, field: "email", message: errors.email[0] };
    const first = Object.values(errors)[0]?.[0];
    return { ok: false, field: "items", message: `${first ?? "Something in your order changed."} ${NOT_CHARGED}` };
  }

  if (res.status === 429) {
    return { ok: false, message: `Too many attempts in a short time. ${NOT_CHARGED} Wait a minute, then try again.` };
  }

  return { ok: false, message: `The payment didn’t go through. ${NOT_CHARGED} Please try again.` };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function placeWithFixtures(email: string, items: OrderInput["items"]): Promise<OrderResult> {
  await new Promise((r) => setTimeout(r, 900)); // feel of a real network round trip
  const now = new Date();
  const { deals } = fixtureCatalog(now.getTime());
  const codes: OwnedCode[] = [];

  for (const item of items) {
    const deal = deals.find((d) => d.options.some((o) => o.id === item.optionId));
    const option = deal?.options.find((o) => o.id === item.optionId);
    if (!deal || !option) return { ok: false, field: "items", message: `This deal is no longer available. ${NOT_CHARGED}` };

    for (let n = 0; n < item.qty; n++) {
      const prefix = deal.merchant.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
      const group = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
      codes.push({
        id: `${now.getTime()}-${codes.length}`,
        code: `${prefix}-${group()}-${group()}-${group()}`,
        purchasedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 365 * 864e5).toISOString(),
        status: "active",
        optionId: option.id,
        dealSlug: deal.slug,
        merchant: deal.merchant,
        title: deal.title,
        hue: deal.hue,
        label: option.label,
        priceCents: option.priceCents,
        faceValueCents: option.faceValueCents,
      });
    }
  }
  return { ok: true, email, codes };
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { getOrder } from "@/app/actions";
import { clockTime, money, shortDate } from "@/lib/format";
import { readState, setCodeStatus, syncOrder, useStore } from "@/lib/store";
import type { OrderRef, OwnedCode } from "@/lib/types";
import { CodeField } from "./CodeField";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { MerchantTile } from "./MerchantTile";
import { SegmentedControl } from "./SegmentedControl";
import { useUI } from "./UIProvider";

type Show = "active" | "used";

export function CodesView() {
  const initial = useSearchParams().get("show");
  const [show, setShow] = useState<Show>(initial === "used" ? "used" : "active");
  const codes = useStore((s) => s.codes);
  const counts = { active: codes.filter((c) => c.status === "active").length, used: codes.filter((c) => c.status === "used").length };
  const list = codes.filter((c) => c.status === show);

  function change(next: Show) {
    setShow(next);
    const url = new URL(window.location.href);
    if (next === "used") url.searchParams.set("show", "used");
    else url.searchParams.delete("show");
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <OrdersInProgress />
      <div className="toolbar">
        <SegmentedControl
          label="Filter codes"
          segments={[
            { value: "active", label: `Active (${counts.active})` },
            { value: "used", label: `Used (${counts.used})` },
          ]}
          value={show}
          onChange={change}
        />
      </div>
      {list.length ? (
        <div className="passes">
          {list.map((c) => (
            <Pass key={c.id} code={c} />
          ))}
        </div>
      ) : show === "active" ? (
        <EmptyState
          icon="ticket"
          title="No active codes"
          action={
            <Link className="btn btn-filled" href="/">
              Discover Deals
            </Link>
          }
        >
          Codes appear here as soon as we confirm your payment, ready to copy and redeem.
        </EmptyState>
      ) : (
        <EmptyState icon="check-circle" title="Nothing here yet">
          When you mark a code as used, it moves here so your active list stays tidy.
        </EmptyState>
      )}
    </>
  );
}

function Pass({ code: c }: { code: OwnedCode }) {
  const { toast } = useUI();
  const used = c.status === "used";
  const move = (status: OwnedCode["status"]) => {
    setCodeStatus(c.id, status);
    toast(status === "used" ? "Moved to Used" : "Moved to Active", { label: "Undo", run: () => setCodeStatus(c.id, c.status) });
  };

  return (
    <article className={`pass${used ? " is-used" : ""}`} style={{ "--h": c.hue } as CSSProperties} aria-labelledby={`pass-${c.id}`}>
      <div className="pass-head">
        <MerchantTile merchant={c.merchant} hue={c.hue} />
        <div className="pass-head-main">
          <p className="pass-merchant">{c.merchant}</p>
          <h2 className="pass-title" id={`pass-${c.id}`}>
            {c.title}
          </h2>
        </div>
        <span className="pass-value">{c.label}</span>
      </div>
      <div className="pass-body">
        <CodeField code={c.code} merchant={c.merchant} />
        <p className="pass-meta">
          {used && "Marked as used · "}Bought {shortDate(c.purchasedAt)}
          {c.expiresAt && ` · Valid until ${shortDate(c.expiresAt)}`}
        </p>
      </div>
      <div className="pass-perf" aria-hidden="true" />
      <div className="pass-body">
        <div className="pass-actions">
          {used ? (
            <button className="btn btn-plain btn-sm" type="button" onClick={() => move("active")}>
              Move Back to Active
            </button>
          ) : (
            <button className="btn btn-plain btn-sm" type="button" onClick={() => move("used")}>
              <Icon name="check-circle" />
              Mark as Used
            </button>
          )}
          <Link className="btn btn-plain btn-sm" href={`/deals/${c.dealSlug}#redeem-h`}>
            <Icon name="info" />
            How to Redeem
          </Link>
          <button className="btn btn-plain btn-sm" type="button" onClick={() => toast("Problem reports are coming soon. Until then, reply to your order email.")}>
            <Icon name="flag" />
            Report a Problem
          </button>
        </div>
      </div>
    </article>
  );
}

const PENDING: OrderRef["status"][] = ["awaiting_payment", "in_review"];
const STATUS_TEXT: Partial<Record<OrderRef["status"], string>> = {
  awaiting_payment: "Waiting for your transfer",
  in_review: "We’re checking your payment",
};

/** Orders placed on this device that still need the shopper, or us. Refreshes while open. */
function OrdersInProgress() {
  const { toast } = useUI();
  const orders = useStore((s) => s.orders);
  const pending = orders.filter((o) => PENDING.includes(o.status));
  const key = pending.map((o) => o.id).join();

  useEffect(() => {
    if (!key) return;
    const refresh = async () => {
      for (const ref of readState().orders.filter((o) => PENDING.includes(o.status))) {
        const result = await getOrder(ref.id, ref.token);
        if (!result.ok) continue;
        syncOrder(result.order);
        if (result.order.status === "paid") toast(`Your codes for ${ref.reference} are ready`);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [key, toast]);

  if (!pending.length) return null;
  return (
    <section aria-labelledby="pending-h" style={{ marginBlockEnd: "var(--s-8)" }}>
      <h2 className="list-header" id="pending-h" style={{ marginBlockStart: 0 }}>
        Orders in progress
      </h2>
      <ul className="list order-list" role="list">
        {pending.map((o) => (
          <li key={o.id}>
            <Link className="list-row has-icon" href={`/orders/${o.id}`}>
              <span className="row-icon" style={{ "--h": o.status === "in_review" ? 32 : 210 } as CSSProperties}>
                <Icon name={o.status === "in_review" ? "clock" : "wallet"} />
              </span>
              <span className="list-row-main">
                <span className="list-row-title">
                  {o.reference} · {money(o.totalMinor)}
                </span>
                <span className="list-row-sub">
                  {STATUS_TEXT[o.status]} · placed {clockTime(o.createdAt)}
                </span>
              </span>
              <span className="badge badge-neutral">{o.status === "in_review" ? "In review" : "Pay now"}</span>
              <Icon name="chevron-right" className="chev flip-rtl" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

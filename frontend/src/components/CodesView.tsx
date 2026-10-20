"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { getOrder } from "@/app/actions";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { dict: d, t, href } = useI18n();
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
          label={d.codes.filter}
          segments={[
            { value: "active", label: t(d.codes.active, { n: counts.active }) },
            { value: "used", label: t(d.codes.used, { n: counts.used }) },
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
          title={d.codes.emptyActiveTitle}
          action={
            <Link className="btn btn-filled" href={href("/")}>
              {d.bag.discover}
            </Link>
          }
        >
          {d.codes.emptyActiveBody}
        </EmptyState>
      ) : (
        <EmptyState icon="check-circle" title={d.codes.emptyUsedTitle}>
          {d.codes.emptyUsedBody}
        </EmptyState>
      )}
    </>
  );
}

function Pass({ code: c }: { code: OwnedCode }) {
  const { toast } = useUI();
  const { dict: d, t, fmt, href } = useI18n();
  const used = c.status === "used";
  const move = (status: OwnedCode["status"]) => {
    setCodeStatus(c.id, status);
    toast(status === "used" ? d.codes.movedUsed : d.codes.movedActive, { label: d.common.undo, run: () => setCodeStatus(c.id, c.status) });
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
          {used && d.codes.markedUsed}
          {t(d.codes.bought, { date: fmt.shortDate(c.purchasedAt) })}
          {c.expiresAt && t(d.codes.validUntil, { date: fmt.shortDate(c.expiresAt) })}
        </p>
      </div>
      <div className="pass-perf" aria-hidden="true" />
      <div className="pass-body">
        <div className="pass-actions">
          {used ? (
            <button className="btn btn-plain btn-sm" type="button" onClick={() => move("active")}>
              {d.codes.moveBack}
            </button>
          ) : (
            <button className="btn btn-plain btn-sm" type="button" onClick={() => move("used")}>
              <Icon name="check-circle" />
              {d.codes.markUsed}
            </button>
          )}
          <Link className="btn btn-plain btn-sm" href={href(`/deals/${c.dealSlug}#redeem-h`)}>
            <Icon name="info" />
            {d.codes.howToRedeem}
          </Link>
          <button className="btn btn-plain btn-sm" type="button" onClick={() => toast(d.codes.reportSoon)}>
            <Icon name="flag" />
            {d.codes.report}
          </button>
        </div>
      </div>
    </article>
  );
}

const PENDING: OrderRef["status"][] = ["awaiting_payment", "in_review"];

/** Orders placed on this device that still need the shopper, or us. Refreshes while open. */
function OrdersInProgress() {
  const { toast } = useUI();
  const { dict: d, t, fmt, href, lang } = useI18n();
  const orders = useStore((s) => s.orders);
  const pending = orders.filter((o) => PENDING.includes(o.status));
  const key = pending.map((o) => o.id).join();

  useEffect(() => {
    if (!key) return;
    const refresh = async () => {
      for (const ref of readState().orders.filter((o) => PENDING.includes(o.status))) {
        const result = await getOrder(ref.id, ref.token, lang);
        if (!result.ok) continue;
        syncOrder(result.order);
        if (result.order.status === "paid") toast(t(d.codes.ready, { reference: ref.reference }));
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [key, toast, lang, t, d]);

  if (!pending.length) return null;
  return (
    <section aria-labelledby="pending-h" style={{ marginBlockEnd: "var(--s-8)" }}>
      <h2 className="list-header" id="pending-h" style={{ marginBlockStart: 0 }}>
        {d.codes.inProgress}
      </h2>
      <ul className="list order-list" role="list">
        {pending.map((o) => {
          const reviewing = o.status === "in_review";
          return (
            <li key={o.id}>
              <Link className="list-row has-icon" href={href(`/orders/${o.id}`)}>
                <span className="row-icon" style={{ "--h": reviewing ? 32 : 210 } as CSSProperties}>
                  <Icon name={reviewing ? "clock" : "wallet"} />
                </span>
                <span className="list-row-main">
                  <span className="list-row-title">
                    <bdi>{o.reference}</bdi>
                  </span>
                  <span className="list-row-sub">
                    {fmt.money(o.totalMinor)} · {reviewing ? d.codes.inReview : d.codes.awaiting}
                  </span>
                  <span className="list-row-sub">{t(d.codes.placedAt, { time: fmt.clockTime(o.createdAt) })}</span>
                </span>
                <span className="badge badge-neutral">{reviewing ? d.codes.inReviewBadge : d.codes.payNow}</span>
                <Icon name="chevron-right" className="chev flip-rtl" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

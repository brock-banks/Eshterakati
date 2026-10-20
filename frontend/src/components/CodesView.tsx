"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { money, shortDate } from "@/lib/format";
import { setCodeStatus, useStore } from "@/lib/store";
import type { OwnedCode } from "@/lib/types";
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
          Codes you buy appear here instantly, ready to copy and redeem.
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
            {c.title} · {c.label}
          </h2>
        </div>
        <span className="pass-value">{money(c.faceValueCents)}</span>
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

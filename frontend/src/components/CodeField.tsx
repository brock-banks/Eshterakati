"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { maskCode } from "@/lib/format";
import { Icon } from "./Icon";
import { useUI } from "./UIProvider";

async function copyText(text: string, container: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall back for browsers that block the async clipboard API.
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  container.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Shows a code masked by default; it can be copied without revealing it. */
export function CodeField({ code, merchant, revealed: initiallyRevealed = false }: { code: string; merchant: string; revealed?: boolean }) {
  const { toast } = useUI();
  const { dict: d, t } = useI18n();
  const [revealed, setRevealed] = useState(initiallyRevealed);
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent<HTMLButtonElement>) {
    const ok = await copyText(code, e.currentTarget.closest("dialog") ?? document.body);
    if (!ok) {
      toast(d.codes.copyFailed);
      return;
    }
    setCopied(true);
    toast(d.codes.codeCopied);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="code-field">
      <span className="visually-hidden">{t(d.codes.codeOf, { merchant })}</span>
      <code className={`code-value${revealed ? "" : " is-masked"}`}>{revealed ? code : maskCode(code)}</code>
      <button
        className="icon-btn"
        type="button"
        aria-pressed={revealed}
        aria-label={d.codes.showCode}
        onClick={() => setRevealed((r) => !r)}
      >
        <Icon name={revealed ? "eye-off" : "eye"} />
      </button>
      <button className={`btn btn-tinted btn-sm copy-btn${copied ? " is-done" : ""}`} type="button" onClick={onCopy}>
        <Icon name={copied ? "check" : "copy"} />
        <span className="copy-label">{copied ? d.common.copied : d.common.copy}</span>
      </button>
    </div>
  );
}

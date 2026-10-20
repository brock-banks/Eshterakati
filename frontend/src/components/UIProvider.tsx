"use client";

import { usePathname } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import type { BagLine, OwnedCode, PaymentMethod } from "@/lib/types";
import { BagView, CheckoutView } from "./CheckoutSheet";
import { ReportView } from "./ReportSheet";
import { Icon } from "./Icon";

export type SheetView =
  | { step: "bag" }
  | { step: "checkout"; from: "bag" | "express"; items: BagLine[] }
  | { step: "report"; code: OwnedCode };

type ToastAction = { label: string; run: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

type UI = {
  paymentMethods: PaymentMethod[];
  toast: (message: string, action?: ToastAction) => void;
  openSheet: (view: SheetView) => void;
  showView: (view: SheetView) => void;
  closeSheet: () => void;
  setBusy: (busy: boolean) => void;
};

const UIContext = createContext<UI | null>(null);

export function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error("useUI must be used inside <UIProvider>");
  return ui;
}

const SHEET_MS = 320;

export function UIProvider({ children, paymentMethods }: { children: ReactNode; paymentMethods: PaymentMethod[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const [view, setView] = useState<SheetView | null>(null);
  const [toastState, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((message: string, action?: ToastAction) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, action });
    toastTimer.current = window.setTimeout(() => setToast(null), action ? 5000 : 3000);
  }, []);

  const openSheet = useCallback((next: SheetView) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setView(next);
    if (dialog.open) return;
    setToast(null); // a toast from the page shouldn't follow the shopper into the sheet
    triggerRef.current = document.activeElement as HTMLElement | null;
    dialog.showModal();
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add("is-open")));
  }, []);

  const closeSheet = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open || busyRef.current) return;
    dialog.classList.remove("is-open");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      dialog.close();
      setView(null);
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
    }, reduced ? 0 : SHEET_MS);
  }, []);

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
  }, []);

  const ui = useMemo<UI>(
    () => ({ paymentMethods, toast, openSheet, showView: setView, closeSheet, setBusy }),
    [paymentMethods, toast, openSheet, closeSheet, setBusy],
  );
  const sheetOpen = view !== null;

  return (
    <UIContext.Provider value={ui}>
      <ThemeSync />
      <Suspense fallback={null}>
        <RouteFocus />
      </Suspense>
      {children}
      <dialog
        ref={dialogRef}
        className="sheet"
        aria-labelledby="sheet-title"
        onCancel={(e) => {
          e.preventDefault();
          closeSheet();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeSheet();
        }}
      >
        <div className="sheet-panel">
          {view?.step === "bag" && <BagView />}
          {view?.step === "checkout" && <CheckoutView key={view.items.map((i) => i.optionId).join()} view={view} />}
          {view?.step === "report" && <ReportView key={view.code.id} code={view.code} />}
        </div>
        {/* Toasts must render inside the modal while it is open: the top layer covers everything else. */}
        <ToastRegion toast={sheetOpen ? toastState : null} onDismiss={() => setToast(null)} />
      </dialog>
      <ToastRegion toast={sheetOpen ? null : toastState} onDismiss={() => setToast(null)} />
    </UIContext.Provider>
  );
}

function ToastRegion({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast" key={toast.id}>
          <Icon name="check-circle" />
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              type="button"
              onClick={() => {
                onDismiss();
                toast.action!.run();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Mirrors the stored theme onto <html>. The inline script in the layout applies it before first paint. */
function ThemeSync() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  return null;
}

/** After client-side navigation, move focus to the new page's heading so screen readers announce it. */
function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Previous pages can stay mounted but hidden (React Activity), so pick the visible heading.
    const headings = Array.from(document.querySelectorAll<HTMLElement>("main h1"));
    headings.find((h) => h.checkVisibility())?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

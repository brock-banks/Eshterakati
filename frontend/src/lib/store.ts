import { useSyncExternalStore } from "react";
import type { BagLine, LineSnapshot, OwnedCode } from "./types";

/**
 * Client state for a guest shopper, persisted to localStorage.
 * When accounts land, `codes` moves to the API and this keeps only UI preferences.
 */
export type Theme = "system" | "light" | "dark";
export type Dir = "ltr" | "rtl";
export type State = {
  bag: BagLine[];
  codes: OwnedCode[];
  recent: string[];
  theme: Theme;
  dir: Dir;
  prefs: { drops: boolean; expiry: boolean };
  /** Last delivery email, to prefill checkout. */
  email: string;
};

const DEFAULTS: State = {
  bag: [],
  codes: [],
  recent: [],
  theme: "system",
  dir: "ltr",
  prefs: { drops: true, expiry: true },
  email: "",
};

const KEY = "esh:v1";
export const MAX_QTY = 10;

let state = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

export function update(fn: (s: State) => Partial<State>) {
  load();
  state = { ...state, ...fn(state) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not persisted; the session still works in memory.
  }
  listeners.forEach((l) => l());
}

/** Select a slice of state. Return existing references (not new objects) from the selector. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(DEFAULTS));
}

// ---- Actions ---------------------------------------------------------------

export function addToBag(item: LineSnapshot) {
  update(({ bag }) => {
    const existing = bag.find((l) => l.optionId === item.optionId);
    return {
      bag: existing
        ? bag.map((l) => (l === existing ? { ...l, qty: Math.min(l.qty + 1, MAX_QTY) } : l))
        : [...bag, { ...item, qty: 1 }],
    };
  });
}

export function setQty(optionId: number, qty: number) {
  update(({ bag }) => ({ bag: bag.map((l) => (l.optionId === optionId ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)) }));
}

export function removeLine(optionId: number) {
  let removed: { line: BagLine; index: number } | null = null;
  update(({ bag }) => {
    const index = bag.findIndex((l) => l.optionId === optionId);
    if (index >= 0) removed = { line: bag[index], index };
    return { bag: bag.filter((l) => l.optionId !== optionId) };
  });
  return removed as { line: BagLine; index: number } | null;
}

export function restoreLine(line: BagLine, index: number) {
  update(({ bag }) => {
    if (bag.some((l) => l.optionId === line.optionId)) return {};
    const next = [...bag];
    next.splice(index, 0, line);
    return { bag: next };
  });
}

export const clearBag = () => update(() => ({ bag: [] }));
export const addCodes = (codes: OwnedCode[]) => update((s) => ({ codes: [...codes, ...s.codes] }));
export const setCodeStatus = (id: string, status: OwnedCode["status"]) =>
  update((s) => ({ codes: s.codes.map((c) => (c.id === id ? { ...c, status } : c)) }));

export function saveRecent(q: string) {
  const term = q.trim();
  if (!term) return;
  update((s) => ({ recent: [term, ...s.recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 5) }));
}

import { useSyncExternalStore } from "react";

/**
 * A shared clock that ticks every 30 seconds. Returns null during server
 * rendering and hydration, so time-dependent text never mismatches.
 */
const TICK = 30_000;

function subscribe(listener: () => void) {
  const id = window.setInterval(listener, TICK);
  return () => window.clearInterval(id);
}

const getSnapshot = () => Math.floor(Date.now() / TICK) * TICK;

export const useNow = () => useSyncExternalStore<number | null>(subscribe, getSnapshot, () => null);

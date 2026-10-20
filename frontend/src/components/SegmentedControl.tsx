"use client";

import { useRef, type KeyboardEvent } from "react";

export type Segment<T extends string> = { value: T; label: string; ariaLabel?: string };

/** iOS-style segmented control with radio semantics and roving focus. */
export function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  className = "",
}: {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = segments.findIndex((s) => s.value === value);
    const rtl = document.documentElement.dir === "rtl";
    const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? segments.length - 1 : (i + step + segments.length) % segments.length;
    onChange(segments[next].value);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div ref={ref} className={`segmented ${className}`} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {segments.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={s.value === value}
          aria-label={s.ariaLabel}
          tabIndex={s.value === value ? 0 : -1}
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

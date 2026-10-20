"use client";

import type { CSSProperties } from "react";
import { update, useStore, type Dir, type Theme } from "@/lib/store";
import { Icon, type IconName } from "./Icon";
import { SegmentedControl } from "./SegmentedControl";
import { useUI } from "./UIProvider";

export function AccountView() {
  const { toast } = useUI();
  const theme = useStore((s) => s.theme);
  const dir = useStore((s) => s.dir);
  const prefs = useStore((s) => s.prefs);
  const soon = () => toast("Not available yet.");

  const row = (icon: IconName, hue: number, title: string) => (
    <li key={title}>
      <button className="list-row has-icon" type="button" onClick={soon}>
        <span className="row-icon" style={{ "--h": hue } as CSSProperties}>
          <Icon name={icon} />
        </span>
        <span className="list-row-main">{title}</span>
        <Icon name="chevron-right" className="chev flip-rtl" />
      </button>
    </li>
  );

  const toggle = (key: keyof typeof prefs, title: string, sub: string) => (
    <li>
      <label className="list-row">
        <span className="list-row-main">
          <span className="list-row-title">{title}</span>
          <span className="list-row-sub">{sub}</span>
        </span>
        <input
          className="switch"
          type="checkbox"
          role="switch"
          checked={prefs[key]}
          onChange={(e) => update((s) => ({ prefs: { ...s.prefs, [key]: e.target.checked } }))}
        />
      </label>
    </li>
  );

  return (
    <>
      <section className="profile-card" aria-labelledby="profile-h">
        <span className="avatar">
          <Icon name="person" />
        </span>
        <div className="profile-main">
          <h2 className="headline" id="profile-h">
            Shopping as a guest
          </h2>
          <p className="subhead secondary">Sign in to sync your codes across devices and get reminders before they expire.</p>
        </div>
        <button className="btn btn-filled" type="button" onClick={soon}>
          Sign In
        </button>
      </section>

      <h2 className="list-header">Appearance</h2>
      <ul className="list" role="list">
        <li className="list-row has-icon wrap">
          <span className="row-icon" style={{ "--h": 240 } as CSSProperties}>
            <Icon name="moon" />
          </span>
          <span className="list-row-main">Theme</span>
          <SegmentedControl<Theme>
            label="Theme"
            segments={[
              { value: "system", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={theme}
            onChange={(v) => update(() => ({ theme: v }))}
          />
        </li>
        <li className="list-row has-icon wrap">
          <span className="row-icon" style={{ "--h": 205 } as CSSProperties}>
            <Icon name="globe" />
          </span>
          <span className="list-row-main">Layout direction</span>
          <SegmentedControl<Dir>
            label="Layout direction"
            segments={[
              { value: "ltr", label: "LTR", ariaLabel: "Left to right" },
              { value: "rtl", label: "RTL", ariaLabel: "Right to left (Arabic)" },
            ]}
            value={dir}
            onChange={(v) => update(() => ({ dir: v }))}
          />
        </li>
      </ul>
      <p className="list-footer">RTL previews the Arabic layout. Text is English‑only for now.</p>

      <h2 className="list-header">Notifications</h2>
      <ul className="list" role="list">
        {toggle("drops", "Price drops", "When a deal you viewed gets cheaper")}
        {toggle("expiry", "Expiry reminders", "7 days before an unused code expires")}
      </ul>

      <h2 className="list-header">Support</h2>
      <ul className="list" role="list">
        {row("help", 205, "Help Center")}
        {row("mail", 145, "Contact Support")}
        {row("refund", 28, "Refund Policy")}
        {row("doc", 240, "Terms & Privacy")}
      </ul>
    </>
  );
}

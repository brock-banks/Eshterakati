"use client";

import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { update, useStore, type Theme } from "@/lib/store";
import { useSwitchLanguage } from "./Header";
import { Icon, type IconName } from "./Icon";
import { SegmentedControl } from "./SegmentedControl";
import { useUI } from "./UIProvider";

export function AccountView() {
  const { toast } = useUI();
  const { dict: d, lang } = useI18n();
  const switchLanguage = useSwitchLanguage();
  const theme = useStore((s) => s.theme);
  const prefs = useStore((s) => s.prefs);
  const soon = () => toast(d.common.notAvailable);

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
            {d.account.guestTitle}
          </h2>
          <p className="subhead secondary">{d.account.guestBody}</p>
        </div>
        <button className="btn btn-filled" type="button" onClick={soon}>
          {d.account.signIn}
        </button>
      </section>

      <h2 className="list-header">{d.account.appearance}</h2>
      <ul className="list" role="list">
        <li className="list-row has-icon wrap">
          <span className="row-icon" style={{ "--h": 205 } as CSSProperties}>
            <Icon name="globe" />
          </span>
          <span className="list-row-main">{d.account.language}</span>
          {/* Each language is named in itself, so it's recognisable whichever is active. */}
          <SegmentedControl<Locale>
            label={d.account.language}
            segments={[
              { value: "ar", label: "العربية" },
              { value: "en", label: "English" },
            ]}
            value={lang}
            onChange={(v) => v !== lang && switchLanguage(v)}
          />
        </li>
        <li className="list-row has-icon wrap">
          <span className="row-icon" style={{ "--h": 240 } as CSSProperties}>
            <Icon name="moon" />
          </span>
          <span className="list-row-main">{d.account.theme}</span>
          <SegmentedControl<Theme>
            label={d.account.theme}
            segments={[
              { value: "system", label: d.account.auto },
              { value: "light", label: d.account.light },
              { value: "dark", label: d.account.dark },
            ]}
            value={theme}
            onChange={(v) => update(() => ({ theme: v }))}
          />
        </li>
      </ul>

      <h2 className="list-header">{d.account.notifications}</h2>
      <ul className="list" role="list">
        {toggle("drops", d.account.drops, d.account.dropsBody)}
        {toggle("expiry", d.account.expiry, d.account.expiryBody)}
      </ul>

      <h2 className="list-header">{d.account.support}</h2>
      <ul className="list" role="list">
        {row("help", 205, d.account.help)}
        {row("mail", 145, d.account.contact)}
        {row("refund", 28, d.account.refund)}
        {row("doc", 240, d.account.terms)}
      </ul>
    </>
  );
}

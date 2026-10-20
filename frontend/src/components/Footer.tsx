"use client";

import { useI18n } from "@/i18n/I18nProvider";

export function Footer() {
  const { dict } = useI18n();
  return (
    <footer className="app-footer">
      <p>{dict.footer.placeholder}</p>
      <p>{dict.footer.promise}</p>
    </footer>
  );
}

"use client";

import { EmptyState } from "@/components/EmptyState";
import { useI18n } from "@/i18n/I18nProvider";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  const { dict } = useI18n();
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {dict.errors.title}
        </h1>
      </header>
      <EmptyState
        icon="alert"
        title={dict.errors.heading}
        action={
          <button className="btn btn-filled" type="button" onClick={() => retry()}>
            {dict.common.tryAgain}
          </button>
        }
      >
        {dict.errors.body}
      </EmptyState>
    </>
  );
}

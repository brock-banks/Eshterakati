"use client";

import { EmptyState } from "@/components/EmptyState";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          Something went wrong
        </h1>
      </header>
      <EmptyState
        icon="alert"
        title="We couldn’t load this page"
        action={
          <button className="btn btn-filled" type="button" onClick={() => retry()}>
            Try Again
          </button>
        }
      >
        Check your connection. If it keeps happening, the store may be briefly unavailable.
      </EmptyState>
    </>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          Page not found
        </h1>
      </header>
      <EmptyState
        icon="compass"
        title="This page doesn’t exist"
        action={
          <Link className="btn btn-filled" href="/">
            Go to Discover
          </Link>
        }
      >
        The link may be out of date, or the deal has ended.
      </EmptyState>
    </>
  );
}

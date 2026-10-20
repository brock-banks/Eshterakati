import Link from "next/link";
import { lang as rootLang } from "next/root-params";
import { EmptyState } from "@/components/EmptyState";
import { defaultLocale, getDictionary, hasLocale, localePath } from "@/i18n";

export default async function NotFound() {
  const value = await rootLang();
  const lang = value && hasLocale(value) ? value : defaultLocale;
  const d = getDictionary(lang).errors;
  return (
    <>
      <header className="page-head">
        <h1 className="large-title" tabIndex={-1}>
          {d.notFoundTitle}
        </h1>
      </header>
      <EmptyState
        icon="compass"
        title={d.notFoundHeading}
        action={
          <Link className="btn btn-filled" href={localePath(lang, "/")}>
            {d.goDiscover}
          </Link>
        }
      >
        {d.notFoundBody}
      </EmptyState>
    </>
  );
}

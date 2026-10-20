import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE } from "@/i18n/config";

/**
 * Every page lives under /ar or /en. A path without one goes to the language the shopper
 * picked before (cookie), or Arabic — the store is for Sudan, so the browser language isn't used.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (hasLocale(first)) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const lang = saved && hasLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and files with an extension (favicon.ico, images…).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};

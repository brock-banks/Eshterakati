export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

/** Sudan first: Arabic unless the shopper picked English. */
export const defaultLocale: Locale = "ar";
export const LOCALE_COOKIE = "lang";

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
export const dirOf = (lang: Locale) => (lang === "ar" ? "rtl" : "ltr");

/**
 * Locale for Intl formatting. Arabic keeps Western digits (nu-latn) so prices, account
 * numbers and codes look the same as in Sudanese banking apps.
 */
export const intlLocale = (lang: Locale) => (lang === "ar" ? "ar-SD-u-nu-latn" : "en-US");

/** "/browse" → "/ar/browse". */
export const localePath = (lang: Locale, path: string) => `/${lang}${path === "/" ? "" : path}`;

/** "/ar/browse?x" → "/browse" (no query). */
export const stripLocale = (pathname: string) => pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";

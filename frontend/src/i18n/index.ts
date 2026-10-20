import { ar } from "./dictionaries/ar";
import { en, type Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";

export type { Dictionary } from "./dictionaries/en";
export * from "./config";
export { plural, t, type Plural } from "./translate";

const dictionaries: Record<Locale, Dictionary> = { ar, en };

/** Server-side lookup; client components read the same object from <I18nProvider>. */
export const getDictionary = (lang: Locale): Dictionary => dictionaries[lang];

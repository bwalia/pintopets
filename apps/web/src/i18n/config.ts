/** Supported locales. English (UK) first; add more here and in /messages. */
export const LOCALES = ["en-GB"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en-GB";
export const DEFAULT_TIME_ZONE = "Europe/London";

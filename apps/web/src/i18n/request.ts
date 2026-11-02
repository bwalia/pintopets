import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from "./config";

/**
 * Single-locale setup for now (no locale in the URL). When we add languages,
 * read the user's preference from a cookie or their profile here.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    timeZone: DEFAULT_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "uk" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (
      await (locale === "uk"
        ? import("../messages/uk.json")
        : import("../messages/en.json"))
    ).default as Record<string, unknown>,
  };
});

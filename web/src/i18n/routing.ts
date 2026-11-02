import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  // Language lives only in the URL: no cookie, no Accept-Language guess ("/" always goes to "/en").
  localeCookie: false,
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

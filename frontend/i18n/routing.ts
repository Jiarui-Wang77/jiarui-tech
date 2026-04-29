import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  pathnames: {
    "/": "/",
    "/news/[category]": "/news/[category]",
    "/news/article/[uid]": "/news/article/[uid]",
    "/auth/login": "/auth/login",
    "/auth/register": "/auth/register",
  },
});

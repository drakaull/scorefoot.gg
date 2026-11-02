import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Every page except api routes, images, Next internals and files with a dot (favicon.ico…).
  matcher: "/((?!api|media|_next|_vercel|.*\\..*).*)",
};

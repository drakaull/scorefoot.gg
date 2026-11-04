import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/**
 * Strict policy: only our own origin, scripts allowed by a per-request nonce (Next.js puts it on its own scripts).
 * React needs eval for its error overlay in development only.
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // next/image writes a style attribute on each image; a nonce cannot cover attributes (<style> stays nonce-only).
    "style-src-attr 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Locale routing (next-intl), then the Content-Security-Policy with a fresh nonce on every page. */
export default function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy(btoa(crypto.randomUUID()));
  const response = handleI18nRouting(request);

  // Redirects (e.g. "/" → "/en") render nothing: just add the header.
  if (response.headers.has("location")) {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  // Next.js reads the policy from the request to find the nonce, so the page request must carry it too.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const rewrite = response.headers.get("x-middleware-rewrite");
  const forwarded = rewrite
    ? NextResponse.rewrite(new URL(rewrite), { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  // Keep the headers next-intl set (e.g. alternate links), not its internal routing ones.
  response.headers.forEach((value, key) => {
    if (!key.startsWith("x-middleware-")) forwarded.headers.set(key, value);
  });
  forwarded.headers.set("Content-Security-Policy", csp);
  return forwarded;
}

export const config = {
  // Every page except api routes, images, Next internals and files with a dot (favicon.ico…).
  matcher: "/((?!api|media|_next|_vercel|.*\\..*).*)",
};

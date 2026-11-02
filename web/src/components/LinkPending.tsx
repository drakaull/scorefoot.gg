"use client";

import { useLinkStatus } from "next/link";

/**
 * Put inside a Link: while its page loads, it marks the link with `data-link-pending`.
 * CSS in globals.css then shows the click at once (no loading.tsx, so 404s and redirects keep their status codes).
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span data-link-pending hidden /> : null;
}

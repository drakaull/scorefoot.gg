import { notFound } from "next/navigation";

// Any unknown URL under /en or /fr shows the localized 404 page.
export default function CatchAll() {
  notFound();
}

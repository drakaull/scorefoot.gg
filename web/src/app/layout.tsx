import type { ReactNode } from "react";
import { jakarta } from "./fonts";
import "./globals.css";

// Replaced by the localized layout in app/[locale] (T7).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
